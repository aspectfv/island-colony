package com.aspectfv.islandcolony.lobby.error;

import java.util.List;

public class LobbyException extends RuntimeException {
  public record FieldIssue(String field, String message) {}

  private final ErrorCode code;
  private final List<FieldIssue> errors;

  public LobbyException(ErrorCode code, String detail) {
    this(code, detail, null);
  }

  public LobbyException(ErrorCode code, String detail, List<FieldIssue> errors) {
    super(detail);
    this.code = code;
    this.errors = errors;
  }

  public ErrorCode code() {
    return code;
  }

  public List<FieldIssue> errors() {
    return errors;
  }
}
