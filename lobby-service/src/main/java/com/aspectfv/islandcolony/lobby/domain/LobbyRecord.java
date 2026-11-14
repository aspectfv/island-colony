package com.aspectfv.islandcolony.lobby.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
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
    return Collections.unmodifiableList(players);
  }

  /**
   * Adds a joining player. Callers check first to report friendly errors; this guards the rules.
   */
  public void addPlayer(PlayerRecord player) {
    if (status != LobbyStatus.WAITING) {
      throw new IllegalStateException("Lobby is not waiting");
    }
    if (players.size() >= maxPlayers) {
      throw new IllegalStateException("Lobby is full");
    }
    boolean slotInvalid = player.slot() < 0 || player.slot() >= maxPlayers;
    if (slotInvalid || players.stream().anyMatch(p -> p.slot() == player.slot())) {
      throw new IllegalStateException("Slot " + player.slot() + " is not available");
    }
    if (isNameTaken(player.displayName())) {
      throw new IllegalStateException("Name is already taken");
    }
    players.add(player);
  }

  /** Removes a player. The host leaving a waiting lobby ends it. */
  public void removePlayer(PlayerRecord player) {
    if (!players.remove(player)) {
      return;
    }
    if (player.playerId().equals(hostPlayerId) && status == LobbyStatus.WAITING) {
      end("HOST_LEFT");
    }
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
