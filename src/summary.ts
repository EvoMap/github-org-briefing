import type { BriefingSummary, GitHubSnapshot, RepoSummary, Storyboard } from "./types.js";

export function buildSummary(snapshot: GitHubSnapshot, timezone: string, reportDate: string): BriefingSummary {
  const byRepo = new Map<string, RepoSummary>();
  for (const repo of snapshot.repos) {
    byRepo.set(repo.name, { repo, commits: [] });
  }

  for (const commit of snapshot.commits) {
    byRepo.get(commit.repo)?.commits.push(commit);
  }

  const summaries = [...byRepo.values()].sort((a, b) => b.commits.length - a.commits.length || a.repo.name.localeCompare(b.repo.name));
  const topRepos = summaries.filter((item) => item.commits.length > 0);

  return {
    org: snapshot.org,
    reportDate,
    timezone,
    generatedAt: snapshot.fetchedAt,
    windowLabel: snapshot.window.label,
    totalRepos: snapshot.repos.length,
    activeRepos: topRepos.length,
    totalCommits: snapshot.commits.length,
    topRepos,
    quietRepos: summaries.filter((item) => item.commits.length === 0).map((item) => item.repo),
    warnings: snapshot.warnings
  };
}

export function buildStoryboard(summary: BriefingSummary): Storyboard {
  const top = summary.topRepos.slice(0, 3);
  const panels = [
    {
      title: "Morning Standup",
      text:
        summary.totalCommits > 0
          ? `${summary.org} shipped public changes in ${summary.activeRepos} repositories.`
          : `${summary.org} had a quiet public commit day.`,
      metric: `${summary.totalCommits} commits`
    },
    {
      title: "Busy Workbenches",
      text: top.length > 0 ? top.map((repo) => `${repo.repo.name}: ${repo.commits.length}`).join(" | ") : "No public repositories moved during this calendar day.",
      metric: `${summary.activeRepos}/${summary.totalRepos} active`
    },
    {
      title: "Commit Bubbles",
      text: firstMessages(summary, 3),
      metric: "top messages"
    },
    {
      title: "Watch Desk",
      text: summary.warnings.length > 0 ? `${summary.warnings.length} fetch warning(s) need review.` : "No fetch warnings; the public sweep completed cleanly.",
      metric: summary.warnings.length > 0 ? "check warnings" : "clean fetch"
    }
  ];

  if (summary.totalCommits > 0) {
    panels.push({
      title: "Reading Trail",
      text: "Open the linked commits in the Markdown report for exact diffs and source context.",
      metric: "links included"
    });
  }

  return {
    title: `${summary.org} GitHub Briefing`,
    subtitle: `${summary.reportDate} | ${summary.windowLabel}`,
    style: "lively-comic-explainer",
    panels: panels.slice(0, 6)
  };
}

function firstMessages(summary: BriefingSummary, count: number): string {
  const messages = summary.topRepos.flatMap((repo) => repo.commits.map((commit) => `${repo.repo.name}: ${commit.message}`)).slice(0, count);
  return messages.length > 0 ? messages.join(" | ") : "No commit messages to summarize.";
}
