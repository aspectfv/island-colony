# Signaling service

Go. Accepts WebSocket connections and relays WebRTC offers, answers and ICE candidates between
players in the same lobby until their peer connections open.

Gameplay traffic never passes through this service. It travels over WebRTC DataChannels.
