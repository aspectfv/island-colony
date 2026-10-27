package com.aspectfv.islandcolony.lobby.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
  INVALID_PLAYER_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid player token"),
  NOT_HOST(HttpStatus.FORBIDDEN, "Only the host can do this"),
  FORBIDDEN(HttpStatus.FORBIDDEN, "Not allowed"),
  LOBBY_NOT_FOUND(HttpStatus.NOT_FOUND, "Lobby not found"),
  PLAYER_NOT_FOUND(HttpStatus.NOT_FOUND, "Player not found"),
  LOBBY_FULL(HttpStatus.CONFLICT, "Lobby is full"),
  LOBBY_NOT_WAITING(HttpStatus.CONFLICT, "Lobby is not waiting"),
  LOBBY_CHANGED(HttpStatus.CONFLICT, "Lobby changed"),
  NAME_TAKEN(HttpStatus.CONFLICT, "Name already taken"),
  SESSION_NOT_STARTED(HttpStatus.CONFLICT, "Session not started"),
  SESSION_NOT_IN_PROGRESS(HttpStatus.CONFLICT, "Session not in progress"),
  WORLD_SERVICE_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "World service unavailable"),
  INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");

  private final HttpStatus status;
  private final String title;

  ErrorCode(HttpStatus status, String title) {
    this.status = status;
    this.title = title;
  }

  public HttpStatus status() {
    return status;
  }

  public String title() {
    return title;
  }
}
