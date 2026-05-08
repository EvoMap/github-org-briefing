export function renderScheduleHelp(org = "EvoMap", command = `github-org-briefing run --org ${org} --since yesterday --out reports`): string {
  return [
    "Default schedule: every day at 09:00 Asia/Shanghai.",
    "",
    "Codex automation prompt:",
    `Generate the ${org} GitHub organization briefing by running: ${command}`,
    "",
    "Windows Task Scheduler example:",
    `schtasks /Create /SC DAILY /TN GitHubOrgBriefing-${org} /ST 09:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -Command cd E:\\\\EvoMap_projects\\\\evomap-repo-briefing; npm run dev -- run -- --org ${org} --since yesterday --out reports"`,
    "",
    "Cron-style reference:",
    `0 9 * * * github-org-briefing run --org ${org} --since yesterday --out reports`
  ].join("\n");
}
