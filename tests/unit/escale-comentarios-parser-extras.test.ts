import { describe, expect, it } from "vitest";

import { parseSocialMessage } from "@/lib/channels/social/parser";

/** Fase 10D: o parser do direct devolve a mesma mensagem de antes, mais os extras do Instagram. */
const payload = (metadata?: unknown, sender: Record<string, unknown> = {}) => ({
  event: "message.received",
  account: { id: "acc", platform: "instagram" },
  message: {
    id: "m1",
    conversationId: "c1",
    platform: "instagram",
    direction: "incoming",
    text: "oi",
    sender: { id: "u1", name: "Ana", ...sender },
    ...(metadata ? { metadata } : {}),
  },
});

describe("parseSocialMessage · extras (10D)", () => {
  it("sem metadata: extras vazios e o resto igual", () => {
    const m = parseSocialMessage(payload(), "acc", "instagram");
    expect(m).toMatchObject({ platform: "instagram", participantId: "u1", text: "oi", direction: "inbound" });
    expect(m?.extras).toEqual({ mencaoEmStory: false, respostaAStory: null, botao: null, seguidor: null });
  });
  it("lê resposta a story, botão e seguidor", () => {
    const m = parseSocialMessage(
      payload({ storyReply: { storyId: "s1" }, postbackPayload: "x" }, { instagramProfile: { isFollower: true } }),
      "acc",
      "instagram",
    );
    expect(m?.extras).toMatchObject({ respostaAStory: { storyId: "s1" }, botao: "x", seguidor: true });
  });
});
