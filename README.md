# GitHub Org Briefing

Generate Markdown, HTML, and comic-style infographic briefings for public activity in any GitHub organization. The default config uses `EvoMap`, but every command accepts `--org`.

## Quick Start

```powershell
npm install
npm run build
npm run dev -- run -- --org EvoMap --date 2026-05-08 --out reports
```

Optional environment variables:

- `GITHUB_TOKEN`: raises GitHub API limits for public repository reads.
- `OPENAI_API_KEY`: enables OpenAI-generated comic background art.
- `GITHUB_BRIEFING_OUT_DIR`: default output directory when `--out` is omitted.
- `EVOMAP_BRIEFING_OUT_DIR`: backward-compatible alias for older EvoMap-only usage.

## CLI

```powershell
github-org-briefing run --org EvoMap --date 2026-05-08 --out reports
github-org-briefing repos --org EvoMap
github-org-briefing schedule --print --org EvoMap
```

`evomap-briefing` remains available as a compatibility alias for the same CLI.

## Feishu Bot Delivery

Create a Feishu custom bot in a group, copy its webhook URL, and optionally enable signature verification.

```powershell
$env:FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..."
$env:FEISHU_BOT_SECRET="SEC..."

npm run dev -- run -- --org EvoMap --date 2026-05-08 --out reports --send-feishu
npm run dev -- send-feishu -- --report reports/2026-05-08
```

You can also pass `--feishu-webhook` and `--feishu-secret` directly. Prefer environment variables so secrets do not land in shell history.

For the full setup and automation guide, see [docs/feishu-automation.md](docs/feishu-automation.md).

Outputs are written to `reports/YYYY-MM-DD/`:

- `brief.md`
- `brief.html`
- `comic.png`
- `comic.storyboard.json`
- `raw/github.json`

The preferred inspection mode is `--date YYYY-MM-DD`: it covers that full calendar day in the configured timezone and scans all public repositories for all commits returned by GitHub pagination. The comic renderer always produces a local PNG in a fixed lively comic explainer style. If `OPENAI_API_KEY` is set, it uses OpenAI image generation as a visual base and overlays deterministic report text. If image generation fails, the briefing still completes with a local comic infographic PNG and a warning.
