package com.aspectfv.islandcolony.lobby.web.dto;

import com.aspectfv.islandcolony.lobby.domain.LobbyRecord;
import com.aspectfv.islandcolony.lobby.domain.PlayerRecord;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

public final class Dtos {
  private Dtos() {}

  public record CreateLobbyRequest(String displayName) {}

  public record JoinLobbyRequest(String displayName) {}

  public record LobbyPlayer(String playerId, String displayName, int slot, Instant joinedAt) {
    static LobbyPlayer from(PlayerRecord p) {
      return new LobbyPlayer(p.playerId(), p.displayName(), p.slot(), p.joinedAt());
    }
  }

  /** `session` is always null until stage 2 (start). It must stay in the JSON as null. */
  public record Lobby(
      String lobbyCode,
      String status,
      String hostPlayerId,
      int maxPlayers,
      List<LobbyPlayer> players,
      Object session,
      @JsonInclude(JsonInclude.Include.NON_NULL) String endReason,
      Instant createdAt) {
    public static Lobby from(LobbyRecord l) {
      return new Lobby(
          l.lobbyCode(),
          l.status().name(),
          l.hostPlayerId(),
          l.maxPlayers(),
          l.playersBySlot().stream().map(LobbyPlayer::from).toList(),
          null,
          l.endReason(),
          l.createdAt());
    }
  }

  public record LobbyMembership(Lobby lobby, String playerId, String playerToken) {}
}
