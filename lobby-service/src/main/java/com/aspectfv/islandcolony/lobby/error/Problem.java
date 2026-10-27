package com.aspectfv.islandcolony.lobby.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Problem(
    String type,
    int status,
    String title,
    String code,
    String detail,
    List<LobbyException.FieldIssue> errors) {}
