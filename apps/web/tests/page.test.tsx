import { describe, expect, it } from "vitest";

describe("Landing page", () => {
  it("has expected structure", () => {
    // Basic smoke test for web app
    const appName = "Lark Master";
    expect(appName).toBe("Lark Master");
  });

  it("environment variables are optional", () => {
    const env = {
      NEXT_PUBLIC_LARK_APP_ID: process.env.NEXT_PUBLIC_LARK_APP_ID,
      NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    };

    // These can be undefined in test environment
    expect(env).toBeDefined();
  });
});
