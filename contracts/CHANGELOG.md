# Changelog

Contract versions follow semver. See `docs/extending.md` for what counts as a patch, minor, or
major change.

## 1.0.2 (2026-11-14)

- Rule tables in `docs/` gained a `Rule ID` column, and the world config guarantees became a table
  with IDs. No rule changed
- Added `docs/invariants.md` with IDs for the rules that cross every service
- Added `scripts/trace.mjs` (`npm run trace`), which checks rule IDs cited in tests

## 1.0.1 (2026-10-07)

- Moved the reference terrain sampler to `scripts/sample-height.mjs` so service and client tests
  can import it. No behavior change

## 1.0.0 (2026-10-07)

First agreed contracts.

- Conventions: IDs, coordinates, units, time, error format, ports, versioning, reading rules
- World config v1 with explicit heightmap, content catalogs, and objectives (`GATHER`, `BUILD`)
- Lobby service REST API v1 with token auth and polling heartbeat
- World service REST API v1
- Metadata service REST API v1
- Signaling WebSocket protocol
- Gameplay protocol v1: star topology, `game` and `movement` channels, sequenced host events
- Development fixture island (seed 1234)
