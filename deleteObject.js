import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function deleteObject(key) {
  return s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

// Run directly: node deleteObject.js
const keys = process.argv.slice(2);
for (const key of keys) {
  await deleteObject(key);
  console.log(`Deleted "${key}"`);
}
