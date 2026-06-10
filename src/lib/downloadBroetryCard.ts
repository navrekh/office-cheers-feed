// Lightweight canvas-based meme card renderer for Broetry output.
// No external deps — pure 2D context for fast first-paint.

export function downloadBroetryCard(text: string) {
  const content = (text || "").trim();
  if (!content) return;

  const W = 1080;
  const H = 1350;
  const padding = 80;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Deep-charcoal background with subtle vertical gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#15171c");
  bg.addColorStop(1, "#0c0d11");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top brand strip
  ctx.fillStyle = "rgba(255,191,73,0.9)";
  ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  ctx.fillText("DrinkedIn.me", padding, 60);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Anonymous Corporate Confession", padding, 100);

  // Body text — wrap to width
  ctx.fillStyle = "#ffffff";
  const fontSize = 44;
  const lineHeight = 60;
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textBaseline = "top";

  const maxWidth = W - padding * 2;
  const startY = 200;
  const maxBodyHeight = H - startY - 220;

  const paragraphs = content.split(/\n+/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(""); continue; }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  const maxLines = Math.floor(maxBodyHeight / lineHeight);
  const drawn = lines.slice(0, maxLines);
  if (lines.length > maxLines && drawn.length) {
    drawn[drawn.length - 1] = drawn[drawn.length - 1].replace(/.{0,3}$/, "…");
  }
  drawn.forEach((line, i) => ctx.fillText(line, padding, startY + i * lineHeight));

  // Bottom neon-amber watermark banner
  const bannerH = 110;
  const bannerY = H - bannerH;
  const banner = ctx.createLinearGradient(0, bannerY, W, bannerY);
  banner.addColorStop(0, "rgba(255,176,46,0.18)");
  banner.addColorStop(0.5, "rgba(255,191,73,0.32)");
  banner.addColorStop(1, "rgba(255,176,46,0.18)");
  ctx.fillStyle = banner;
  ctx.fillRect(0, bannerY, W, bannerH);

  ctx.shadowColor = "rgba(255,191,73,0.85)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffd57a";
  ctx.font = "700 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "middle";
  const watermark = "🍻 Generated via DrinkedIn.me — The Live Tech Hub Radar";
  const wmW = ctx.measureText(watermark).width;
  ctx.fillText(watermark, (W - wmW) / 2, bannerY + bannerH / 2);
  ctx.shadowBlur = 0;

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `drinkedin_confession_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
