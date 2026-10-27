# Lobby service

Java and Spring Boot. Creates and joins lobbies, tracks membership, assigns the host, starts and
ends sessions, and requests a world configuration from the world service when a session starts.

State is in memory. Restarting the service clears all lobbies.

## Run

```bash
mvn spring-boot:run          # http://localhost:8081
```

Environment: `ALLOWED_ORIGINS` (comma separated, default `http://localhost:5173`).

## Test and format

```bash
mvn test                     # JUnit tests
mvn spotless:apply           # fix formatting
mvn -B verify                # build, format check, tests (what CI runs)
```
