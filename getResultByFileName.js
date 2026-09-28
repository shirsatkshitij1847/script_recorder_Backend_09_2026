import {
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { s3, bucketName, streamToString } from "./s3Client.js";

export async function getHtmlFile(userName, version, fileName) {
  const prefix = `${userName}/${version}/`;

  // Find the file
  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    })
  );

  const files = listResult.Contents || [];
  const file = files.find(
    (item) => item.Key.split("/").pop() === fileName
  );

  if (!file) {
    throw new Error(`File "${fileName}" not found`);
  }

  // Read HTML from S3
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: file.Key,
    })
  );

  // Return HTML exactly as stored
  const html = await streamToString(result.Body);

  return html;
}


// const html = await getHtmlFile(
//   "shirsat1847",
//   "2607",
//   "result.html"
// );

// fs.writeFileSync("./result2.html", html);

// console.log(html);
