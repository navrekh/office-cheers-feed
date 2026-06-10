// Client-side post card → PNG renderer.
// Lazy-loaded via dynamic import() so it stays out of the initial bundle.

export type PostCardData = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
};

export function downloadPostAsImage(post: PostCardData) {
  const W = 1200, H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0f1a");
  bg.addColorStop(1, "#111827");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const accent = ctx.createLinearGradient(0, 0, 400, 400);
  accent.addColorStop(0, "rgba(56,189,248,0.25)");
  accent.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 600, 600);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 36px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("DrinkedIn 🍻", 80, 110);

  const initials = post.author_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  ctx.beginPath();
  ctx.arc(130, 240, 60, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 40px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", 130, 240);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 38px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(post.author_name, 220, 230);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(post.author_headline.slice(0, 60), 220, 270);

  ctx.strokeStyle = "rgba(148,163,184,0.2)";
  ctx.beginPath();
  ctx.moveTo(80, 340);
  ctx.lineTo(W - 80, 340);
  ctx.stroke();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "34px ui-sans-serif, system-ui, sans-serif";
  const maxWidth = W - 160;
  const lineHeight = 50;
  const words = post.body_text.split(/\s+/);
  let line = "";
  let y = 410;
  const maxY = H - 240;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, 80, y);
      line = word;
      y += lineHeight;
      if (y > maxY) { line = line + " …"; break; }
    } else {
      line = test;
    }
  }
  if (y <= maxY) ctx.fillText(line, 80, y);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 32px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`🍻 ${post.cheers_count.toLocaleString()} cheers`, 80, H - 140);

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "22px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Made on DrinkedIn.me 🍻", W - 80, H - 60);
  ctx.textAlign = "start";

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drinkedin-${post.id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
