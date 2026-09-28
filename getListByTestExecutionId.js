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

export async function getAllResults(version) {
  const users = await getUsers();
  const output = [];

  for (const user of users) {
    const files = await getFilesUnderPrefix(`${user}/${version}/`);
    output.push({ user, version, files });
  }

  return output;
}

export async function getFoldersUnderVersion(userName, version) {
  const prefix = `${userName}/${version}/`;
  const folders = [];
  let continuationToken;

  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      })
    );

    for (const folder of result.CommonPrefixes || []) {
      folders.push(folder.Prefix.replace(prefix, "").replace(/\/$/, ""));
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return folders;
}
const res = await getFoldersUnderVersion("kshitijshirsat1847", "2704");
console.log(res);