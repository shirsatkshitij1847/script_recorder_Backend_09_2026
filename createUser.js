import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function createUser(userName) {
  if (!userName) {
    const validationError = new Error("User name is required");
    validationError.statusCode = 400;
    throw validationError;
  }

  const userKey = `${userName}/`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: userKey }));
    return { user: userName, key: userKey, created: false, message: "User already exists" };
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) {
      throw error;
    }
  }

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: userKey,
      Body: Buffer.from(""),
    })
  );

  return { user: userName, key: userKey, created: true, result };
}

// createUser("vishaljadhav").then(console.log).catch(console.error);
