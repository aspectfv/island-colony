package com.aspectfv.islandcolony.lobby.domain;

import java.time.Instant;

public class PlayerRecord {
  private final String playerId;
  private final String displayName;
  private final int slot;
  private final Instant joinedAt;
  private final String playerToken;
  private Instant lastSeenAt;

  public PlayerRecord(
      String playerId, String displayName, int slot, Instant joinedAt, String playerToken) {
    this.playerId = playerId;
    this.displayName = displayName;
    this.slot = slot;
    this.joinedAt = joinedAt;
    this.playerToken = playerToken;
    this.lastSeenAt = joinedAt;
  }

  public String playerId() {
    return playerId;
  }

  public String displayName() {
    return displayName;
  }

  public int slot() {
    return slot;
  }

  public Instant joinedAt() {
    return joinedAt;
  }

  public String playerToken() {
    return playerToken;
  }

  public Instant lastSeenAt() {
    return lastSeenAt;
  }

  public void markSeen(Instant now) {
    this.lastSeenAt = now;
  }
}
