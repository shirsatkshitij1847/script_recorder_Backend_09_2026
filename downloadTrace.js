import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { s3, bucketName } from "./s3Client.js";

const TRACE_DIRECTORY = path.join(path.dirname(fileURLToPath(import.meta.url)), "traces");

export async function downloadTrace(version, username, testExecutionId) {
	const key = `${username}/${version}/${testExecutionId}/${testExecutionId}.zip`;
	const response = await s3.send(
		new GetObjectCommand({
			Bucket: bucketName,
			Key: key,
		})
	);
	await mkdir(TRACE_DIRECTORY, { recursive: true });

	const safeExecutionId = testExecutionId.replace(/[^a-zA-Z0-9._-]/g, "_");
	const tracePath = path.join(
		TRACE_DIRECTORY,
		`${safeExecutionId}-${randomUUID()}.zip`
	);
	await pipeline(response.Body, createWriteStream(tracePath));

	return tracePath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const testExecutionId = "testexecution05aadd03bf1143";
	const tracePath = await downloadTrace(
		"2704",
		"kshitijshirsat1847",
		testExecutionId
	);
	console.log(`Downloaded trace to ${tracePath}`);
}
