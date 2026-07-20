# Lumi image function

This Alibaba Cloud Function Compute handler supports two operations behind one HTTPS endpoint:

- `transfer`: move a provider URL to OSS (the existing URL-result path).
- `generate`: call a synchronous Base64 provider from FC, write the decoded image directly to OSS, and notify the API with object keys.

The API chooses the path from each generation provider's `resultMode`:

- `url`: the API server calls the provider and handles the returned URL.
- `base64`: FC calls the provider and uploads the result without sending image bytes through the API server.
- `auto`: URL for asynchronous URL protocols and URL response formats; Base64 for synchronous image providers.

Required FC variables:

- `OSS_REGION`, `OSS_BUCKET`
- `TRANSFER_CALLBACK_TOKEN`
- `API_CALLBACK_URL` for URL transfer callbacks
- `GENERATION_CALLBACK_URL` for Base64 execution callbacks (recommended)

The FC execution role needs OSS write permission for `uploads/system/generate/*`. The function request is authenticated with the bearer token and an HMAC signature. Provider keys are supplied only in the signed HTTPS request body and are never logged.
