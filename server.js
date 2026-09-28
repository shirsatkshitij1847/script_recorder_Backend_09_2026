import express from "express";
import dotenv from "dotenv";
import { createUser } from "./createUser.js";
import { createVersion } from "./createVersion.js";
import { getUsers } from "./getUsers.js";
import { getAllResults, listVersionFolders } from "./getAllResults.js";
import { getHtmlFile } from "./getResultByFileName.js";
import { getVersions } from "./getVersions.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// GET /api/users - list all user folders
app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/:user - create a user folder in the bucket
app.post("/api/users/:user", async (req, res) => {
  try {
    const { user } = req.params;
    const result = await createUser(user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// GET /api/users/:user/versions - list version folders under a user
app.get("/api/users/:user/versions", async (req, res) => {
  try {
    const { user } = req.params;
    const result = await getVersions(user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// POST /api/users/:user/:version - create a version folder for a user
app.post("/api/users/:user/:version", async (req, res) => {
  try {
    const { user, version } = req.params;
    const result = await createVersion(user, version);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// GET /api/results/:version - get result.json contents across all users for a version
app.get("/api/results/:version", async (req, res) => {
  try {
    const { version } = req.params;
    const users = await getAllResults(version);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List immediate folder names under a user's version without fetching contents.
app.get(["/api/users/:user/:version/folders", "/api/users/:user/:version/files"], async (req, res) => {
  try {
    const { user, version } = req.params;
    const result = await listVersionFolders(user, version);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:user/:version/:testExecutionId/:fileName - get an execution result file
app.get("/api/users/:user/:version/:testExecutionId/:fileName", async (req, res) => {
  try {
    const { user, version, testExecutionId, fileName } = req.params;
    const html = await getHtmlFile(user, version, testExecutionId, fileName);
    res.type("html").send(html);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
