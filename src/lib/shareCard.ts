// Generate a shareable PNG "confession card" from a post via Canvas.
// No external deps; runs entirely client-side.

export type CardInput = {
  author: string;
  body: string;
  postId: string;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateShareCard(input: CardInput): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background: rich zinc gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0a0a");
  bg.addColorStop(1, "#1a1103");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Amber glow blob
  const glow = ctx.createRadialGradient(200, 200, 20, 200, 200, 500);
  glow.addColorStop(0, "rgba(251,191,36,0.22)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Grain dots
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      if (Math.random() > 0.6) ctx.fillRect(x, y, 1, 1);
    }
  }

  // Amber bar top
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(0, 0, W, 12);

  // Header
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 42px 'Archivo Black', system-ui, sans-serif";
  ctx.fillText("🍻 DRINKEDIN", 80, 130);

  ctx.fillStyle = "rgba(251,191,36,0.6)";
  ctx.font = "bold 22px ui-monospace, monospace";
  ctx.fillText("// ANONYMOUS CORPORATE CONFESSION", 80, 168);

  // Author
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 28px ui-monospace, monospace";
  ctx.fillText(input.author, 80, 240);

  // Body text
  ctx.fillStyle = "#fafaf9";
  ctx.font = "600 46px system-ui, sans-serif";
  const lines = wrapText(ctx, `"${input.body}"`, W - 160);
  let y = 340;
  const lineHeight = 62;
  const maxLines = 14;
  const shown = lines.slice(0, maxLines);
  for (const l of shown) {
    ctx.fillText(l, 80, y);
    y += lineHeight;
  }
  if (lines.length > maxLines) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("…", 80, y);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "bold 24px ui-monospace, monospace";
  ctx.fillText("READ + REPLY →  drinkedin.me", 80, H - 100);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 20px ui-monospace, monospace";
  ctx.fillText("NO REAL NAMES · NO WORK EMAIL · EVER", 80, H - 60);

  // Amber bar bottom
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(0, H - 12, W, 12);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export async function downloadShareCard(input: CardInput) {
  const blob = await generateShareCard(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `drinkedin-${input.postId.slice(0, 8)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
