# Global Video Platform Architecture

## Objective

A creator can create an account and channel, upload media through a direct object-storage session, have the media processed asynchronously into HLS renditions and thumbnails, publish it, and reach viewers through CDN delivery. Viewer interactions become transactional metadata and analytics events without coupling playback to heavy processing.

## Initial shape

The first release is a modular monolith with background workers. The API owns authentication, authorization, metadata, transactions, and job creation. Workers own FFmpeg processing and media inspection. PostgreSQL is the source of truth; Redis is used for cache, rate limits, ephemeral state, and queue coordination; object storage holds media; a CDN serves published assets.

```text
Web / mobile clients -> API -> auth + application modules -> PostgreSQL
                                      |                    -> Redis
                                      -> job queue -> workers -> FFmpeg -> object storage -> CDN -> player
```

The API never performs transcoding synchronously.

## Backend modules

Initial modules: auth, users, sessions, channels, videos, uploads, processing, comments, likes, subscriptions, search, history, playlists, notifications, studio, moderation, and admin. Each module owns its controller, application service, repository, DTOs, validation, persistence model, and tests. Modules communicate through application interfaces and domain events, not direct database access across boundaries.

Future extraction candidates are processing, search, notifications, recommendations, analytics, live, and developer-api. The evolution is modular monolith, horizontally scaled API plus workers, dedicated high-load services, then multi-region services.

## Media flow

1. The creator requests an upload session.
2. The API authorizes the creator and returns a short-lived signed, resumable object-storage upload target.
3. The client uploads directly and reports completion.
4. The API verifies size, content type, checksum, ownership, and object existence.
5. A processing job is committed transactionally with the upload state.
6. A worker probes the source, runs FFmpeg, writes HLS manifests, segments, renditions, and thumbnails, then updates processing state.
7. A creator publishes only a ready asset. The CDN serves the published HLS manifest and segments.

Logical storage keys:

```text
media/originals/{creator_id}/{video_id}/source
media/hls/{video_id}/master.m3u8
media/hls/{video_id}/{rendition}/segment-{number}.ts
media/thumbnails/{video_id}/default.jpg
media/avatars/{user_id}/default.jpg
media/banners/{channel_id}/default.jpg
```

The provider remains undecided. An S3-compatible adapter keeps the domain independent of a vendor.

## PostgreSQL

Initial tables: users, sessions, channels, videos, video_files, video_transcodes, thumbnails, comments, comment_replies, likes, subscriptions, watch_history, playlists, playlist_items, notifications, reports, moderation_actions, and audit_logs. Future tables include shorts, clips, live_streams, live_chat, posts, memberships, payments, payouts, ads, copyright_claims, recommendation_events, and analytics_events.

Use UUID identifiers, foreign keys, check constraints, unique constraints for relationships such as subscriptions and likes, indexes for creator/status/time and feed queries, cursor pagination, created_at and updated_at fields, and soft deletion where auditability requires it. Large media never belongs in PostgreSQL.

## Security and operations

Authentication uses short-lived access tokens plus revocable sessions. Authorization is enforced in the API with resource ownership and role checks; frontend permissions are only presentation. Upload URLs are short-lived and scoped to one object. Validate MIME type, size, checksum, and malware/copyright policy before publishing. Rate-limit auth, comments, reactions, and upload-session creation. Record security-sensitive mutations in audit_logs.

Use structured logs with request and correlation IDs, metrics for API latency, queue depth, processing failures, playback-start failures, and CDN origin errors, and traces across API, queue, worker, and storage. Backups, retention policies, encryption, secret management, and disaster recovery are deployment concerns, not module concerns.

## Deployment stages

Stage 1 runs the web app, API, worker process, PostgreSQL, Redis, object storage, and CDN in one environment. Stage 2 scales API and workers independently. Stage 3 extracts only proven hotspots. Stage 4 adds regional data and media placement, global routing, replication, and region-aware workers.

## Future capability boundaries

Shorts and clips share video primitives but own discovery rules. Live owns ingest, chat, recording, and playback state. Posts own community content. Monetization owns memberships, tips, ads, payments, and payouts. Copyright owns fingerprinting and claims. Recommendations consume event streams and return ranked candidates. Analytics consumes immutable events and produces creator-facing aggregates. Developer API is a separately authenticated contract over approved application services.
