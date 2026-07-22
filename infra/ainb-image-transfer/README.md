# Lumi image function

This Alibaba Cloud Function Compute handler is the image transport boundary for Lumi-Draw. It supports two operations behind one authenticated HTTPS endpoint:

- `transfer`: legacy compatibility for URL tasks that were already transferring during the upgrade.
- `generate`: call a Base64-only provider from FC, decode the image in memory, write it directly to OSS, and report only object metadata to the API.

## Routing policy

Each API provider has independent result modes for text-to-image and image-to-image:

- `url`: the business API calls the provider and transfers the returned URL to OSS itself. FC is not used for new URL-result tasks.
- `base64`: FC calls the provider and uploads decoded bytes directly to OSS. The business API only sends configuration and receives progress, errors, and OSS object keys.
- `auto`: asynchronous providers and `response_format=url` use URL mode; synchronous OpenAI-compatible image providers default to Base64 mode.

The selected mode and provider configuration are snapshotted on every generation job, so later administrator edits do not change an in-flight task.

## Provider support

The `generate` operation supports:

- OpenAI-compatible JSON image generation.
- OpenAI-compatible multipart image edits.
- Gemini/Banana `inlineData` Base64 responses.
- Synchronous responses and asynchronous submit/query protocols.
- Administrator-defined task ID, status, progress, URL, Base64, and failure field paths.
- A configurable `image_field` request parameter for multipart providers that use names such as `image[]`.

Provider endpoints, keys, models, parameters, polling rules, and result paths are supplied in the signed request. They are not compiled into the FC package.

## Required FC configuration

Environment variables:

- `OSS_REGION`
- `OSS_BUCKET`
- `TRANSFER_CALLBACK_TOKEN`
- `API_CALLBACK_URL`, used only to finish legacy URL transfers that were already in flight during deployment
- `GENERATION_CALLBACK_URL`, used by Base64 generation and progress callbacks

Runtime requirements:

- Node.js 20
- 1 GB memory or more
- 30-minute timeout for slow 4K providers
- Internet access enabled
- An FC execution role with write access limited to `uploads/system/generate/*`

Build the ZIP with directory entries intact. On Windows, use `tar.exe -a -cf package.zip index.mjs package.json package-lock.json node_modules`; `Compress-Archive` can omit explicit directory entries and cause FC to deploy without resolving `node_modules`.

The business API and FC share `TRANSFER_CALLBACK_TOKEN`. Requests from the API include both a Bearer token and a timestamped HMAC signature. Provider keys are encrypted in the business database, decrypted only when dispatching a task, sent only to the authenticated FC endpoint, and never logged.

## Diagnostic logs

The handler writes one-line JSON events to the FC invocation log. Filter by `jobId` to reconstruct a task without exposing its API key, prompt, or image payload. Important events are:

- `provider.request.start` and `provider.response.headers`: provider connection and time to first response headers.
- `response.body.start`, `response.body.complete`, and `response.body.failed`: Base64/JSON body transfer, expected and actual bytes, elapsed time, and the underlying network error.
- `generation.outputs.ready`: result count and whether each result arrived as URL or Base64.
- `oss.upload.start` and `oss.upload.complete`: OSS payload size and upload duration.
- `callback.complete` and `callback.failed`: delivery of the final result to the business API.
- `invocation.failed`: final phase-aware error, including available socket byte counters and `UND_ERR_*` codes.

Use Alibaba Cloud Function Compute logs and search for the generation job ID shown by the business API log. A successful task ends with `generation.complete`; a failed task ends with `invocation.failed`.

## Deployment order

1. Deploy this FC package and verify its environment variables.
2. Deploy the business API and run Prisma migrations.
3. Configure text and image result modes in API platform management.
4. Verify one URL task and one Base64 task before enabling the provider for users.

Deploying FC first is required because the new business API sends `operation: "generate"`, which older function packages do not understand.
