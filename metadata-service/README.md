# Metadata Service

ASP.NET Core (.NET 10) microservice storing session metadata, participant records, and game outcomes.

- **Port**: `8084` (HTTP)
- **State**: In-memory repository for the MVP
- **Contract**: `contracts/openapi/metadata.openapi.yaml` and `contracts/schemas/metadata.schema.json`
- **Error Specification**: RFC 9457 `application/problem+json` with machine-readable `code`

## Endpoints

### Stage 1 (Issue #11)
- `GET /health` - Service health check and implemented contracts version.
- `POST /api/v1/sessions` - Creates an active session record and participant roster. Returns 201 Created with `SessionRecord`, 400 `VALIDATION_FAILED`, or 409 `SESSION_EXISTS`.
- `GET /api/v1/sessions/{sessionId}` - Retrieves a session record by its UUID. Returns 200 OK or 404 `SESSION_NOT_FOUND`.

### Stage 2 (Future)
- `POST /api/v1/sessions/{sessionId}/summary` - Records how the session ended.
- `GET /api/v1/sessions` - Lists recent sessions, newest first.

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) (`10.0.x`)

## Development

### Run the Service Locally

From the `metadata-service/` directory:

```bash
dotnet run --project src/MetadataService
```

The service will start listening on `http://localhost:8084`.

### Run Tests

Run the full xUnit test suite (including WebApplicationFactory HTTP integration tests):

```bash
dotnet test
```

### Verify & Format Code

Verify formatting matches repository standards:

```bash
dotnet format --verify-no-changes
```

Format code:

```bash
dotnet format
```

## Configuration

The service can be configured via `appsettings.json` or environment variables:

| Setting / Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS allowed origins |
| `CONTRACTS_VERSION` | Value from `contracts/VERSION` or `1.0.1` | Implemented contracts version |
