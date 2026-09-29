import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { createProxyMiddleware } from "http-proxy-middleware";

const PLAYWRIGHT_PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT, 10) || 9323;
const SESSION_TIMEOUT = Number.parseInt(process.env.SESSION_TIMEOUT, 10) || 6 * 60 * 1000;

async function findAvailablePort(startPort) {
    for (let port = startPort; port < 65536; port += 1) {
        const available = await new Promise((resolve) => {
            const probe = createServer();
            probe.once("error", () => resolve(false));
            probe.listen(port, "127.0.0.1", () => {
                probe.close(() => resolve(true));
            });
        });

        if (available) return port;
    }

    throw new Error("No available port for the Playwright trace viewer");
}

async function waitForViewer(port, playwright) {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
        if (playwright.exitCode !== null || playwright.signalCode !== null) {
            throw new Error("Playwright trace viewer exited before becoming available");
        }

        try {
            await fetch(`http://127.0.0.1:${port}`);
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    throw new Error("Timed out waiting for the Playwright trace viewer to start");
}

export function registerTraceViewerRoutes(app, downloadTrace) {
    const sessions = new Map();
    const traceSessionIndex = new Map();
    let nextPlaywrightPort = PLAYWRIGHT_PORT;

    function closeSession(sessionId, terminateProcess = true) {
        const session = sessions.get(sessionId);
        if (!session) return;

        sessions.delete(sessionId);
        traceSessionIndex.delete(session.traceKey);
        clearTimeout(session.timeout);

        if (terminateProcess && session.process.exitCode === null) {
            session.process.kill();
        }

    }

    app.get("/api/users/:user/:version/:testExecutionId/trace/viewer", async (req, res) => {
        const { user, version, testExecutionId } = req.params;
        const traceKey = `${user}/${version}/${testExecutionId}`;
        const existingSessionId = traceSessionIndex.get(traceKey);

        if (existingSessionId && sessions.has(existingSessionId)) {
            const existingSession = sessions.get(existingSessionId);
            return res.json({
                sessionId: existingSessionId,
                url: `${req.protocol}://${req.get("host")}/viewer/${existingSessionId}/`,
                port: existingSession.port,
                reused: true,
            });
        }

        let tracePath;

        try {
            tracePath = await downloadTrace(version, user, testExecutionId);

            const port = await findAvailablePort(nextPlaywrightPort);
            nextPlaywrightPort = port + 1;
            const sessionId = randomUUID();
            const args = [
                "playwright",
                "show-trace",
                tracePath,
                "--host",
                "127.0.0.1",
                "--port",
                String(port),
            ];
            const playwright = process.platform === "win32"
                ? spawn("cmd.exe", ["/d", "/s", "/c", "npx", ...args], {
                    stdio: "ignore",
                    windowsHide: true,
                })
                : spawn("npx", args, { stdio: "ignore" });

            await new Promise((resolve, reject) => {
                playwright.once("spawn", resolve);
                playwright.once("error", reject);
            });

            const session = {
                traceKey,
                tracePath,
                port,
                process: playwright,
                createdAt: new Date(),
            };
            sessions.set(sessionId, session);
            traceSessionIndex.set(traceKey, sessionId);
            session.timeout = setTimeout(() => closeSession(sessionId), SESSION_TIMEOUT);
            session.timeout.unref();

            playwright.once("error", () => closeSession(sessionId, false));
            playwright.once("exit", () => closeSession(sessionId, false));

            await waitForViewer(port, playwright);
            return res.json({
                sessionId,
                url: `${req.protocol}://${req.get("host")}/viewer/${sessionId}/`,
                port,
                reused: false,
            });
        } catch (error) {
            const statusCode = error.$metadata?.httpStatusCode === 404 ? 404 : 500;
            return res.status(statusCode).json({ error: error.message });
        }
    });

    app.get(["/api/trace/sessions", "/sessions"], (req, res) => {
        const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
            sessionId,
            traceName: session.traceKey,
            port: session.port,
            createdAt: session.createdAt,
        }));

        res.json({ totalSessions: activeSessions.length, sessions: activeSessions });
    });

    app.use("/viewer/:sessionId", (req, res, next) => {
        const session = sessions.get(req.params.sessionId);
        if (!session) return res.status(404).send("Session not found");

        return createProxyMiddleware({
            target: `http://127.0.0.1:${session.port}`,
            changeOrigin: true,
        })(req, res, next);
    });
}


