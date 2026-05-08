#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./config.js";
import { sendFeishuReport } from "./feishu.js";
import { GitHubClient } from "./github.js";
import { renderScheduleHelp } from "./schedule.js";
import { runBriefing } from "./run.js";

const program = new Command();

program
  .name("github-org-briefing")
  .description("Generate GitHub organization briefings.")
  .version("0.1.0");

program
  .command("run")
  .description("Fetch public GitHub commits and generate Markdown, HTML, and comic briefing files.")
  .option("--org <org>", "GitHub organization")
  .option("--date <yyyy-mm-dd>", "Calendar day to inspect in the configured timezone; scans all public repositories for that day")
  .option("--since <window>", "Time window: 24h, yesterday, or ISO date")
  .option("--out <dir>", "Output directory")
  .option("--config <path>", "Config file path", "briefing.config.json")
  .option("--no-comic", "Skip comic image generation")
  .option("--send-feishu", "Send the generated briefing to a Feishu custom bot webhook")
  .option("--feishu-webhook <url>", "Feishu custom bot webhook URL")
  .option("--feishu-secret <secret>", "Feishu custom bot signature secret")
  .action(async (options) => {
    const result = await runBriefing(options);
    console.log(`Briefing generated: ${result.reportDir}`);
    console.log(`Markdown: ${result.markdownPath}`);
    console.log(`HTML: ${result.htmlPath}`);
    if (result.comicPath) console.log(`Comic: ${result.comicPath}`);
    if (result.feishu) console.log(`Feishu: HTTP ${result.feishu.status} ${result.feishu.ok ? "ok" : "failed"}`);
    for (const warning of result.warnings) {
      console.warn(`Warning: ${warning}`);
    }
  });

program
  .command("repos")
  .description("List public repositories for an organization.")
  .option("--org <org>", "GitHub organization")
  .option("--config <path>", "Config file path", "briefing.config.json")
  .action(async (options) => {
    const config = await loadConfig(options.config);
    const org = options.org ?? config.org;
    const repos = await new GitHubClient().fetchRepos(org);
    for (const repo of repos) {
      console.log(`${repo.name}\t${repo.htmlUrl}`);
    }
  });

program
  .command("send-feishu")
  .description("Send an existing generated report directory to a Feishu custom bot webhook.")
  .requiredOption("--report <dir>", "Report directory containing brief.md")
  .option("--feishu-webhook <url>", "Feishu custom bot webhook URL")
  .option("--feishu-secret <secret>", "Feishu custom bot signature secret")
  .action(async (options) => {
    const result = await sendFeishuReport(options.report, {
      webhook: options.feishuWebhook,
      secret: options.feishuSecret
    });
    console.log(`Feishu: HTTP ${result.status} ${result.ok ? "ok" : "failed"}`);
    if (!result.ok) {
      console.log(result.responseText);
      process.exitCode = 1;
    }
  });

program
  .command("schedule")
  .description("Print schedule examples for daily briefing generation.")
  .option("--print", "Print schedule help")
  .option("--org <org>", "GitHub organization", "EvoMap")
  .action((options) => {
    console.log(renderScheduleHelp(options.org));
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
