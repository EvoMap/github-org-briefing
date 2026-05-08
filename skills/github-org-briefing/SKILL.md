---
name: github-org-briefing
description: Generate GitHub organization briefings from all public repository commit activity for a specified calendar day, with EvoMap as the default example organization. Use when Codex needs to fetch public GitHub repositories for any organization, summarize every commit on a day, create Markdown/HTML briefings, generate a fixed lively comic explainer infographic report, list organization repositories, send Feishu bot summaries, or configure a daily briefing schedule.
---

# GitHub Organization Briefing

## Overview

Use the local `github-org-briefing` CLI to generate a daily or ad hoc briefing for all public repositories in any GitHub organization. Prefer `--date YYYY-MM-DD` for monitoring a full calendar day. The default config uses `EvoMap`, and the CLI writes Markdown, HTML, raw GitHub JSON, and a fixed lively comic explainer PNG into `reports/YYYY-MM-DD/`.

## Quick Start

From the project root:

```bash
npm install
npm run build
npm run dev -- run -- --org EvoMap --date 2026-05-08 --out reports
```

After install/build, these commands are available:

```bash
github-org-briefing run --org EvoMap --date 2026-05-08 --out reports
github-org-briefing repos --org EvoMap
github-org-briefing schedule --print --org EvoMap
github-org-briefing send-feishu --report reports/YYYY-MM-DD
```

`evomap-briefing` is also available as a compatibility alias.

## Workflow

1. Run `github-org-briefing repos --org <org>` when the user wants repository visibility only.
2. Run `github-org-briefing run --org <org> --date YYYY-MM-DD --out reports` for a full-day report.
3. Inspect `reports/YYYY-MM-DD/brief.md`, `brief.html`, `comic.png`, and `raw/github.json`.
4. If `OPENAI_API_KEY` is absent or image generation fails, keep the generated report; the CLI falls back to a local infographic PNG and records a warning.
5. Add `--send-feishu` when the user wants the generated summary sent to a Feishu custom bot.
6. Run `github-org-briefing send-feishu --report reports/YYYY-MM-DD` when the user wants to resend an existing report.
7. Run `github-org-briefing schedule --print --org <org>` when the user asks for recurring setup guidance.

## Environment

- `GITHUB_TOKEN` is optional and only raises rate limits for public repository reads.
- `OPENAI_API_KEY` enables OpenAI-generated visual backgrounds for the comic PNG.
- `GITHUB_BRIEFING_OUT_DIR` overrides the default output directory.
- `EVOMAP_BRIEFING_OUT_DIR` remains as a backward-compatible alias.
- `FEISHU_WEBHOOK_URL` enables Feishu custom bot delivery.
- `FEISHU_BOT_SECRET` or `FEISHU_SECRET` enables Feishu signature verification.

Never request or require private organization access for the v1 workflow. The briefing must be based on public repositories and commit metadata only, regardless of organization.

When configuring Feishu, prefer environment variables over command-line flags for secrets. Do not print or store the webhook URL or signature secret in reports.

## Fixed Comic Style

Always use the fixed lively comic explainer style in `references/comic-style.md`. The comic should be vivid and fun, but metrics and text must stay grounded in the generated commit report.

## Output Contract

When reporting results to the user, include:

- report directory
- Markdown path
- HTML path
- comic PNG path
- Feishu delivery status, if requested
- any GitHub or image-generation warnings

## References

- `references/schedule.md`: daily automation examples.
- `references/comic-style.md`: fixed comic explainer style.
