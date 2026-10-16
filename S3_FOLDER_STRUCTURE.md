# S3 Folder Structure

The API stores test results in the S3 bucket configured by `BUCKET_NAME`. S3 stores objects under keys; the `/` characters in those keys make the key prefixes appear as folders in the AWS console.

## Expected hierarchy

```text
<BUCKET_NAME>/
└── <user>/
    └── <version>/
        └── <testExecutionId>/
            ├── <testExecutionId>.html
            └── <testExecutionId>.zip
```

Example:

```text
<BUCKET_NAME>/
└── kshitijshirsat1847/
    └── 2704/
        └── testexecution3dd1e1f5959249/
            ├── testexecution3dd1e1f5959249.html
            └── testexecution3dd1e1f5959249.zip
```

The levels represent:

1. **User** — top-level grouping for a user.
2. **Version** — results associated with a version.
3. **Test execution ID** — files belonging to one test run.
4. **Result files** — the HTML report and Playwright trace ZIP.

## S3 folder markers

S3 does not have real directories. Creating a user or version through the API writes an empty marker object with a key ending in `/`, for example:

```text
kshitijshirsat1847/
kshitijshirsat1847/2704/
```

These marker objects help the API and S3 console display the prefixes as folders. Objects can also exist under a prefix without a marker object.

## Object keys used by the API

| Data | S3 key |
| --- | --- |
| User marker | `<user>/` |
| Version marker | `<user>/<version>/` |
| HTML result | `<user>/<version>/<testExecutionId>/<testExecutionId>.html` |
| Trace ZIP | `<user>/<version>/<testExecutionId>/<testExecutionId>.zip` |

The HTML endpoint and trace download/viewer endpoints expect the execution files at these keys.

## Upload helper note

The standalone `uploadResults.js` helper currently uploads a file to:

```text
<user>/<version>/<fileName>
```

That differs from the per-execution key structure above. For the HTML and trace endpoints to find uploaded files, they must be stored under the execution-ID prefix with the expected filenames.

## Trace downloads

When a trace is requested, the API downloads the ZIP from S3 and writes a local copy in the project's `traces/` directory for download or viewing. This local copy is not the primary S3 storage location.
