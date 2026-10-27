package com.aspectfv.islandcolony.lobby.service;

import com.aspectfv.islandcolony.lobby.domain.LobbyRecord;
import com.aspectfv.islandcolony.lobby.domain.LobbyStatus;
import com.aspectfv.islandcolony.lobby.domain.PlayerRecord;
import com.aspectfv.islandcolony.lobby.error.ErrorCode;
import com.aspectfv.islandcolony.lobby.error.LobbyException;
import com.aspectfv.islandcolony.lobby.store.LobbyStore;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.Lobby;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.LobbyMembership;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LobbyService {
  public static final int MAX_PLAYERS = 5;
  private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  private static final int CODE_LENGTH = 6;

  private final LobbyStore store;
  private final SecureRandom random = new SecureRandom();

  public LobbyService(LobbyStore store) {
    this.store = store;
  }

  public LobbyMembership create(String rawName) {
    String name = validateName(rawName);
    PlayerRecord host = newPlayer(name, 0);
    LobbyRecord lobby;
    do {
      lobby = new LobbyRecord(generateCode(), host, MAX_PLAYERS, host.joinedAt());
    } while (!store.saveIfAbsent(lobby));
    synchronized (lobby) {
      return membership(lobby, host);
    }
  }

  public Lobby get(String code, String token) {
    LobbyRecord lobby = find(code);
    synchronized (lobby) {
      if (token != null) {
        PlayerRecord caller = lobby.findByToken(token).orElseThrow(LobbyService::invalidToken);
        caller.markSeen(Instant.now());
      }
      return Lobby.from(lobby);
    }
  }

  public LobbyMembership join(String code, String rawName) {
    String name = validateName(rawName);
    LobbyRecord lobby = find(code);
    synchronized (lobby) {
      if (lobby.status() != LobbyStatus.WAITING) {
        throw new LobbyException(
            ErrorCode.LOBBY_NOT_WAITING,
            "Lobby " + lobby.lobbyCode() + " is not accepting players.");
      }
      int slot = lobby.lowestFreeSlot();
      if (slot < 0) {
        throw new LobbyException(
            ErrorCode.LOBBY_FULL,
            "Lobby " + lobby.lobbyCode() + " already has " + lobby.maxPlayers() + " players.");
      }
      if (lobby.isNameTaken(name)) {
        throw new LobbyException(
            ErrorCode.NAME_TAKEN, "The name \"" + name + "\" is already used.");
      }
      PlayerRecord player = newPlayer(name, slot);
      lobby.players().add(player);
      return membership(lobby, player);
    }
  }

  public void leave(String code, String playerId, String token) {
    LobbyRecord lobby = find(code);
    synchronized (lobby) {
      PlayerRecord caller = lobby.findByToken(token).orElseThrow(LobbyService::invalidToken);
      boolean self = caller.playerId().equalsIgnoreCase(playerId);
      if (!self && !caller.playerId().equals(lobby.hostPlayerId())) {
        throw new LobbyException(ErrorCode.FORBIDDEN, "Only the host can remove another player.");
      }
      PlayerRecord target =
          self
              ? caller
              : lobby
                  .findById(playerId)
                  .orElseThrow(
                      () ->
                          new LobbyException(
                              ErrorCode.PLAYER_NOT_FOUND, "That player is not in this lobby."));
      lobby.players().remove(target);
      if (target.playerId().equals(lobby.hostPlayerId()) && lobby.status() == LobbyStatus.WAITING) {
        lobby.end("HOST_LEFT");
      }
    }
  }

  // ---- helpers ----

  private LobbyRecord find(String code) {
    String normalized = code == null ? "" : code.toUpperCase(Locale.ROOT);
    return store
        .find(normalized)
        .orElseThrow(
            () ->
                new LobbyException(
                    ErrorCode.LOBBY_NOT_FOUND, "No lobby with code " + normalized + "."));
  }

  private static LobbyException invalidToken() {
    return new LobbyException(
        ErrorCode.INVALID_PLAYER_TOKEN, "Missing or invalid player token for this lobby.");
  }

  private static String validateName(String raw) {
    String name = raw == null ? "" : raw.trim();
    int length = name.codePointCount(0, name.length());
    if (length < 1 || length > 16) {
      throw new LobbyException(
          ErrorCode.VALIDATION_FAILED,
          "Display name must be 1 to 16 characters.",
          List.of(new LobbyException.FieldIssue("/displayName", "must be 1 to 16 characters")));
    }
    return name;
  }

  private PlayerRecord newPlayer(String name, int slot) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    byte[] bytes = new byte[16]; // 128 bits
    random.nextBytes(bytes);
    String token = "tok_" + HexFormat.of().formatHex(bytes);
    return new PlayerRecord(UUID.randomUUID().toString(), name, slot, now, token);
  }

  private String generateCode() {
    StringBuilder sb = new StringBuilder(CODE_LENGTH);
    for (int i = 0; i < CODE_LENGTH; i++) {
      sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
    }
    return sb.toString();
  }

  private LobbyMembership membership(LobbyRecord lobby, PlayerRecord player) {
    return new LobbyMembership(Lobby.from(lobby), player.playerId(), player.playerToken());
  }
}
