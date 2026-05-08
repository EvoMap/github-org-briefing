import type { BriefingSummary } from "../types.js";

export function renderMarkdown(summary: BriefingSummary): string {
  const lines: string[] = [
    `# ${summary.org} GitHub Briefing - ${summary.reportDate}`,
    "",
    `Generated at ${summary.generatedAt} (${summary.timezone}). Window: ${summary.windowLabel}.`,
    "",
    "## Overview",
    "",
    `- Public repositories checked: ${summary.totalRepos}`,
    `- Active repositories: ${summary.activeRepos}`,
    `- Public commits: ${summary.totalCommits}`,
    ""
  ];

  if (summary.totalCommits === 0) {
    lines.push(`No public commits were found for ${summary.org} in the selected window.`, "");
  }

  lines.push("## Repository Highlights", "");
  if (summary.topRepos.length === 0) {
    lines.push("- No repositories had public commits in this window.", "");
  } else {
    for (const repo of summary.topRepos) {
      lines.push(`### [${repo.repo.name}](${repo.repo.htmlUrl})`, "");
      if (repo.repo.description) {
        lines.push(`${repo.repo.description}`, "");
      }
      lines.push(`Commits: ${repo.commits.length}`, "");
      for (const commit of repo.commits) {
        lines.push(`- [${commit.shortSha}](${commit.url}) ${commit.message} - ${commit.author}, ${commit.date}`);
      }
      lines.push("");
    }
  }

  lines.push("## Risks / Watch Notes", "");
  if (summary.warnings.length === 0) {
    lines.push("- No fetch warnings.", "");
  } else {
    for (const warning of summary.warnings) {
      lines.push(`- ${warning.scope}: ${warning.message}`);
    }
    lines.push("");
  }

  lines.push("## Link Index", "");
  for (const repo of summary.topRepos) {
    lines.push(`- [${repo.repo.name}](${repo.repo.htmlUrl})`);
  }
  if (summary.topRepos.length === 0) {
    lines.push("- No active repository links for this report.");
  }
  lines.push("");

  return `${lines.join("\n").trimEnd()}\n`;
}
