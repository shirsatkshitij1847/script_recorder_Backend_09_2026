import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function createVersion(userName, version) {
  if (!userName) {
    const validationError = new Error("User name is required");
    validationError.statusCode = 400;
    throw validationError;
  }

  if (!version) {
    const validationError = new Error("Version is required");
    validationError.statusCode = 400;
    throw validationError;
  }

  const userKey = `${userName}/`;
  const versionKey = `${userName}/${version}/`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: userKey }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) {
      const notFoundError = new Error("No user found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    throw error;
  }

  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: versionKey }));
    return { user: userName, version, key: versionKey, created: false, message: "Version already exists" };
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) {
      throw error;
    }
  }

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: versionKey,
      Body: Buffer.from(""),
    })
  );

  return { user: userName, version, key: versionKey, created: true, result };
}

// createVersion("kshitijshirsat1847", "2607").then(console.log).catch(console.error);