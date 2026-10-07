# Contracts

Shared formats that every part of the game depends on. A contract is agreed here before code that
uses it is written. Changing one needs a PR that updates every affected side, approved by the
project lead.

To define:

| Contract | Used between |
|---|---|
| REST API requests and responses | Client, lobby, world and metadata services |
| WebSocket signaling messages | Client and signaling service |
| WebRTC gameplay messages | Host and peers |
| World configuration format | World service, lobby service, client |
| Coordinate conventions | Client and world service |
| Player, lobby and session identifiers | Everywhere |
| Error response format | All services |
