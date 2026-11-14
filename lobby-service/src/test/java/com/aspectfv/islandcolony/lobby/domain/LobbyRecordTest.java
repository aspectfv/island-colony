package com.aspectfv.islandcolony.lobby.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class LobbyRecordTest {
  private static PlayerRecord player(String id, String name, int slot) {
    return new PlayerRecord(id, name, slot, Instant.now(), "tok_" + id);
  }

  private static LobbyRecord lobby() {
    return new LobbyRecord("ABC234", player("h", "Host", 0), 2, Instant.now());
  }

  @Test
  void playersViewIsReadOnly() {
    LobbyRecord lobby = lobby();
    assertThrows(
        UnsupportedOperationException.class, () -> lobby.players().add(player("x", "X", 1)));
    assertThrows(UnsupportedOperationException.class, () -> lobby.players().clear());
  }

  @Test
  void addPlayerRejectsTakenSlot() {
    assertThrows(IllegalStateException.class, () -> lobby().addPlayer(player("x", "X", 0)));
  }

  @Test
  void addPlayerRejectsSlotOutOfRange() {
    assertThrows(IllegalStateException.class, () -> lobby().addPlayer(player("x", "X", 2)));
  }

  @Test
  void addPlayerRejectsFullLobby() {
    LobbyRecord lobby = lobby();
    lobby.addPlayer(player("a", "A", 1));
    assertThrows(IllegalStateException.class, () -> lobby.addPlayer(player("b", "B", 1)));
  }

  @Test
  void addPlayerRejectsDuplicateNameIgnoringCase() {
    assertThrows(IllegalStateException.class, () -> lobby().addPlayer(player("x", "HOST", 1)));
  }

  @Test
  void addPlayerRejectsWhenNotWaiting() {
    LobbyRecord lobby = lobby();
    lobby.end("HOST_LEFT");
    assertThrows(IllegalStateException.class, () -> lobby.addPlayer(player("x", "X", 1)));
  }

  @Test
  void removingMemberKeepsLobbyWaiting() {
    LobbyRecord lobby = lobby();
    PlayerRecord member = player("m", "Member", 1);
    lobby.addPlayer(member);
    lobby.removePlayer(member);
    assertEquals(LobbyStatus.WAITING, lobby.status());
    assertEquals(1, lobby.players().size());
  }

  @Test
  void removingHostFromWaitingLobbyEndsIt() {
    LobbyRecord lobby = lobby();
    lobby.removePlayer(lobby.findById("h").orElseThrow());
    assertEquals(LobbyStatus.ENDED, lobby.status());
    assertEquals("HOST_LEFT", lobby.endReason());
  }
}
