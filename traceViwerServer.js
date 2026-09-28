import dotenv from "dotenv";
import express from "express";
import { spawn, exec } from "node:child_process";
import * as crypto from "node:crypto";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

// Read configuration from environment variables
const PORT = parseInt(process.env.TRACE_VIEWER_PORT) || 7001;
const PLAYWRIGHT_PORT = parseInt(process.env.PLAYWRIGHT_PORT) || 9323;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 3 * 60 * 1000; // 3 minutes default
const HOST = process.env.HOST || "127.0.0.1";

let PlaywrightPort = PLAYWRIGHT_PORT;

// sessionId → session information
const sessions = new Map();

// traceName → sessionId (fast lookup index)
const traceNameIndex = new Map();

function checkPortAvailability(port) {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error) => {
            if (error) {
                console.log(`${port} is available`);
                resolve(true);
            } else {
                console.log(`${port} is in use`);
                resolve(false);
            }
        });
    });
}

// Kill session and cleanup
function killSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
        try {
            session.process.kill();
            console.log(`Session ${sessionId} killed`);
        } catch (err) {
            console.error(`Error killing session ${sessionId}:`, err);
        }
        // Remove from both maps
        sessions.delete(sessionId);
        traceNameIndex.delete(session.traceName);
    }
}

// Create playwright viewer
function createSession(traceName, port) {
    const sessionId = crypto.randomUUID();

    const playwright = spawn("cmd.exe", [
        "/c",
        "npx",
        "playwright",
        "show-trace",
        traceName,
        "--host",
        "127.0.0.1",
        "--port",
        port.toString()
    ]);

    const sessionData = {
        sessionId,
        traceName,
        port,
        process: playwright,
        createdAt: new Date()
    };

    sessions.set(sessionId, sessionData);
    traceNameIndex.set(traceName, sessionId); // Add to index for fast lookup

    // Auto-kill session after 3 minutes
    setTimeout(() => {
        killSession(sessionId);
    }, SESSION_TIMEOUT);

    return sessionId;
}

async function createPlaywrightSession(traceName) {
    let port = PlaywrightPort;
    let isAvailable = false;
    
    while (!isAvailable) {
        isAvailable = await checkPortAvailability(port);
        if (!isAvailable) {
            port++;
        }
    }
    
    console.log(`Available port found: ${port}`);

    const sessionId = createSession(traceName, port);
    return { sessionId, port };
}



const app = express();

app.get('/', (req, res) => {
    res.send('Welcome to the Playwright session manager!');
});


app.get('/sessions', (req, res) => {
    const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
        sessionId,
        traceName: session.traceName,
        port: session.port,
        createdAt: session.createdAt
    }));
    
    res.send({
        totalSessions: sessions.size,
        sessions: activeSessions
    });
});

// Get trace - creates ONE session per trace
app.get('/trace/:traceName', async (req, res) => {
    const traceName = req.params.traceName;

    // Fast lookup using index - O(1) instead of O(n)
    const existingSessionId = traceNameIndex.get(traceName);

    if (existingSessionId) {
        const existingSession = sessions.get(existingSessionId);
        console.log(`Reusing existing session for trace ${traceName}`);
        return res.send({
            sessionId: existingSessionId,
            port: existingSession.port,
            url: `http://localhost:${PORT}/viewer/${existingSessionId}/`,
            message: "Existing session reused"
        });
    }

    // Create new session
    const { sessionId, port } = await createPlaywrightSession(traceName);

    res.send({
        sessionId,
        port,
        url: `http://localhost:${PORT}/viewer/${sessionId}/`,
        message: "New session created"
    });
});




app.use('/viewer/:sessionId', (req, res, next) => {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).send("Session not found");
    }

    console.log("Proxying to port:", session.port);

    const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${session.port}`,
            changeOrigin: true
    });

    proxy(req, res, next);
});
app.listen(PORT, () => {
    console.log(`Express running on http://${HOST}:${PORT}`);
});


