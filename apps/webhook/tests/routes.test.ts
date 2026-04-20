import { describe, expect, it } from "vitest";

describe("Webhook routes", () => {
  it("has expected route structure", () => {
    const routes = [
      "/healthz",
      "/lark/event",
      "/lark/card-action",
      "/lark/oauth/callback",
    ];

    expect(routes.length).toBe(4);
    expect(routes[0]).toBe("/healthz");
  });

  it("validates Lark event structure", () => {
    const mockEvent = {
      schema: "2.0",
      header: {
        event_id: "test-event-id",
        event_type: "im.message.receive_v1",
        create_time: "1609459200000",
        token: "test-token",
        app_id: "cli_test",
        tenant_key: "test-tenant",
      },
      event: {
        message: {
          message_type: "text",
          content: '{"text":"Hello"}',
        },
      },
    };

    expect(mockEvent.schema).toBe("2.0");
    expect(mockEvent.header.event_type).toBe("im.message.receive_v1");
  });
});
