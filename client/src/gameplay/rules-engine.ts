import type {
  ActionRejected,
  BuildingPlaced,
  Contribution,
  GameState,
  GamePlayer,
  HostToPeerGameMessage,
  ObjectiveUpdated,
  PlacedStructure,
  PlacedStructureSummary,
  ResourceAmounts,
  ResourceGathered,
  SessionCompleted,
  SessionSummary,
} from "../shared/contracts/gameplay";
import type {
  BuildObjective,
  BuildZone,
  GatherObjective,
  ObjectiveDef,
  Vec2,
  WorldConfig,
} from "../shared/contracts/world";

export const RANGE_SLACK = 0.5;

function isGatherObjective(obj: ObjectiveDef): obj is ObjectiveDef & GatherObjective {
  return obj.kind === "GATHER" && "target" in obj;
}

function isBuildObjective(obj: ObjectiveDef): obj is ObjectiveDef & BuildObjective {
  return obj.kind === "BUILD" && "structureType" in obj && typeof obj.structureType === "string";
}

export interface RulesEngineOptions {
  world: WorldConfig;
  sessionId: string;
  hostPlayer: {
    playerId: string;
    displayName: string;
  };
  /**
   * Injectable clock returning epoch milliseconds.
   * Defaults to Date.now.
   */
  now?: () => number;
}

export type ActionResult<TSuccess extends HostToPeerGameMessage> =
  | { ok: true; events: HostToPeerGameMessage[]; event: TSuccess }
  | { ok: false; rejection: ActionRejected };

export class RulesEngine {
  readonly world: WorldConfig;
  readonly now: () => number;

  private readonly state: GameState;
  private seqCounter = 0;
  private nextStructureNumber = 1;
  private readonly readyPlayers = new Set<string>();
  private readonly usedRequestIds = new Set<string>();
  private readonly lastGatherTime = new Map<string, number>();
  private readonly playerPositions = new Map<string, Vec2>();

  // Metrics for SessionSummary
  private readonly totalGathered: ResourceAmounts = {};
  private readonly playerGathered = new Map<string, ResourceAmounts>();
  private readonly playerStructuresPlaced = new Map<string, number>();
  private readonly placedStructuresSummary: PlacedStructureSummary[] = [];

  constructor(options: RulesEngineOptions) {
    this.world = options.world;
    this.now = options.now ?? (() => Date.now());

    const hostSlot = 0;
    const hostSpawn = this.world.spawnPoints[hostSlot % this.world.spawnPoints.length] ?? {
      position: { x: 0, z: 0 },
      yaw: 0,
    };

    const hostGamePlayer: GamePlayer = {
      playerId: options.hostPlayer.playerId,
      displayName: options.hostPlayer.displayName,
      slot: hostSlot,
      position: {
        x: hostSpawn.position.x,
        y: 0,
        z: hostSpawn.position.z,
      },
      yaw: hostSpawn.yaw,
    };

    // The host is ready from session start (no CLIENT_READY needed)
    this.readyPlayers.add(hostGamePlayer.playerId);
    this.playerPositions.set(hostGamePlayer.playerId, { ...hostSpawn.position });
    this.initPlayerStats(hostGamePlayer.playerId);

    this.state = {
      sessionId: options.sessionId,
      status: "ACTIVE",
      players: [hostGamePlayer],
      resources: { ...this.world.rules.startingResources },
      nodeCharges: {},
      structures: [],
      objectiveIndex: 0,
    };

    // Initialize all defined resources in totalGathered map
    for (const r of this.world.rules.resources) {
      this.totalGathered[r.resourceType] = 0;
    }

    // Check if initial starting resources already satisfy initial GATHER objectives
    this.checkObjectiveCascade();
  }

  getState(): Readonly<GameState> {
    return {
      ...this.state,
      resources: { ...this.state.resources },
      nodeCharges: { ...this.state.nodeCharges },
      structures: [...this.state.structures],
      players: this.state.players.map((p) => ({ ...p, position: { ...p.position } })),
    };
  }

  addPlayer(player: GamePlayer): void {
    if (this.state.players.some((p) => p.playerId === player.playerId)) return;
    this.state.players.push(player);
    this.playerPositions.set(player.playerId, { x: player.position.x, z: player.position.z });
    this.initPlayerStats(player.playerId);
  }

  markPlayerReady(playerId: string): void {
    this.readyPlayers.add(playerId);
  }

  updatePlayerPosition(playerId: string, pos: { x: number; z: number }): void {
    this.playerPositions.set(playerId, { x: pos.x, z: pos.z });
    const player = this.state.players.find((p) => p.playerId === playerId);
    if (player) {
      player.position.x = pos.x;
      player.position.z = pos.z;
    }
  }

  // --- GATHER_RESOURCE ---

  gatherResource(
    playerId: string,
    requestId: string,
    resourceId: string,
  ): ActionResult<ResourceGathered> {
    // 1. Session status is ACTIVE
    if (this.state.status !== "ACTIVE") {
      return this.reject(requestId, "SESSION_NOT_ACTIVE", "Session is not active.");
    }

    // 2. Requester has sent CLIENT_READY
    if (!this.readyPlayers.has(playerId)) {
      return this.reject(requestId, "PLAYER_NOT_READY", "Player has not sent CLIENT_READY.");
    }

    // Duplicate request check (per session per requester)
    if (this.hasUsedRequestId(playerId, requestId)) {
      return this.reject(requestId, "DUPLICATE_REQUEST", "RequestId already used in this session.");
    }

    // 3. resourceId exists in the world config
    const node = this.world.resourceNodes.find((n) => n.resourceId === resourceId);
    if (!node) {
      return this.reject(requestId, "RESOURCE_NOT_FOUND", `Node ${resourceId} does not exist.`);
    }

    const nodeType = this.world.rules.nodeTypes.find((t) => t.nodeType === node.nodeType);
    if (!nodeType) {
      return this.reject(
        requestId,
        "RESOURCE_NOT_FOUND",
        `Unknown node type ${node.nodeType} for ${resourceId}.`,
      );
    }

    // 4. Node has charges left
    const remainingCharges = this.state.nodeCharges[resourceId] ?? nodeType.charges;
    if (remainingCharges <= 0) {
      return this.reject(requestId, "RESOURCE_DEPLETED", `Node ${resourceId} is depleted.`);
    }

    // 5. Ground distance to node is at most rules.gathering.interactionRange + slack
    const playerPos = this.playerPositions.get(playerId) ?? { x: 0, z: 0 };
    const dist = Math.hypot(node.position.x - playerPos.x, node.position.z - playerPos.z);
    const maxRange = this.world.rules.gathering.interactionRange + RANGE_SLACK;
    if (dist > maxRange) {
      return this.reject(
        requestId,
        "OUT_OF_RANGE",
        `Node ${resourceId} is out of interaction range.`,
      );
    }

    // 6. At least rules.gathering.cooldownMs since last accepted gather
    const now = this.now();
    const lastGather = this.lastGatherTime.get(playerId);
    if (lastGather !== undefined && now - lastGather < this.world.rules.gathering.cooldownMs) {
      return this.reject(requestId, "ON_COOLDOWN", "Gather is on cooldown.");
    }

    // Success!
    this.recordRequestId(playerId, requestId);
    this.lastGatherTime.set(playerId, now);

    const newCharges = remainingCharges - 1;
    this.state.nodeCharges[resourceId] = newCharges;

    const resourceType = nodeType.resourceType;
    const currentAmount = this.state.resources[resourceType] ?? 0;
    const nextAmount = currentAmount + nodeType.yieldPerGather;
    this.state.resources[resourceType] = nextAmount;

    // Track metrics
    this.totalGathered[resourceType] =
      (this.totalGathered[resourceType] ?? 0) + nodeType.yieldPerGather;
    const playerG = this.playerGathered.get(playerId);
    if (playerG) {
      playerG[resourceType] = (playerG[resourceType] ?? 0) + nodeType.yieldPerGather;
    }

    const event: ResourceGathered = {
      type: "RESOURCE_GATHERED",
      seq: this.nextSeq(),
      requestId,
      playerId,
      resourceId,
      resourceType,
      amount: nodeType.yieldPerGather,
      remainingCharges: newCharges,
      resources: { ...this.state.resources },
    };

    const events: HostToPeerGameMessage[] = [event];
    const cascadeEvents = this.checkObjectiveCascade();
    events.push(...cascadeEvents);

    return { ok: true, events, event };
  }

  // --- PLACE_BUILDING ---

  placeBuilding(
    playerId: string,
    requestId: string,
    structureType: string,
    position: Vec2,
    yaw: number,
  ): ActionResult<BuildingPlaced> {
    // 1. Session status is ACTIVE
    if (this.state.status !== "ACTIVE") {
      return this.reject(requestId, "SESSION_NOT_ACTIVE", "Session is not active.");
    }

    // 2. Requester has sent CLIENT_READY
    if (!this.readyPlayers.has(playerId)) {
      return this.reject(requestId, "PLAYER_NOT_READY", "Player has not sent CLIENT_READY.");
    }

    // Duplicate request check
    if (this.hasUsedRequestId(playerId, requestId)) {
      return this.reject(requestId, "DUPLICATE_REQUEST", "RequestId already used in this session.");
    }

    // 3. Current objective is BUILD with this structureType
    const currentObjective = this.world.rules.objectives[this.state.objectiveIndex];
    if (
      !currentObjective ||
      !isBuildObjective(currentObjective) ||
      currentObjective.structureType !== structureType
    ) {
      return this.reject(
        requestId,
        "STRUCTURE_NOT_AVAILABLE",
        `Structure ${structureType} is not the current build objective.`,
      );
    }

    const structureDef = this.world.rules.structures.find((s) => s.structureType === structureType);
    if (!structureDef) {
      return this.reject(
        requestId,
        "STRUCTURE_NOT_AVAILABLE",
        `Structure definition for ${structureType} not found.`,
      );
    }

    // 4. Shared totals cover cost
    for (const [resType, required] of Object.entries(structureDef.cost)) {
      const available = this.state.resources[resType] ?? 0;
      if (available < (required ?? 0)) {
        return this.reject(
          requestId,
          "INSUFFICIENT_RESOURCES",
          `Not enough ${resType} to build ${structureType}.`,
        );
      }
    }

    // 5. Ground distance to position is at most rules.building.placementRange + slack
    const playerPos = this.playerPositions.get(playerId) ?? { x: 0, z: 0 };
    const distToPlayer = Math.hypot(position.x - playerPos.x, position.z - playerPos.z);
    const maxRange = this.world.rules.building.placementRange + RANGE_SLACK;
    if (distToPlayer > maxRange) {
      return this.reject(requestId, "OUT_OF_RANGE", "Placement position is out of range.");
    }

    // 6. Footprint lies fully inside one build zone
    const insideZone = this.world.buildZones.some((zone: BuildZone) => {
      const d = Math.hypot(position.x - zone.center.x, position.z - zone.center.z);
      return d + structureDef.footprintRadius <= zone.radius + 1e-4;
    });
    if (!insideZone) {
      return this.reject(
        requestId,
        "INVALID_PLACEMENT",
        "Structure footprint must lie completely inside a build zone.",
      );
    }

    // 7. No overlap with placed structures or non-depleted nodes
    const nodeTypesByNodeType = new Map(this.world.rules.nodeTypes.map((n) => [n.nodeType, n]));

    for (const node of this.world.resourceNodes) {
      const def = nodeTypesByNodeType.get(node.nodeType);
      const charges = this.state.nodeCharges[node.resourceId] ?? (def ? def.charges : 1);
      if (charges > 0) {
        const nodeRadius = def?.footprintRadius ?? 0;
        const d = Math.hypot(position.x - node.position.x, position.z - node.position.z);
        if (d < structureDef.footprintRadius + nodeRadius) {
          return this.reject(
            requestId,
            "INVALID_PLACEMENT",
            `Overlaps with resource node ${node.resourceId}.`,
          );
        }
      }
    }

    const structureDefsByType = new Map(
      this.world.rules.structures.map((s) => [s.structureType, s]),
    );
    for (const placed of this.state.structures) {
      const otherDef = structureDefsByType.get(placed.structureType);
      const otherRadius = otherDef?.footprintRadius ?? 0;
      const d = Math.hypot(position.x - placed.position.x, position.z - placed.position.z);
      if (d < structureDef.footprintRadius + otherRadius) {
        return this.reject(
          requestId,
          "INVALID_PLACEMENT",
          `Overlaps with structure ${placed.structureId}.`,
        );
      }
    }

    // Success! Deduct cost
    this.recordRequestId(playerId, requestId);
    for (const [resType, required] of Object.entries(structureDef.cost)) {
      this.state.resources[resType] = (this.state.resources[resType] ?? 0) - (required ?? 0);
    }

    const structureId = `structure-${this.nextStructureNumber++}`;
    const placed: PlacedStructure = {
      structureId,
      structureType,
      position: { x: position.x, z: position.z },
      yaw,
      placedBy: playerId,
    };
    this.state.structures.push(placed);

    // Track metrics
    const currentPlaced = this.playerStructuresPlaced.get(playerId) ?? 0;
    this.playerStructuresPlaced.set(playerId, currentPlaced + 1);
    this.placedStructuresSummary.push({
      structureType,
      placedBy: playerId,
      placedAt: new Date(this.now()).toISOString(),
    });

    const event: BuildingPlaced = {
      type: "BUILDING_PLACED",
      seq: this.nextSeq(),
      requestId,
      structure: placed,
      resources: { ...this.state.resources },
    };

    const events: HostToPeerGameMessage[] = [event];
    const cascadeEvents = this.checkObjectiveCascade(structureType);
    events.push(...cascadeEvents);

    return { ok: true, events, event };
  }

  // --- Objective Cascades & Session Completion ---

  private checkObjectiveCascade(justBuiltStructureType?: string): HostToPeerGameMessage[] {
    const emittedEvents: HostToPeerGameMessage[] = [];

    while (this.state.objectiveIndex < this.world.rules.objectives.length) {
      const current = this.world.rules.objectives[this.state.objectiveIndex]!;
      let completed = false;

      if (isGatherObjective(current)) {
        const target = current.target;
        const allMet = Object.entries(target).every(([res, required]) => {
          const requiredAmount = typeof required === "number" ? required : 0;
          return (this.state.resources[res] ?? 0) >= requiredAmount;
        });
        if (allMet) {
          completed = true;
        }
      } else if (isBuildObjective(current)) {
        if (justBuiltStructureType && current.structureType === justBuiltStructureType) {
          completed = true;
          justBuiltStructureType = undefined;
        }
      }

      if (!completed) {
        break;
      }

      this.state.objectiveIndex++;
      const objectiveEvent: ObjectiveUpdated = {
        type: "OBJECTIVE_UPDATED",
        seq: this.nextSeq(),
        completedObjectiveId: current.objectiveId,
        objectiveIndex: this.state.objectiveIndex,
      };
      emittedEvents.push(objectiveEvent);

      if (this.state.objectiveIndex >= this.world.rules.objectives.length) {
        this.state.status = "COMPLETED";
        const completedEvent: SessionCompleted = {
          type: "SESSION_COMPLETED",
          seq: this.nextSeq(),
          summary: this.buildSummary("COMPLETED"),
        };
        emittedEvents.push(completedEvent);
        break;
      }
    }

    return emittedEvents;
  }

  buildSummary(outcome: "COMPLETED" | "HOST_ENDED"): SessionSummary {
    const contributions: Contribution[] = this.state.players.map((p) => {
      const g = this.playerGathered.get(p.playerId) ?? {};
      const gatheredClean: ResourceAmounts = {};
      for (const r of this.world.rules.resources) {
        gatheredClean[r.resourceType] = g[r.resourceType] ?? 0;
      }
      return {
        playerId: p.playerId,
        gathered: gatheredClean,
        structuresPlaced: this.playerStructuresPlaced.get(p.playerId) ?? 0,
      };
    });

    const totalClean: ResourceAmounts = {};
    for (const r of this.world.rules.resources) {
      totalClean[r.resourceType] = this.totalGathered[r.resourceType] ?? 0;
    }

    return {
      outcome,
      endedAt: new Date(this.now()).toISOString(),
      objectivesCompleted: this.state.objectiveIndex,
      structures: [...this.placedStructuresSummary],
      totalGathered: totalClean,
      contributions,
    };
  }

  private nextSeq(): number {
    return ++this.seqCounter;
  }

  private hasUsedRequestId(playerId: string, requestId: string): boolean {
    return this.usedRequestIds.has(`${playerId}:${requestId}`);
  }

  private recordRequestId(playerId: string, requestId: string): void {
    this.usedRequestIds.add(`${playerId}:${requestId}`);
  }

  private reject(requestId: string, code: string, message: string): ActionResult<never> {
    return {
      ok: false,
      rejection: {
        type: "ACTION_REJECTED",
        requestId,
        code,
        message,
      },
    };
  }

  private initPlayerStats(playerId: string): void {
    if (!this.playerGathered.has(playerId)) {
      const amounts: ResourceAmounts = {};
      for (const r of this.world.rules.resources) {
        amounts[r.resourceType] = 0;
      }
      this.playerGathered.set(playerId, amounts);
    }
    if (!this.playerStructuresPlaced.has(playerId)) {
      this.playerStructuresPlaced.set(playerId, 0);
    }
  }
}
