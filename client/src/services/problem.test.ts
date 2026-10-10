import { describe, expect, it } from "vitest";
import {
  createProblem,
  formatProblemMessage,
  KNOWN_PROBLEM_MESSAGES,
  ProblemError,
} from "./problem";

describe("Problem handling", () => {
  it("formats known problem codes into user-friendly messages", () => {
    const problem = createProblem(404, "LOBBY_NOT_FOUND", "Lobby not found");
    const msg = formatProblemMessage(problem);
    expect(msg).toBe(KNOWN_PROBLEM_MESSAGES.LOBBY_NOT_FOUND);
  });

  it("falls back to detail or title for unknown codes", () => {
    const problemWithDetail = createProblem(
      400,
      "CUSTOM_ERROR",
      "Title",
      "Custom detail explanation",
    );
    expect(formatProblemMessage(problemWithDetail)).toBe("Custom detail explanation");

    const problemWithTitle = createProblem(400, "CUSTOM_ERROR", "Custom Title");
    expect(formatProblemMessage(problemWithTitle)).toBe("Custom Title");
  });

  it("creates ProblemError with correct properties", () => {
    const problem = createProblem(409, "LOBBY_FULL", "Lobby full", "Full lobby detail");
    const error = new ProblemError(problem);

    expect(error.name).toBe("ProblemError");
    expect(error.code).toBe("LOBBY_FULL");
    expect(error.status).toBe(409);
    expect(error.message).toBe("Full lobby detail");
    expect(error.problem).toBe(problem);
  });
});
