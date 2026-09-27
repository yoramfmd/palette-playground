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
