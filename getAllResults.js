import {
  ListObjectsV2Command,
  GetObjectCommand,
  GetObjectTaggingCommand,
} from "@aws-sdk/client-s3";
import { pathToFileURL } from "url";

import { s3, bucketName, streamToString } from "./s3Client.js";
import { getUsers } from "./getUsers.js";

async function getFilesUnderPrefix(prefix) {
  // Get files
  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    })
  );

  const files = (listResult.Contents || []).filter((file) => file.Key !== prefix);

  const contents = [];

  for (const file of files) {
    // Get file content
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: file.Key,
      })
    );

    const body = await streamToString(object.Body);

    // Get S3 tags
    const tagResult = await s3.send(
      new GetObjectTaggingCommand({
        Bucket: bucketName,
        Key: file.Key,
      })
    );

    // Convert tags to object
    const tags = {};

    for (const tag of tagResult.TagSet || []) {
      tags[tag.Key] = tag.Value;
    }

    // Parse JSON files, keep other file types (e.g. .html) as raw text
    let content;
    try {
      content = JSON.parse(body);
    } catch {
      content = body;
    }

    contents.push({
      key: file.Key,
      tags,
      content,
    });
  }

  return contents;
}

// List all result file names present under a user/version (no content fetch)
export async function listResultFiles(userName, version) {
  const prefix = `${userName}/${version}/`;

  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    })
  );

  const files = (listResult.Contents || [])
    .filter((file) => file.Key !== prefix)
    .map((file) => file.Key.split("/").pop());

  return { user: userName, version, files };
}

// Get all result files under a specific user/version
export async function getUserVersionResults(userName, version) {
  const files = await getFilesUnderPrefix(`${userName}/${version}/`);
  return { user: userName, version, files };
}

export async function getAllResults(version) {
  const users = await getUsers();
  const output = [];

  for (const user of users) {
    const files = await getFilesUnderPrefix(`${user}/${version}/`);
    output.push({ user, version, files });
  }

  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Run directly: node getAllResults.js
  const res = await getAllResults("2607");
  console.dir(res, { depth: null });
}
