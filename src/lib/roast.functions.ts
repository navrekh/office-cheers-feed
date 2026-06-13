import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(3).max(800),
  intensity: z.enum(["mild", "spicy", "nuclear"]).default("spicy"),
});

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service offline. Try again later.");

    const flavor = {
      mild: "Light teasing. PG-13. Witty but not cruel.",
      spicy: "Brutal, sarcastic, savage. Dark-humour breakroom energy. PG-16.",
      nuclear: "Devastating, unfiltered, no-mercy roast. Workplace satire to the max. Still no slurs, no real names.",
    }[data.intensity];

    const system = `You are the DrinkedIn anonymous breakroom roast generator. Given a Slack/email/manager-speak snippet, you reply with ONE single brutal, anonymous, breakroom-style roast — max 280 chars. Tone: ${flavor}. No preamble, no "Here's your roast:", just the roast. Use emojis sparingly. Never include real names, slurs, or anything actionable. End with a single 🍻 only if it lands.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (res.status === 429) {
      throw new Error("Roast oven overheating — wait a moment and retry.");
    }
    if (res.status === 402) {
      throw new Error("Out of AI credits. Top up the workspace to keep roasting.");
    }
    if (!res.ok) {
      throw new Error(`AI gateway error (${res.status})`);
    }

    const json = await res.json();
    const roast: string = json?.choices?.[0]?.message?.content?.trim() || "🤐 Even the AI is speechless.";
    return { roast };
  });
