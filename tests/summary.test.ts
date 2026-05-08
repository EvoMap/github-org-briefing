import { describe, expect, it } from "vitest";
import { buildStoryboard, buildSummary } from "../src/summary.js";
import type { GitHubSnapshot } from "../src/types.js";

describe("summary", () => {
  it("groups commits by repository and builds panels", () => {
    const snapshot: GitHubSnapshot = {
      org: "EvoMap",
      fetchedAt: "2026-05-08T01:00:00.000Z",
      window: {
        since: "2026-05-07T01:00:00.000Z",
        until: "2026-05-08T01:00:00.000Z",
        label: "past 24 hours"
      },
      repos: [
        {
          name: "evolver",
          fullName: "EvoMap/evolver",
          htmlUrl: "https://github.com/EvoMap/evolver",
          description: "Agent evolution runtime",
          pushedAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
          private: false
        }
      ],
      commits: [
        {
          repo: "evolver",
          sha: "abcdef123456",
          shortSha: "abcdef1",
          author: "alice",
          date: "2026-05-08T00:00:00.000Z",
          message: "Add briefing workflow",
          url: "https://github.com/EvoMap/evolver/commit/abcdef123456"
        }
      ],
      warnings: []
    };

    const summary = buildSummary(snapshot, "Asia/Shanghai", "2026-05-08");
    const storyboard = buildStoryboard(summary);

    expect(summary.totalCommits).toBe(1);
    expect(summary.topRepos[0]?.repo.name).toBe("evolver");
    expect(storyboard.panels.length).toBeGreaterThanOrEqual(4);
    expect(storyboard.style).toBe("lively-comic-explainer");
    expect(storyboard.panels[0]?.metric).toBe("1 commits");
  });
});
