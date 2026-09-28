import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, bucketName } from "./s3Client.js";

export async function getUsers() {
  const result = await s3.send(
    new ListObjectsV2Command({ Bucket: bucketName, Delimiter: "/" })
  );

  const users = (result.CommonPrefixes || []).map((prefix) =>
    prefix.Prefix.replace(/\/$/, "")
  );

  return users;
}

// Run directly: node getUsers.js
// if (import.meta.url === `file://${process.argv[1]}`) {
//   getUsers()
//     .then((users) => console.log(JSON.stringify({ users }, null, 2)))
//     .catch((error) => console.error("Error getting folders:", error));
// }
