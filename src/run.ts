import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultConfig, loadConfig } from "./config.js";
import { resolveCalendarDateRange, resolveDateRange } from "./dateRange.js";
import { collectGitHubSnapshot, GitHubClient } from "./github.js";
import { renderComic } from "./render/comic.js";
import { renderHtml } from "./render/html.js";
import { renderMarkdown } from "./render/markdown.js";
import { sendFeishuReport } from "./feishu.js";
import { buildStoryboard, buildSummary } from "./summary.js";
import type { RunOptions } from "./types.js";

export type RunResult = {
  reportDir: string;
  markdownPath: string;
  htmlPath: string;
  comicPath?: string;
  warnings: string[];
  feishu?: {
    ok: boolean;
    status: number;
    responseText: string;
  };
};

export async function runBriefing(options: RunOptions, client = new GitHubClient()): Promise<RunResult> {
  const config = await loadConfig(options.config);
  const mergedConfig = {
    ...defaultConfig,
    ...config,
    org: options.org ?? config.org
  };
  const range = options.date ? resolveCalendarDateRange(options.date, mergedConfig.timezone) : resolveDateRange(options.since ?? mergedConfig.window, mergedConfig.timezone);
  const outRoot = options.out ?? process.env.GITHUB_BRIEFING_OUT_DIR ?? process.env.EVOMAP_BRIEFING_OUT_DIR ?? "reports";
  const reportDir = path.resolve(outRoot, range.reportDate);
  const rawDir = path.join(reportDir, "raw");
  await mkdir(rawDir, { recursive: true });

  const snapshot = await collectGitHubSnapshot(mergedConfig, range, client);
  await writeFile(path.join(rawDir, "github.json"), JSON.stringify(snapshot, null, 2), "utf8");

  const summary = buildSummary(snapshot, mergedConfig.timezone, range.reportDate);
  const storyboard = buildStoryboard(summary);
  const warnings = summary.warnings.map((warning) => `${warning.scope}: ${warning.message}`);

  let comicPath: string | undefined;
  if (!options.noComic) {
    const comic = await renderComic(storyboard, reportDir);
    comicPath = comic.imagePath;
    if (comic.warning) warnings.push(comic.warning);
  }

  const renderedSummary = { ...summary, warnings: [...summary.warnings, ...warningsToFetchWarnings(warnings, summary.warnings.length)] };
  const markdown = renderMarkdown(renderedSummary);
  const markdownPath = path.join(reportDir, "brief.md");
  await writeFile(markdownPath, markdown, "utf8");

  const htmlPath = path.join(reportDir, "brief.html");
  await writeFile(htmlPath, renderHtml(renderedSummary), "utf8");

  let feishu: RunResult["feishu"];
  if (options.sendFeishu) {
    feishu = await sendFeishuReport(reportDir, {
      webhook: options.feishuWebhook,
      secret: options.feishuSecret
    });
    if (!feishu.ok) {
      warnings.push(`Feishu webhook returned HTTP ${feishu.status}: ${feishu.responseText}`);
    }
  }

  return {
    reportDir,
    markdownPath,
    htmlPath,
    comicPath,
    warnings,
    feishu
  };
}

function warningsToFetchWarnings(warnings: string[], existingCount: number) {
  return warnings.slice(existingCount).map((message) => ({ scope: "comic", message }));
}
