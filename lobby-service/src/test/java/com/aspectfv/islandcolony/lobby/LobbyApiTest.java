package com.aspectfv.islandcolony.lobby;

import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class LobbyApiTest {
  private static final String BASE = "/api/v1/lobbies";
  private static final String TOKEN = "X-Player-Token";
  private static final String UNKNOWN_PLAYER = "3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10";

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  // ---------- helpers ----------

  private String body(String name) throws Exception {
    return json.writeValueAsString(Map.of("displayName", name));
  }

  private ResultActions postName(String url, String name) throws Exception {
    return mvc.perform(post(url).contentType(APPLICATION_JSON).content(body(name)));
  }

  private JsonNode create(String name) throws Exception {
    String res =
        postName(BASE, name)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(res);
  }

  private JsonNode join(String code, String name) throws Exception {
    String res =
        postName(BASE + "/" + code + "/players", name)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(res);
  }

  private static String code(JsonNode membership) {
    return membership.get("lobby").get("lobbyCode").asText();
  }

  private static String token(JsonNode membership) {
    return membership.get("playerToken").asText();
  }

  private static String id(JsonNode membership) {
    return membership.get("playerId").asText();
  }

  private ResultActions expectProblem(ResultActions r, int status, String code) throws Exception {
    return r.andExpect(status().is(status))
        .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
        .andExpect(jsonPath("$.code").value(code))
        .andExpect(jsonPath("$.status").value(status))
        .andExpect(jsonPath("$.title").isNotEmpty());
  }

  // ---------- health + CORS ----------

  @Test
  void healthReturnsOk() throws Exception {
    mvc.perform(get("/health")).andExpect(status().isOk());
  }

  @Test
  void corsAllowsConfiguredOrigin() throws Exception {
    mvc.perform(
            options(BASE)
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", TOKEN))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
  }

  @Test
  void corsRejectsOtherOrigin() throws Exception {
    mvc.perform(
            options(BASE)
                .header("Origin", "http://evil.example")
                .header("Access-Control-Request-Method", "POST"))
        .andExpect(status().isForbidden());
  }

  // ---------- create ----------

  @Test
  void createMakesWaitingLobbyWithHostInSlotZero() throws Exception {
    postName(BASE, "Aspect")
        .andExpect(status().isCreated())
        .andExpect(
            jsonPath("$.lobby.lobbyCode")
                .value(matchesPattern("^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$")))
        .andExpect(jsonPath("$.lobby.status").value("WAITING"))
        .andExpect(jsonPath("$.lobby.maxPlayers").value(5))
        .andExpect(jsonPath("$.lobby.players.length()").value(1))
        .andExpect(jsonPath("$.lobby.players[0].slot").value(0))
        .andExpect(jsonPath("$.lobby.players[0].displayName").value("Aspect"))
        .andExpect(jsonPath("$.lobby.players[0].playerToken").doesNotExist())
        .andExpect(jsonPath("$.lobby.hostPlayerId").value(notNullValue()))
        .andExpect(jsonPath("$.lobby.session").value(nullValue()))
        .andExpect(jsonPath("$.lobby.endReason").doesNotExist())
        .andExpect(jsonPath("$.playerToken").value(startsWith("tok_")));
  }

  @Test
  void createTrimsName() throws Exception {
    postName(BASE, "  Aspect  ")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.lobby.players[0].displayName").value("Aspect"));
  }

  @Test
  void createAcceptsSixteenCharacterName() throws Exception {
    postName(BASE, "a".repeat(16)).andExpect(status().isCreated());
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "   "})
  void createRejectsBlankName(String name) throws Exception {
    expectProblem(postName(BASE, name), 400, "VALIDATION_FAILED")
        .andExpect(jsonPath("$.errors[0].field").value("/displayName"));
  }

  @Test
  void createRejectsTooLongName() throws Exception {
    expectProblem(postName(BASE, "a".repeat(17)), 400, "VALIDATION_FAILED");
  }

  @Test
  void createRejectsMissingNameAndMalformedBody() throws Exception {
    expectProblem(
        mvc.perform(post(BASE).contentType(APPLICATION_JSON).content("{}")),
        400,
        "VALIDATION_FAILED");
    expectProblem(
        mvc.perform(post(BASE).contentType(APPLICATION_JSON).content("not json")),
        400,
        "VALIDATION_FAILED");
    expectProblem(mvc.perform(post(BASE).contentType(APPLICATION_JSON)), 400, "VALIDATION_FAILED");
  }

  @Test
  void createIgnoresUnknownFields() throws Exception {
    mvc.perform(
            post(BASE).contentType(APPLICATION_JSON).content("{\"displayName\":\"A\",\"extra\":1}"))
        .andExpect(status().isCreated());
  }

  // ---------- get ----------

  @Test
  void getReturnsLobbyWithoutToken() throws Exception {
    String code = code(create("Aspect"));
    mvc.perform(get(BASE + "/" + code))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lobbyCode").value(code))
        .andExpect(jsonPath("$.players[0].playerToken").doesNotExist());
  }

  @Test
  void getIsCaseInsensitiveAndReturnsUppercaseCode() throws Exception {
    String code = code(create("Aspect"));
    mvc.perform(get(BASE + "/" + code.toLowerCase()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lobbyCode").value(code));
  }

  @Test
  void getWithValidTokenSucceeds() throws Exception {
    JsonNode host = create("Aspect");
    mvc.perform(get(BASE + "/" + code(host)).header(TOKEN, token(host))).andExpect(status().isOk());
  }

  @Test
  void getUnknownLobbyIs404() throws Exception {
    expectProblem(mvc.perform(get(BASE + "/ZZZZZZ")), 404, "LOBBY_NOT_FOUND");
  }

  @Test
  void getWithBadTokenIs401() throws Exception {
    String code = code(create("Aspect"));
    expectProblem(
        mvc.perform(get(BASE + "/" + code).header(TOKEN, "tok_nope")), 401, "INVALID_PLAYER_TOKEN");
  }

  @Test
  void getWithTokenFromAnotherLobbyIs401() throws Exception {
    JsonNode a = create("Aspect");
    JsonNode b = create("Other");
    expectProblem(
        mvc.perform(get(BASE + "/" + code(a)).header(TOKEN, token(b))),
        401,
        "INVALID_PLAYER_TOKEN");
  }

  // ---------- join ----------

  @Test
  void joinTakesNextSlotAndReturnsToken() throws Exception {
    String code = code(create("Aspect"));
    postName(BASE + "/" + code + "/players", "Rami")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.playerToken").value(startsWith("tok_")))
        .andExpect(jsonPath("$.lobby.players.length()").value(2))
        .andExpect(jsonPath("$.lobby.players[1].displayName").value("Rami"))
        .andExpect(jsonPath("$.lobby.players[1].slot").value(1));
  }

  @Test
  void joinTakesLowestFreeSlotAfterSomeoneLeaves() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    JsonNode p1 = join(code, "One");
    join(code, "Two");
    mvc.perform(delete(BASE + "/" + code + "/players/" + id(p1)).header(TOKEN, token(p1)))
        .andExpect(status().isNoContent());
    postName(BASE + "/" + code + "/players", "Three")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.lobby.players[?(@.displayName=='Three')].slot").value(1));
  }

  @Test
  void joinUnknownLobbyIs404() throws Exception {
    expectProblem(postName(BASE + "/ZZZZZZ/players", "Rami"), 404, "LOBBY_NOT_FOUND");
  }

  @Test
  void joinRejectsInvalidName() throws Exception {
    String code = code(create("Aspect"));
    expectProblem(postName(BASE + "/" + code + "/players", " "), 400, "VALIDATION_FAILED");
  }

  @Test
  void joinRejectsDuplicateNameIgnoringCase() throws Exception {
    String code = code(create("Aspect"));
    expectProblem(postName(BASE + "/" + code + "/players", "aSPECT"), 409, "NAME_TAKEN");
  }

  @Test
  void joinRejectsFullLobby() throws Exception {
    String code = code(create("P0"));
    for (int i = 1; i < 5; i++) {
      join(code, "P" + i);
    }
    expectProblem(postName(BASE + "/" + code + "/players", "P5"), 409, "LOBBY_FULL");
  }

  @Test
  void joinRejectsLobbyThatIsNotWaiting() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    mvc.perform(delete(BASE + "/" + code + "/players/" + id(host)).header(TOKEN, token(host)))
        .andExpect(status().isNoContent());
    expectProblem(postName(BASE + "/" + code + "/players", "Late"), 409, "LOBBY_NOT_WAITING");
  }

  // ---------- leave ----------

  @Test
  void memberCanLeaveAndTokenStopsWorking() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    JsonNode p = join(code, "Rami");
    mvc.perform(delete(BASE + "/" + code + "/players/" + id(p)).header(TOKEN, token(p)))
        .andExpect(status().isNoContent());
    mvc.perform(get(BASE + "/" + code).header(TOKEN, token(host)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.players.length()").value(1))
        .andExpect(jsonPath("$.status").value("WAITING"));
    expectProblem(
        mvc.perform(get(BASE + "/" + code).header(TOKEN, token(p))), 401, "INVALID_PLAYER_TOKEN");
  }

  @Test
  void hostCanRemoveAnotherPlayer() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    JsonNode p = join(code, "Rami");
    mvc.perform(delete(BASE + "/" + code + "/players/" + id(p)).header(TOKEN, token(host)))
        .andExpect(status().isNoContent());
    mvc.perform(get(BASE + "/" + code))
        .andExpect(jsonPath("$.players.length()").value(1))
        .andExpect(jsonPath("$.status").value("WAITING"));
  }

  @Test
  void nonHostCannotRemoveAnotherPlayer() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    JsonNode a = join(code, "A");
    JsonNode b = join(code, "B");
    expectProblem(
        mvc.perform(delete(BASE + "/" + code + "/players/" + id(b)).header(TOKEN, token(a))),
        403,
        "FORBIDDEN");
    expectProblem(
        mvc.perform(delete(BASE + "/" + code + "/players/" + id(host)).header(TOKEN, token(a))),
        403,
        "FORBIDDEN");
  }

  @Test
  void hostLeavingWaitingLobbyEndsItWithHostLeft() throws Exception {
    JsonNode host = create("Aspect");
    String code = code(host);
    JsonNode p = join(code, "Rami");
    mvc.perform(delete(BASE + "/" + code + "/players/" + id(host)).header(TOKEN, token(host)))
        .andExpect(status().isNoContent());
    mvc.perform(get(BASE + "/" + code).header(TOKEN, token(p)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ENDED"))
        .andExpect(jsonPath("$.endReason").value("HOST_LEFT"));
  }

  @Test
  void leaveWithoutOrWithBadTokenIs401() throws Exception {
    JsonNode host = create("Aspect");
    String url = BASE + "/" + code(host) + "/players/" + id(host);
    expectProblem(mvc.perform(delete(url)), 401, "INVALID_PLAYER_TOKEN");
    expectProblem(mvc.perform(delete(url).header(TOKEN, "tok_nope")), 401, "INVALID_PLAYER_TOKEN");
  }

  @Test
  void leaveUnknownLobbyIs404() throws Exception {
    expectProblem(
        mvc.perform(delete(BASE + "/ZZZZZZ/players/" + UNKNOWN_PLAYER).header(TOKEN, "tok_x")),
        404,
        "LOBBY_NOT_FOUND");
  }

  @Test
  void hostRemovingUnknownPlayerIs404() throws Exception {
    JsonNode host = create("Aspect");
    expectProblem(
        mvc.perform(
            delete(BASE + "/" + code(host) + "/players/" + UNKNOWN_PLAYER)
                .header(TOKEN, token(host))),
        404,
        "PLAYER_NOT_FOUND");
  }
}
