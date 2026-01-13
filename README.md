# CRUD-Phishing Worker

Cloudflare Worker that orchestrates phishing campaign submission and distribution on top of a backend phishing simulator API.

## Overview
- **/submit**: Creates an email template, landing page, and scenario based on `phishingData`. The handler prefers `companyId` from the payload, falls back to `phishingData.companyId`, and finally extracts it from the JWT.
- **/send**: Sends a scenario to a target user (or existing group). It prefers `companyId` from the payload, otherwise reads it from the token, and uses that `companyId` for target-group search/creation, delivery‑setting lookup, and the final campaign POST.
- Services in `src/services/` contain the detailed API calls; helper modules under `src/utils/` manage JWT parsing and shared constants.

## Required Payload Fields
```json
{
  "accessToken": "JWT token",
  "url": "API base URL",
  "phishingData": { ... } // for /submit
  "scenarioResourceId": "..." // for /send
}
```

Additional optional fields:
- `companyId`: overrides the company ID instead of extracting it from the token.
- `targetGroupResourceId`: reuse an existing group when available.
- `trainingId`, `trainingLanguageIds`, `sendTrainingLanguageId`, `isQuishing`, etc. (see `src/index.js` for full list).

## Running Locally
1. Install dependencies (if any are required for other scripts) with `npm install`.
2. Use `wrangler dev` (or `wrangler publish`) pointing at this worker to expose the `/submit` and `/send` endpoints.

## Logs and Debugging
- The worker logs key steps for both submit and send flows, including the resolved company ID source, target-group decisions, and API payloads.
- Use `wrangler tail` or the Cloudflare dashboard to inspect logs if requests fail.

## Testing
- There are no automated tests in this repo. Use API clients (e.g., curl/postman) against the worker to validate via `/submit` and `/send`.
