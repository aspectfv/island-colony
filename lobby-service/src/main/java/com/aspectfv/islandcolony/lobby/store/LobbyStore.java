package com.aspectfv.islandcolony.lobby.store;

import com.aspectfv.islandcolony.lobby.domain.LobbyRecord;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class LobbyStore {
  private final ConcurrentHashMap<String, LobbyRecord> lobbies = new ConcurrentHashMap<>();

  public Optional<LobbyRecord> find(String code) {
    return Optional.ofNullable(lobbies.get(code));
  }

  /** Returns false if the code is already taken. */
  public boolean saveIfAbsent(LobbyRecord lobby) {
    return lobbies.putIfAbsent(lobby.lobbyCode(), lobby) == null;
  }
}
