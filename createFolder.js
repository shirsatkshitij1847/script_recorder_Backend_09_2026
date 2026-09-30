import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function ensureUserFolder(userName) {
  const userKey = `${userName}/`;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: userKey }));
    console.log(`User folder "${userKey}" already exists`);
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
    await s3.send(
      new PutObjectCommand({ Bucket: bucketName, Key: userKey, Body: Buffer.from("") })
    );
    console.log(`User folder "${userKey}" created`);
  }
}

export async function createFolder(userName, folderName) {
  const key = `${userName}/${folderName}/`;
  await ensureUserFolder(userName);

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(""),
    })
  );

  console.log(`Folder "${key}" created successfully`);
  return result;
}

// // Run directly: node createFolder,js
// createFolder(process.env.USER_NAME, "2607")

