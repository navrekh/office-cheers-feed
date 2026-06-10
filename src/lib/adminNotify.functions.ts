import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Optional admin webhook fire-and-forget. If ADMIN_WEBHOOK_URL is not set,
 * this is a no-op. Compatible with Slack & Discord incoming webhook URLs.
 */
export const notifyAdminNewPost = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        snippet: z.string().min(1).max(500),
        author: z.string().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const url = process.env.ADMIN_WEBHOOK_URL;
    if (!url) return { ok: true, skipped: true as const };

    const text = `🍻 New DrinkedIn Post${data.author ? ` by ${data.author}` : ""}: ${data.snippet}`;

    // Slack & Discord both accept { content } or { text }; send both keys.
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, content: text }),
      });
    } catch {
      // Swallow — never block post creation on alerting.
    }
    return { ok: true, skipped: false as const };
  });
