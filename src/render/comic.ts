import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import type { Storyboard } from "../types.js";

export type ComicResult = {
  imagePath: string;
  storyboardPath: string;
  warning?: string;
};

export async function renderComic(storyboard: Storyboard, outDir: string): Promise<ComicResult> {
  await mkdir(outDir, { recursive: true });
  const imagePath = path.join(outDir, "comic.png");
  const storyboardPath = path.join(outDir, "comic.storyboard.json");
  await writeFile(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");

  const overlay = Buffer.from(buildComicSvg(storyboard, true));
  const fallback = Buffer.from(buildComicSvg(storyboard, false));
  let warning: string | undefined;

  if (process.env.OPENAI_API_KEY) {
    try {
      const base = await generateOpenAiBase(storyboard);
      await sharp(base)
        .resize(1200, 1800, { fit: "cover" })
        .composite([{ input: overlay, blend: "over" }])
        .png()
        .toFile(imagePath);
      return { imagePath, storyboardPath };
    } catch (error) {
      warning = `OpenAI image generation failed; used local infographic fallback. ${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    warning = "OPENAI_API_KEY is not set; used local infographic fallback.";
  }

  await sharp(fallback).png().toFile(imagePath);
  return { imagePath, storyboardPath, warning };
}

async function generateOpenAiBase(storyboard: Storyboard): Promise<Buffer> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = [
    "Create a lively comic explainer infographic background for a technical GitHub organization daily briefing.",
    "Use 4 to 6 comic panels, playful visual metaphors for repositories and commits, energetic composition, expressive line art, and bright but readable editorial colors.",
    "Make it fun and story-like while still feeling professional for engineers.",
    "Leave generous blank areas for deterministic overlaid text.",
    "Do not include readable words, logos, code secrets, or exact UI screenshots.",
    `Theme: ${storyboard.title}.`
  ].join(" ");

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1536"
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Image API did not return base64 image data.");
  }
  return Buffer.from(b64, "base64");
}

function buildComicSvg(storyboard: Storyboard, transparent: boolean): string {
  const width = 1200;
  const height = 1800;
  const panelGap = 26;
  const panelWidth = 520;
  const panelHeight = 360;
  const startY = 330;
  const panels = storyboard.panels.slice(0, 6);

  const panelSvg = panels
    .map((panel, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 70 + col * (panelWidth + panelGap);
      const y = startY + row * (panelHeight + panelGap);
      const fill = ["#fff3c4", "#dff3ff", "#f0e3ff", "#ddf7e8", "#ffe0de", "#edf2f7"][index] ?? "#ffffff";
      return `
        <g>
          <rect x="${x}" y="${y}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="${fill}" stroke="#17202a" stroke-width="4"/>
          <circle cx="${x + panelWidth - 54}" cy="${y + 54}" r="24" fill="#ff6b4a" stroke="#17202a" stroke-width="4"/>
          <path d="M${x + 32} ${y + panelHeight - 48} C${x + 116} ${y + panelHeight - 92}, ${x + 210} ${y + panelHeight - 18}, ${x + 306} ${y + panelHeight - 62}" fill="none" stroke="#17202a" stroke-width="5" stroke-linecap="round"/>
          <text x="${x + 28}" y="${y + 58}" font-size="34" font-weight="800" fill="#17202a">${escapeXml(panel.title)}</text>
          <text x="${x + 28}" y="${y + 108}" font-size="24" font-weight="700" fill="#1f8a70">${escapeXml(panel.metric)}</text>
          ${wrapText(panel.text, 43)
            .slice(0, 6)
            .map((line, lineIndex) => `<text x="${x + 28}" y="${y + 162 + lineIndex * 34}" font-size="24" fill="#25313b">${escapeXml(line)}</text>`)
            .join("\n")}
        </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${transparent ? "" : '<rect width="1200" height="1800" fill="#fffaf0"/><circle cx="1050" cy="190" r="110" fill="#ffcf56"/><circle cx="160" cy="260" r="64" fill="#78d6c6"/><path d="M0 260 C260 210 410 330 650 260 C890 190 990 210 1200 170 L1200 0 L0 0 Z" fill="#b9e7ff"/><path d="M78 258 L150 228 L132 306 Z" fill="#ff6b4a" stroke="#17202a" stroke-width="4"/>'}
    <rect x="42" y="42" width="1116" height="1716" rx="10" fill="${transparent ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)"}" stroke="#17202a" stroke-width="5"/>
    <text x="76" y="126" font-size="56" font-weight="900" fill="#17202a">${escapeXml(storyboard.title)}</text>
    <text x="78" y="178" font-size="28" fill="#5d6d7e">${escapeXml(storyboard.subtitle)}</text>
    <rect x="76" y="220" width="360" height="10" rx="5" fill="#1f8a70"/>
    ${panelSvg}
    <text x="78" y="1708" font-size="22" fill="#5d6d7e">Generated from public GitHub commit metadata. See brief.md for source links.</text>
  </svg>`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}
