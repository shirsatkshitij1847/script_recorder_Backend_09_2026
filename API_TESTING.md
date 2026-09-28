# API Testing Guide

## Environment Variables

The API loads values from `.env` through `dotenv`. The following four variables are required by the S3 client:

| Variable | Required | Used for |
| --- | --- | --- |
| `AWS_REGION` | Yes | AWS region for the S3 client |
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials |
| `BUCKET_NAME` | Yes | S3 bucket used for test results |
| `PORT` | No | API server port; defaults to `7000` |

The trace viewer is a separate process. Its settings are optional:

| Variable | Default | Used for |
| --- | --- | --- |
| `TRACE_VIEWER_PORT` | `7001` | Trace viewer server port |
| `PLAYWRIGHT_PORT` | `9323` | First port checked for a Playwright trace session; increments if occupied |
| `SESSION_TIMEOUT` | `180000` | Session lifetime in milliseconds (3 minutes) |
| `HOST` | `127.0.0.1` | Host shown in the trace viewer startup log; it does not configure the listener binding |

Example `.env` keys (provide the actual values for your environment):

```dotenv
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
BUCKET_NAME=
PORT=7000
```

## Start the Servers

Run these from the project directory in separate terminals:

```bash
node server.js
node traceViwerServer.js
```

The API base URL defaults to `http://localhost:7000`. The trace viewer defaults to `http://localhost:7001`.

## API Routes

Requests do not require authentication in this application. All routes below are handled by `server.js`.

### `GET /`

Returns plain text:

```text
Hello, World!
```

### `GET /api/health`

Returns the API health status:

```json
{ "status": "ok" }
```

### `GET /api/users`

Lists the user folders in the configured S3 bucket.

```json
{ "users": ["shirsat1847"] }
```

### `POST /api/users/:user`

Creates a user folder. No request body is required. If it already exists, the response has `created: false`.

```json
{
  "user": "shirsat1847",
  "key": "shirsat1847/",
  "created": true,
  "result": {}
}
```

`result` contains the S3 `PutObject` response when a folder is created; it is omitted when the folder already exists.

### `GET /api/users/:user/versions`

Lists version folders for an existing user. A user with no versions gets an empty list.

```json
{
  "user": "shirsat1847",
  "count": 2,
  "versions": ["2607", "2704"]
}
```

Returns `404` with `{ "error": "No user found" }` if the user folder does not exist.

### `POST /api/users/:user/:version`

Creates a version folder for an existing user. No request body is required. Returns `404` with `{ "error": "No user found" }` if the user folder does not exist. If the version already exists, the response has `created: false`.

```json
{
  "user": "shirsat1847",
  "version": "2607",
  "key": "shirsat1847/2607/",
  "created": true,
  "result": {}
}
```

### `GET /api/results/:version`

Returns objects under the requested version for every user. Each file includes its S3 key, tags, and content. JSON objects are parsed; non-JSON content is returned as text.

```json
{
  "users": [
    {
      "user": "shirsat1847",
      "version": "2607",
      "files": [
        {
          "key": "shirsat1847/2607/result.json",
          "tags": { "TransactionType": "MoveTransaction" },
          "content": {}
        }
      ]
    }
  ]
}
```

### `GET /api/users/:user/:version/files`

Lists file names under a user's version without fetching their contents.

```json
{
  "user": "shirsat1847",
  "version": "2607",
  "files": ["result.json", "result.html"]
}
```

### `GET /api/users/:user/:version/:fileName`

Returns the named object as an HTML response. For example: `/api/users/shirsat1847/2607/result.html`. Handler errors are returned as `404` JSON:

```json
{ "error": "File \"result.html\" not found" }
```

## Trace Viewer Routes

These routes are handled by the separate `traceViwerServer.js` process, whose default base URL is `http://localhost:7001`.

### `GET /`

Returns a welcome message as plain text.

### `GET /sessions`

Lists active trace sessions, including their IDs, trace names, ports, and creation times.

### `GET /trace/:traceName`

Starts a Playwright trace viewer session for the supplied trace name, or reuses the existing session for that trace. The JSON response includes `sessionId`, `port`, `url`, and a `message`. Open the returned `url` to view the trace.

### `/viewer/:sessionId/`

Proxies requests to the Playwright viewer for that session. Returns `404` with `Session not found` when the session ID is not active. Sessions are terminated after `SESSION_TIMEOUT` milliseconds.

## Example Requests

```bash
curl http://localhost:7000/api/health
curl http://localhost:7000/api/users
curl -X POST http://localhost:7000/api/users/shirsat1847
curl -X POST http://localhost:7000/api/users/shirsat1847/2607
curl http://localhost:7000/api/users/shirsat1847/versions
curl http://localhost:7000/api/results/2607
curl http://localhost:7000/api/users/shirsat1847/2607/files
curl http://localhost:7000/api/users/shirsat1847/2607/result.html
curl http://localhost:7001/sessions
```

The API returns JSON for its data routes. Unexpected S3 errors are returned as `500` on most API routes; the file-content route currently maps handler errors to `404`.