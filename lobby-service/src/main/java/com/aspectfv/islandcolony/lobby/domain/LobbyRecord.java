package com.aspectfv.islandcolony.lobby.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Mutable. Callers must hold the lobby's monitor (synchronized) while reading or writing. */
public class LobbyRecord {
  private final String lobbyCode;
  private final String hostPlayerId;
  private final int maxPlayers;
  private final Instant createdAt;
  private final List<PlayerRecord> players = new ArrayList<>();
  private LobbyStatus status = LobbyStatus.WAITING;
  private String endReason; // set only when ENDED

  public LobbyRecord(String lobbyCode, PlayerRecord host, int maxPlayers, Instant createdAt) {
    this.lobbyCode = lobbyCode;
    this.hostPlayerId = host.playerId();
    this.maxPlayers = maxPlayers;
    this.createdAt = createdAt;
    this.players.add(host);
  }

  public String lobbyCode() {
    return lobbyCode;
  }

  public String hostPlayerId() {
    return hostPlayerId;
  }

  public int maxPlayers() {
    return maxPlayers;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public LobbyStatus status() {
    return status;
  }

  public String endReason() {
    return endReason;
  }

  public List<PlayerRecord> players() {
    return players;
  }

  public void end(String reason) {
    this.status = LobbyStatus.ENDED;
    this.endReason = reason;
  }

  public List<PlayerRecord> playersBySlot() {
    return players.stream().sorted(Comparator.comparingInt(PlayerRecord::slot)).toList();
  }

  public Optional<PlayerRecord> findById(String playerId) {
    return players.stream().filter(p -> p.playerId().equalsIgnoreCase(playerId)).findFirst();
  }

  public Optional<PlayerRecord> findByToken(String token) {
    if (token == null) {
      return Optional.empty();
    }
    byte[] given = token.getBytes(StandardCharsets.UTF_8);
    return players.stream()
        .filter(p -> MessageDigest.isEqual(p.playerToken().getBytes(StandardCharsets.UTF_8), given))
        .findFirst();
  }

  public boolean isNameTaken(String name) {
    return players.stream().anyMatch(p -> p.displayName().equalsIgnoreCase(name));
  }

  public int lowestFreeSlot() {
    for (int slot = 0; slot < maxPlayers; slot++) {
      final int s = slot;
      if (players.stream().noneMatch(p -> p.slot() == s)) {
        return slot;
      }
    }
    return -1;
  }
}
