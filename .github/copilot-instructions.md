# GVP workspace guidance

- Preserve `Global Video Platform (GVP)` as the neutral internal name.
- Keep the backend modular and avoid premature microservices.
- Keep media out of PostgreSQL; use S3-compatible object storage through adapters.
- Keep transcoding and other heavy work asynchronous.
- Treat API authorization as authoritative; frontend checks are not security boundaries.
- Prefer focused module changes and validate with `npm run typecheck` and `npm run build`.
