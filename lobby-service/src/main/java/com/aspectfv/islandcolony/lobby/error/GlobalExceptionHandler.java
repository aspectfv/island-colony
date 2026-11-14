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
            "about:blank", c.status().value(), c.title(), c.name(), e.getMessage(), e.errors()),
        null);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Object> handleUnexpected(Exception e) {
    log.error("Unexpected error", e);
    ErrorCode c = ErrorCode.INTERNAL_ERROR;
    return respond(
        new Problem(
            "about:blank", 500, c.title(), c.name(), "Something went wrong on our side.", null),
        null);
  }

  /**
   * Framework errors (bad JSON, wrong method, unsupported media type, unknown route) get the same
   * problem shape. Mapping: 400 is VALIDATION_FAILED, 5xx is INTERNAL_ERROR, and other statuses
   * keep their HTTP status name (NOT_FOUND, METHOD_NOT_ALLOWED, ...) because the contract has no
   * dedicated code for them. Headers from the framework (Allow, Accept) are passed through.
   */
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest req) {
    int status = statusCode.value();
    HttpStatus resolved = HttpStatus.resolve(status);
    String detail = status == 400 ? "The request body is missing or malformed." : null;
    return respond(
        new Problem(
            "about:blank",
            status,
            titleFor(status, resolved),
            codeFor(status, resolved),
            detail,
            null),
        headers);
  }

  private static String codeFor(int status, HttpStatus resolved) {
    if (status == 400) {
      return ErrorCode.VALIDATION_FAILED.name();
    }
    if (status >= 500) {
      return ErrorCode.INTERNAL_ERROR.name();
    }
    return resolved != null ? resolved.name() : "HTTP_" + status;
  }

  private static String titleFor(int status, HttpStatus resolved) {
    if (status == 400) {
      return ErrorCode.VALIDATION_FAILED.title();
    }
    if (status >= 500) {
      return ErrorCode.INTERNAL_ERROR.title();
    }
    return resolved != null ? resolved.getReasonPhrase() : "HTTP " + status;
  }

  private static ResponseEntity<Object> respond(Problem p, HttpHeaders headers) {
    return ResponseEntity.status(p.status())
        .headers(headers)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(p);
  }
}
