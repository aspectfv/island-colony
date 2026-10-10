import type { Problem } from "../shared/contracts/common";

export class ProblemError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title ?? problem.code);
    this.name = "ProblemError";
    this.problem = problem;
  }

  get code(): string {
    return this.problem.code;
  }

  get status(): number {
    return this.problem.status;
  }
}

export const KNOWN_PROBLEM_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "The submitted details are invalid. Please check your inputs.",
  INVALID_PLAYER_TOKEN: "You are not recognized in this lobby or your session has expired.",
  NOT_HOST: "Only the lobby host can perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  LOBBY_NOT_FOUND: "No active lobby found with that code.",
  PLAYER_NOT_FOUND: "Player could not be found in this lobby.",
  LOBBY_FULL: "This lobby is full (maximum 5 players).",
  LOBBY_NOT_WAITING: "The session has already started or ended.",
  LOBBY_CHANGED: "Lobby membership changed during start; please try again.",
  NAME_TAKEN: "That name is already in use in this lobby.",
  SESSION_NOT_STARTED: "The session has not started yet.",
  SESSION_NOT_IN_PROGRESS: "The session is no longer in progress.",
  SESSION_EXISTS: "A session record with this ID already exists.",
  SESSION_NOT_FOUND: "Session record not found.",
  WORLD_SERVICE_UNAVAILABLE: "World configuration service is currently unreachable.",
  INTERNAL_ERROR: "An unexpected server error occurred. Please try again.",
};

export function formatProblemMessage(problem: Problem): string {
  const friendly = KNOWN_PROBLEM_MESSAGES[problem.code];
  if (friendly) {
    return friendly;
  }
  return problem.detail || problem.title || `Error: ${problem.code}`;
}

export function createProblem(
  status: number,
  code: string,
  title: string,
  detail?: string,
  errors?: { field: string; message: string }[],
): Problem {
  return {
    type: "about:blank",
    status,
    title,
    detail,
    code,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };
}
