import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function getVersions(userName) {
  if (!userName) {
    const validationError = new Error("User name is required");
    validationError.statusCode = 400;
    throw validationError;
  }

  const prefix = `${userName}/`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: prefix }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) {
      const notFoundError = new Error("No user found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    throw error;
  }

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: "/",
    })
  );

  const versions = (result.CommonPrefixes || []).map((item) =>
    item.Prefix.replace(prefix, "").replace(/\/$/, "")
  );

  return { user: userName, count: versions.length, versions };
}

// if (import.meta.url === `file://${process.argv[1]}`) {
//   getVersions(process.argv[2])
//     .then((result) => console.log(JSON.stringify(result, null, 2)))
//     .catch((error) => console.error(error.message));
// }