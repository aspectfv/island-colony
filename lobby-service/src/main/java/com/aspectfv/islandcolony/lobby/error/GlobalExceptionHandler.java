package com.aspectfv.islandcolony.lobby.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(LobbyException.class)
  ResponseEntity<Object> handleLobby(LobbyException e) {
    ErrorCode c = e.code();
    return respond(
        new Problem(
            "about:blank", c.status().value(), c.title(), c.name(), e.getMessage(), e.errors()));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Object> handleUnexpected(Exception e) {
    log.error("Unexpected error", e);
    ErrorCode c = ErrorCode.INTERNAL_ERROR;
    return respond(
        new Problem(
            "about:blank", 500, c.title(), c.name(), "Something went wrong on our side.", null));
  }

  /** Framework errors (bad JSON, wrong method, unknown route) get the same problem shape. */
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest req) {
    HttpStatus status = HttpStatus.valueOf(statusCode.value());
    boolean validation = status == HttpStatus.BAD_REQUEST;
    String code = validation ? ErrorCode.VALIDATION_FAILED.name() : status.name();
    String title = validation ? ErrorCode.VALIDATION_FAILED.title() : status.getReasonPhrase();
    String detail = validation ? "The request body is missing or malformed." : null;
    return respond(new Problem("about:blank", status.value(), title, code, detail, null));
  }

  private static ResponseEntity<Object> respond(Problem p) {
    return ResponseEntity.status(p.status())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(p);
  }
}
