import { GetObjectCommand } from "@aws-sdk/client-s3";

import { s3, bucketName, streamToString } from "./s3Client.js";

export async function getHtmlFile(userName, version, testExecutionId) {
  const fileName = `${testExecutionId}.html`;
  const key = `${userName}/${version}/${testExecutionId}/${fileName}`;
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  return streamToString(result.Body);
}
