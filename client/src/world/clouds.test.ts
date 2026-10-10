import { describe, expect, it } from "vitest";
import { CloudLayer } from "./clouds";

describe("CloudLayer", () => {
  it("initializes with instanced clouds", () => {
    const layer = new CloudLayer(100, 6);
    expect(layer.group.children.length).toBe(1);
    expect(layer.group.name).toBe("clouds");
  });

  it("updates cloud positions over delta time without errors", () => {
    const layer = new CloudLayer(100, 6);
    expect(() => layer.update(0.016)).not.toThrow();
  });
});
