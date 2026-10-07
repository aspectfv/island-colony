// Generated from contracts/schemas/signaling.schema.json by scripts/generate-contract-types.mjs. Do not edit.

export type ClientMessage = Join | OfferOut | AnswerOut | IceCandidateOut | Leave;
/**
 * RTCIceCandidateInit as produced by candidate.toJSON(). Null signals end of candidates.
 */
export type IceCandidate = null | {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};
export type ServerMessage =
  Joined | PeerJoined | PeerLeft | OfferIn | AnswerIn | IceCandidateIn | Error;

/**
 * JSON text frames on ws://<signaling-host>/ws. Every message has a type. Clients send to; the server rewrites it to from before forwarding. See docs/signaling-protocol.md.
 */
export interface SignalingSchemaRoot {
  ClientMessage?: ClientMessage;
  ServerMessage?: ServerMessage;
  SessionDescription?: SessionDescription;
  IceCandidate?: IceCandidate;
  Join?: Join;
  Leave?: Leave;
  OfferOut?: OfferOut;
  AnswerOut?: AnswerOut;
  IceCandidateOut?: IceCandidateOut;
  Joined?: Joined;
  PeerJoined?: PeerJoined;
  PeerLeft?: PeerLeft;
  OfferIn?: OfferIn;
  AnswerIn?: AnswerIn;
  IceCandidateIn?: IceCandidateIn;
  Error?: Error;
}
export interface Join {
  type: "JOIN";
  /**
   * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
   */
  lobbyCode: string;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
}
export interface OfferOut {
  type: "OFFER";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  to: string;
  description: SessionDescription;
}
export interface SessionDescription {
  type: "offer" | "answer";
  sdp: string;
}
export interface AnswerOut {
  type: "ANSWER";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  to: string;
  description: SessionDescription;
}
export interface IceCandidateOut {
  type: "ICE_CANDIDATE";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  to: string;
  candidate: IceCandidate;
}
export interface Leave {
  type: "LEAVE";
}
export interface Joined {
  type: "JOINED";
  /**
   * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
   */
  lobbyCode: string;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  /**
   * Other players already in the room.
   *
   * Items: Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  peers: string[];
}
export interface PeerJoined {
  type: "PEER_JOINED";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
}
export interface PeerLeft {
  type: "PEER_LEFT";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
}
export interface OfferIn {
  type: "OFFER";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  from: string;
  description: SessionDescription;
}
export interface AnswerIn {
  type: "ANSWER";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  from: string;
  description: SessionDescription;
}
export interface IceCandidateIn {
  type: "ICE_CANDIDATE";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  from: string;
  candidate: IceCandidate;
}
export interface Error {
  type: "ERROR";
  /**
   * Open set. Known codes are listed in docs/signaling-protocol.md.
   */
  code: string;
  message: string;
}
