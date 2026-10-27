package com.aspectfv.islandcolony.lobby.web;

import com.aspectfv.islandcolony.lobby.service.LobbyService;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.CreateLobbyRequest;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.JoinLobbyRequest;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.Lobby;
import com.aspectfv.islandcolony.lobby.web.dto.Dtos.LobbyMembership;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/lobbies")
public class LobbyController {
  private static final String TOKEN = "X-Player-Token";

  private final LobbyService service;

  public LobbyController(LobbyService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public LobbyMembership create(@RequestBody CreateLobbyRequest req) {
    return service.create(req.displayName());
  }

  @GetMapping("/{lobbyCode}")
  public Lobby get(
      @PathVariable String lobbyCode, @RequestHeader(name = TOKEN, required = false) String token) {
    return service.get(lobbyCode, token);
  }

  @PostMapping("/{lobbyCode}/players")
  @ResponseStatus(HttpStatus.CREATED)
  public LobbyMembership join(@PathVariable String lobbyCode, @RequestBody JoinLobbyRequest req) {
    return service.join(lobbyCode, req.displayName());
  }

  @DeleteMapping("/{lobbyCode}/players/{playerId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void leave(
      @PathVariable String lobbyCode,
      @PathVariable String playerId,
      @RequestHeader(name = TOKEN, required = false) String token) {
    service.leave(lobbyCode, playerId, token);
  }
}
