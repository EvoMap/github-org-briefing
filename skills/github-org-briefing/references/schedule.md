# Schedule Reference

Default briefing cadence: every day at 09:00 Asia/Shanghai.

Use the same CLI command for manual and scheduled runs:

```bash
github-org-briefing run --org EvoMap --date 2026-05-08 --out reports
```

Windows Task Scheduler example:

```powershell
schtasks /Create /SC DAILY /TN GitHubOrgBriefing-EvoMap /ST 09:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -Command cd E:\\EvoMap_projects\\evomap-repo-briefing; npm run dev -- run -- --org EvoMap --since yesterday --out reports"
```

Codex automation prompt:

```text
Generate the requested GitHub organization briefing for the requested calendar day by running github-org-briefing run --org <org> --date YYYY-MM-DD --out reports. If the task is scheduled and no date is supplied, use --since yesterday. If Feishu delivery is configured, add --send-feishu. Report the generated Markdown, HTML, comic PNG, Feishu status, and any warnings.
```
