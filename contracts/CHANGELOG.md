# Changelog

Contract versions follow semver. See `docs/extending.md` for what counts as a patch, minor, or
major change.

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
