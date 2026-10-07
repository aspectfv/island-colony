import fixture from "../../../contracts/examples/world/WorldConfig.json";
import type { WorldConfig } from "./contracts/world";

// The development island used in local mode. contracts/ validates it against the schema.
export const fixtureWorld = fixture as unknown as WorldConfig;
