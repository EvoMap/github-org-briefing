import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type FeishuSendOptions = {
  webhook?: string;
  secret?: string;
  fetchImpl?: typeof fetch;
};

export type FeishuSendResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

export async function sendFeishuReport(reportDir: string, options: FeishuSendOptions = {}): Promise<FeishuSendResult> {
  const webhook = options.webhook ?? process.env.FEISHU_WEBHOOK_URL;
  if (!webhook) {
    throw new Error("FEISHU_WEBHOOK_URL is not set. Pass --feishu-webhook or set the environment variable.");
  }

  const text = await buildFeishuText(reportDir);
  return sendFeishuText(text, options);
}

export async function sendFeishuText(text: string, options: FeishuSendOptions = {}): Promise<FeishuSendResult> {
  const webhook = options.webhook ?? process.env.FEISHU_WEBHOOK_URL;
  if (!webhook) {
    throw new Error("FEISHU_WEBHOOK_URL is not set. Pass --feishu-webhook or set the environment variable.");
  }

  const secret = options.secret ?? process.env.FEISHU_BOT_SECRET ?? process.env.FEISHU_SECRET;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body: Record<string, unknown> = {
    msg_type: "text",
    content: {
      text
    }
  };

  if (secret) {
    body.timestamp = timestamp;
    body.sign = signFeishu(timestamp, secret);
  }

  const response = await (options.fetchImpl ?? fetch)(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  return {
    ok: response.ok && !responseText.includes('"code":190'),
    status: response.status,
    responseText
  };
}

export function signFeishu(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  return createHmac("sha256", stringToSign).update("").digest("base64");
}

async function buildFeishuText(reportDir: string): Promise<string> {
  const markdownPath = path.join(reportDir, "brief.md");
  const markdown = await readFile(markdownPath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? "GitHub Organization Briefing";
  const overview = collectSection(lines, "## Overview", "## Repository Highlights");
  const highlights = collectHighlightLines(lines, 8);
  const warnings = collectSection(lines, "## Risks / Watch Notes", "## Link Index").slice(0, 5);

  return [
    title,
    "",
    ...overview,
    "",
    "Repository Highlights:",
    ...(highlights.length > 0 ? highlights : ["- No active repository commits in this window."]),
    "",
    "Watch Notes:",
    ...(warnings.length > 0 ? warnings : ["- No fetch warnings."]),
    "",
    `Markdown: ${markdownPath}`,
    `HTML: ${path.join(reportDir, "brief.html")}`,
    `Comic: ${path.join(reportDir, "comic.png")}`
  ]
    .join("\n")
    .slice(0, 3500);
}

function collectSection(lines: string[], start: string, end: string): string[] {
  const startIndex = lines.findIndex((line) => line.trim() === start);
  if (startIndex < 0) return [];
  const endIndex = lines.findIndex((line, index) => index > startIndex && line.trim() === end);
  return lines
    .slice(startIndex + 1, endIndex > -1 ? endIndex : undefined)
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectHighlightLines(lines: string[], max: number): string[] {
  const result: string[] = [];
  let currentRepo = "";
  for (const line of lines) {
    if (line.startsWith("### ")) {
      currentRepo = line.replace(/^###\s+/, "").replace(/\[(.*?)\]\(.*?\)/, "$1");
      result.push(`- ${currentRepo}`);
    } else if (line.startsWith("- [") && currentRepo && result.length < max) {
      result.push(`  ${line.replace(/\[(.*?)\]\(.*?\)/, "$1")}`);
    }
    if (result.length >= max) break;
  }
  return result;
}
