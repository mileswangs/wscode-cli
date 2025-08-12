import { describe, it, expect, beforeEach } from "vitest";
import { ToolRegistry } from "./tool-registry";
import { LsTool } from "./ls";
import { ReadFilesTool } from "./read-files";

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe("registerTool", () => {
    it("should register a tool successfully", () => {
      const tool = new LsTool();
      registry.registerTool(tool);

      expect(registry.hasTool("list_directory")).toBe(true);
      expect(registry.listTools()).toContain("list_directory");
    });

    it("should throw error when registering duplicate tool", () => {
      const tool1 = new LsTool();
      const tool2 = new LsTool();

      registry.registerTool(tool1);

      expect(() => registry.registerTool(tool2)).toThrow(
        "Tool with name list_directory is already registered"
      );
    });
  });

  describe("getTool", () => {
    it("should return registered tool", () => {
      const tool = new ReadFilesTool();
      registry.registerTool(tool);

      const retrieved = registry.getTool("read_files");
      expect(retrieved).toBe(tool);
    });

    it("should return null for non-existent tool", () => {
      const retrieved = registry.getTool("non_existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("utility methods", () => {
    it("should list all tool names", () => {
      registry.registerTool(new LsTool());
      registry.registerTool(new ReadFilesTool());

      const tools = registry.listTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContain("list_directory");
      expect(tools).toContain("read_files");
    });

    it("should return all tools", () => {
      const tool1 = new LsTool();
      const tool2 = new ReadFilesTool();

      registry.registerTool(tool1);
      registry.registerTool(tool2);

      const allTools = registry.getAllTools();
      expect(allTools).toHaveLength(2);
      expect(allTools).toContain(tool1);
      expect(allTools).toContain(tool2);
    });

    it("should unregister tool", () => {
      registry.registerTool(new LsTool());
      expect(registry.hasTool("list_directory")).toBe(true);

      const result = registry.unregisterTool("list_directory");
      expect(result).toBe(true);
      expect(registry.hasTool("list_directory")).toBe(false);
    });
  });
});
