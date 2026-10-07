# Lobby service

Java and Spring Boot. Creates and joins lobbies, tracks membership, assigns the host, starts and
ends sessions, and requests a world configuration from the world service when a session starts.

State is in memory. Restarting the service clears all lobbies.
