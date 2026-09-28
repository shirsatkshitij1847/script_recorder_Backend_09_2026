import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { s3, bucketName } from "./s3Client.js";

export async function versionFolderExists(userName, version) {
  const versionKey = `${userName}/${version}/`;

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: versionKey,
      })
    );

    return true;
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) {
      return false;
    }

    throw error;
  }
}

export async function createVersionFolder(userName, version) {
  const versionKey = `${userName}/${version}/`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: versionKey,
      Body: Buffer.from(""),
    })
  );

  console.log(`Version folder "${versionKey}" created`);
}

export async function uploadFile(
  userName,
  filePath,
  version,
  transactionType
) {
  // Create version folder if it doesn't exist
  if (!(await versionFolderExists(userName, version))) {
    await createVersionFolder(userName, version);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const key = `${userName}/${version}/${fileName}`;

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,

      // S3 object tags
      Tagging: `TransactionType=${encodeURIComponent(transactionType)}`,
    })
  );

  console.log("File uploaded successfully!");
  console.log("Key:", key);
  console.log("Transaction Type:", transactionType);

  return result;
}



// uploding result to s3

uploadFile(
  process.env.USER_NAME,
  "./result.html",
  "2607",
  "MoveTransaction"
);
