import { GetObjectTaggingCommand } from "@aws-sdk/client-s3";

import { s3, bucketName } from "./s3Client.js";

export async function getObjectTags(
	userName,
	version,
	testExecutionId,
	fileName
) {
	const key = `${userName}/${version}/${testExecutionId}/${fileName}`;

	const result = await s3.send(
		new GetObjectTaggingCommand({
			Bucket: bucketName,
			Key: key,
		})
	);

	return result.TagSet;
}


// const tags = await getObjectTags(
// 	"vishaljadhav",
// 	"2607",
// 	"testexecution1911846768cb4b",
// 	"testexecution1911846768cb4b.html"
// );

// console.log(tags);
