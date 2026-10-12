import type { LobbyClient } from "./lobby-client";
import type { MetadataClient } from "./metadata-client";
import { MockLobbyClient } from "./mock-lobby-client";
import { MockMetadataClient } from "./mock-metadata-client";

export interface Services {
  lobby: LobbyClient;
  metadata: MetadataClient;
}

let activeServices: Services | null = null;

export function createServices(): Services {
  return {
    lobby: new MockLobbyClient(),
    metadata: new MockMetadataClient(),
  };
}

export function getServices(): Services {
  if (!activeServices) {
    activeServices = createServices();
  }
  return activeServices;
}

export function setServices(services: Services): void {
  activeServices = services;
}
