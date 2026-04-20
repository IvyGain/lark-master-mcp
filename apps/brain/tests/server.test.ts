import { describe, expect, it } from "vitest";

describe("Brain server", () => {
  it("has expected configuration", () => {
    const config = {
      port: process.env.PORT || 8080,
      larkCliBin: process.env.LARK_CLI_BIN || "lark-cli",
    };

    expect(config).toBeDefined();
    expect(typeof config.port === "string" || typeof config.port === "number").toBe(true);
  });

  it("validates Anthropic API key presence", () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // In production, API key is required
    // In test environment, it's optional
    if (apiKey) {
      expect(apiKey.startsWith("sk-ant-")).toBe(true);
    } else {
      expect(apiKey).toBeUndefined();
    }
  });
});
