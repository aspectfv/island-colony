# Invariants

Rules that hold across every service and the client. Each one is detailed in the doc it points
to; this page gives them IDs so tests can cite them.

| Rule ID | Invariant | Detail |
|---|---|---|
| INV-01 | The host is the only authority on gameplay state. Peers send movement and requests; only the host validates them, changes state and broadcasts the result | `gameplay-protocol.md` (Topology, Ordering and the snapshot) |
| INV-02 | Gameplay code never checks "am I the host" to decide whether an action is allowed. The host's own requests go through the same `NetworkAdapter` and the same rules | `gameplay-protocol.md` (Topology) |
| INV-03 | Shared resources are deducted only after a placement is accepted | `gameplay-protocol.md` (`PLACE_BUILDING`) |
| INV-04 | Every state-changing host event carries `seq`, starting at 1 and increasing by exactly 1, and peers apply events in `seq` order | `gameplay-protocol.md` (Ordering and the snapshot) |
| INV-05 | The signaling service never carries gameplay traffic | `signaling-protocol.md` |
| INV-06 | The same seed gives the same world config from the same world service build, and every client builds the same island from the same config | `world-config.md` (Determinism) |
| INV-07 | Game content (resources, node types, structures, costs, objectives) comes from the world config `rules`, never from code | `world-config.md` (Rules) |
| INV-08 | Consumers ignore unknown fields and message types, and handle unknown values in open sets with a generic fallback | `conventions.md` (Reading and writing payloads) |
| INV-09 | Points in time are ISO 8601 UTC with a `Z` suffix | `conventions.md` (Time) |
| INV-10 | Metadata calls never block gameplay. If one fails, the host logs it and carries on | `metadata-service.md` |

## IDs and tests

Every rule table in `docs/` has a `Rule ID` column. A test that checks a rule puts the rule's ID at
the start of its name:

| Stack | Example |
|---|---|
| TypeScript (Vitest, Playwright) | `it("GP-GATHER-04: rejects a depleted node", ...)` |
| Java (JUnit) | `@DisplayName("LOBBY-ERROR-07: sixth join is LOBBY_FULL")` |
| C# (xUnit) | `[Fact(DisplayName = "META-RECORD-04: second summary is SUMMARY_EXISTS")]` |
| Go | `// SIG-ERROR-05` on the line above `func TestRoomFull(t *testing.T)` |
| Python (pytest) | `# WORLD-CONFIG-02` on the line above `def test_spawn_points_on_land():` |

One test can cite several IDs. `npm run trace` in `contracts/` checks the links:

- A citation of an ID that no table defines fails the check
- A rule that no test cites yet is listed as not built. It does not fail the check until
  Checkpoint C, when CI runs it with `--strict`

IDs never change meaning. A removed rule's ID is retired, not reused, and a new rule takes the
next free number in its table.
