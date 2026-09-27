# Huemint collector research

This branch is the isolation boundary for Huemint data-collection and local-mimic research. Nothing here is part of the stable application until it is independently reviewed, tested, previewed, and deliberately merged.

## Initial objective

Build a reproducible collector for user-approved research runs that records generated Gradient-10 palettes and their generation context without changing the stable Palette Playground renderer or its storage.

Candidate record shape:

```json
{
  "colors": ["#000000"],
  "generator": "transformer",
  "creativity": 1.3,
  "preset": "default",
  "adjacency": [],
  "score": null,
  "capturedAt": "ISO-8601 timestamp",
  "source": "huemint-gradient-10"
}
```

## Guardrails

- Do not add a Huemint live request path to the stable app.
- Do not modify the Electron identity or any IndexedDB schema.
- Do not read, write, migrate, or clean the user's Image Library or Deleted Images.
- Respect Huemint's terms and API limitations; document provenance and intended non-commercial research use.
- Deduplicate collected palettes without deleting source records automatically.
- Store research output separately from application/user data.
- Use small dry runs before any larger collection job.
- Do not merge collector code into `main` merely because collection succeeds.

## Proposed milestones

1. Confirm the permitted collection mechanism and fields.
2. Capture a small fixture set and validate parsing/deduplication.
3. Add deterministic tests for record validation and export.
4. Run a bounded collection sample.
5. Evaluate palette quality and dataset bias before designing a local mimic.

## Current finding

The older documented endpoint, `https://api.huemint.com/color`, returned HTTP 405 during earlier experiments. The current Website Magazine page source instead posts to the same-origin route:

```text
POST https://huemint.com/api/
```

The live page includes `page: "website-magazine"` and `preset` in addition to the documented generation fields. A bounded probe on 2026-09-27 returned HTTP 200 and ten valid four-color palettes. This route is used only from the isolated research tooling; it is not a stable application dependency.

## Bounded collection commands

One API probe:

```sh
npm run huemint:probe
```

One collection request, capped at ten new palettes:

```sh
npm run huemint:collect -- --requests=1 --delay-ms=5000 --max-palettes=10
```

Safety limits enforced by the collector:

- no more than 10 requests in one run
- at least 2 seconds between requests; 5 seconds by default
- no more than 100 new palettes in one run
- 20-second request timeout
- at most two retries with exponential backoff for rate limits and server errors
- save after each successful request so an interrupted run is resumable
- deduplicate by a stable hash of the complete ordered palette

## Local engine rule

The first local-engine stage is deliberately corpus-only. It selects a complete palette captured from Huemint and never calls `Math.random`, invents a HEX value, or synthesizes a replacement color. Controlled variations and 10-color expansion are deferred until a sufficiently broad Website Magazine and Gradient-10 corpus exists.
