# Metadata service

Rules behind `openapi/metadata.openapi.yaml`. Schemas: `schemas/metadata.schema.json`.
Examples: `examples/metadata/`.

## Who calls what

| When | Caller | Call |
|---|---|---|
| Right after the lobby service returns `SessionDetails` | Host client | `POST /api/v1/sessions` |
| After `SESSION_COMPLETED` or `SESSION_ENDED` | Host client | `POST /api/v1/sessions/{id}/summary` |
| Session-complete screen, history views | Any client | `GET /api/v1/sessions/{id}`, `GET /api/v1/sessions` |

The host builds the summary from its authoritative state. It is the same `SessionSummary` object
it broadcasts in `SESSION_COMPLETED` or `SESSION_ENDED`, so peers can render the
session-complete screen without calling this service.

Metadata calls never block gameplay. If one fails, the host logs it and carries on.

## Record rules

| Rule ID | Rule | Detail |
|---|---|---|
| META-RECORD-01 | Creation | `status` is `ACTIVE`, `summary` is `null` |
| META-RECORD-02 | Duplicate create | 409 `SESSION_EXISTS` |
| META-RECORD-03 | Summary | Accepted once. Outcome `COMPLETED` sets status `COMPLETED`; any other outcome (`HOST_ENDED` in v1) sets `ENDED` |
| META-RECORD-04 | Duplicate summary | 409 `SUMMARY_EXISTS` |
| META-RECORD-05 | Duration | `durationSeconds = endedAt - startedAt`, whole seconds, set with the summary |
| META-RECORD-06 | Consistency | Participant `playerId`s are unique. Every `contributions[].playerId` and `structures[].placedBy` is a participant. `structuresPlaced` sums to the length of `structures`, and `gathered` sums to `totalGathered`. Otherwise 400 `VALIDATION_FAILED` |
| META-RECORD-07 | Listing | Newest `startedAt` first, optional `status` filter, `limit` 1 to 100, default 20 |

Sessions that end by host disconnect stay `ACTIVE`, because no one is left to post a summary.

## Error codes

| Rule ID | Status | Code | When |
|---|---|---|---|
| META-ERROR-01 | 400 | `VALIDATION_FAILED` | Body, query, or consistency check fails |
| META-ERROR-02 | 404 | `SESSION_NOT_FOUND` | Unknown `sessionId` |
| META-ERROR-03 | 409 | `SESSION_EXISTS` | Create for a `sessionId` already recorded |
| META-ERROR-04 | 409 | `SUMMARY_EXISTS` | Second summary for a session |
| META-ERROR-05 | 500 | `INTERNAL_ERROR` | Anything unexpected |

## Storage

In memory. Restarting the service drops every record.
