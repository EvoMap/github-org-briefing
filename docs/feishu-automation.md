# Feishu Bot Automation Guide

This guide explains how to send GitHub organization daily briefing reports to a Feishu group and connect the command to an automation.

## 1. Create a Feishu Custom Bot

1. Open the Feishu group that should receive the briefing.
2. Open group settings.
3. Open group bots.
4. Add a custom bot.
5. Copy the webhook URL. It should look like:

```text
https://open.feishu.cn/open-apis/bot/v2/hook/<your-hook-id>
```

Recommended security settings:

- Enable signature verification and copy the `SEC...` secret.
- Avoid storing the webhook or secret in source code, docs, screenshots, or reports.
- If you enable keyword filtering, make sure the bot allows messages containing `GitHub Briefing`.

## 2. Configure Local Secrets

For the current PowerShell session:

```powershell
$env:FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..."
$env:FEISHU_BOT_SECRET="SEC..."
```

Optional:

```powershell
$env:GITHUB_TOKEN="github token for higher public API limits"
$env:OPENAI_API_KEY="OpenAI key for generated comic backgrounds"
$env:FEISHU_APP_ID="cli_xxx"
$env:FEISHU_APP_SECRET="app secret for uploading comic.png"
```

For persistent Windows user environment variables:

```powershell
[Environment]::SetEnvironmentVariable("FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/...", "User")
[Environment]::SetEnvironmentVariable("FEISHU_BOT_SECRET", "SEC...", "User")
```

Open a new terminal after setting persistent environment variables.

## 3. Test Report Generation

From the project root:

```powershell
cd E:\EvoMap_projects\evomap-repo-briefing
npm install
npm run build
npm run dev -- run -- --org EvoMap --date 2026-05-08 --out reports
```

Expected files:

```text
reports/YYYY-MM-DD/brief.md
reports/YYYY-MM-DD/brief.html
reports/YYYY-MM-DD/comic.png
reports/YYYY-MM-DD/comic.storyboard.json
reports/YYYY-MM-DD/raw/github.json
```

## 4. Test Feishu Delivery

Generate and send one report:

```powershell
npm run dev -- run -- --org EvoMap --date 2026-05-08 --out reports --send-feishu
```

Resend an existing report:

```powershell
npm run dev -- send-feishu -- --report reports\2026-05-08
```

The webhook message sends a rich Feishu post with:

- daily conclusion
- repository and commit counts
- commit type distribution
- top contributors
- active repositories
- commit links
- local artifact paths

To display the generated `comic.png` directly in Feishu, configure a Feishu app and set:

```powershell
$env:FEISHU_APP_ID="cli_xxx"
$env:FEISHU_APP_SECRET="..."
```

The CLI will then:

1. request a tenant access token,
2. upload `reports/YYYY-MM-DD/comic.png`,
3. send the uploaded `image_key` to the same custom bot webhook.

Without `FEISHU_APP_ID` and `FEISHU_APP_SECRET`, Feishu can only receive the rich text post and local image path. A local Windows path cannot render as an image inside Feishu for other users.

## 5. Connect to Codex Automation

Use this task prompt for a daily automation:

```text
Generate the EvoMap GitHub organization briefing for yesterday and send it to Feishu.
Run from E:\EvoMap_projects\evomap-repo-briefing:
npm run dev -- run -- --org EvoMap --since yesterday --out reports --send-feishu
Report the generated Markdown, HTML, comic PNG, Feishu status, and warnings.
```

Recommended schedule:

```text
Every day at 09:00 Asia/Shanghai
```

Required environment variables for the automation runtime:

```text
FEISHU_WEBHOOK_URL
FEISHU_BOT_SECRET
```

Optional:

```text
GITHUB_TOKEN
OPENAI_API_KEY
FEISHU_APP_ID
FEISHU_APP_SECRET
```

## 6. Connect to Windows Task Scheduler

Create a daily task at 09:00:

```powershell
schtasks /Create /SC DAILY /TN GitHubOrgBriefing-EvoMap /ST 09:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -Command cd E:\EvoMap_projects\evomap-repo-briefing; npm run dev -- run -- --org EvoMap --since yesterday --out reports --send-feishu"
```

Run it manually:

```powershell
schtasks /Run /TN GitHubOrgBriefing-EvoMap
```

View task details:

```powershell
schtasks /Query /TN GitHubOrgBriefing-EvoMap /V /FO LIST
```

Delete the task:

```powershell
schtasks /Delete /TN GitHubOrgBriefing-EvoMap
```

## 7. Common Problems

- `FEISHU_WEBHOOK_URL is not set`: set the webhook environment variable in the same terminal or as a persistent user environment variable.
- `invalid signature`: confirm `FEISHU_BOT_SECRET`, system clock, and that the copied secret has no extra spaces.
- Message blocked by keyword security: add `GitHub Briefing` as an allowed keyword or disable keyword filtering.
- GitHub rate limit: set `GITHUB_TOKEN`.
- Comic uses local fallback: set `OPENAI_API_KEY` if generated comic backgrounds are required.
- Comic path appears but image does not display: set `FEISHU_APP_ID` and `FEISHU_APP_SECRET` so the CLI can upload `comic.png` to Feishu.

## 8. Secret Safety Checklist

Before committing or publishing:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!reports/**' "(open-apis/bot/v2/hook/[A-Za-z0-9_-]+|SEC[A-Za-z0-9_-]{6,}|github_pat_|ghp_|sk-)"
git status --short
```

Only placeholder examples should appear in docs or tests. Real webhook URLs, bot secrets, GitHub tokens, and OpenAI keys must stay in local environment variables or a secret manager.
