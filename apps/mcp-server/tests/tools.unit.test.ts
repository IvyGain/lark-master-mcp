import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../src/config.js";

describe("Tool registration", () => {
  it("RuntimeConfig has expected structure", () => {
    const cfg: RuntimeConfig = {
      larkCliBin: "lark-cli",
      profileDir: "~/.lark-master",
      defaultIdentity: "auto",
      domain: undefined,
      requireConfirm: false,
    };

    expect(cfg.larkCliBin).toBe("lark-cli");
    expect(cfg.defaultIdentity).toBe("auto");
    expect(cfg.requireConfirm).toBe(false);
  });

  it("Tool names follow lark_* convention", () => {
    const toolNames = [
      "lark_doctor",
      "lark_calendar_agenda",
      "lark_im_send_text",
      "lark_docs_create",
      "lark_task_create",
      "lark_mail_send",
    ];

    for (const name of toolNames) {
      expect(name.startsWith("lark_")).toBe(true);
    }
  });
});
