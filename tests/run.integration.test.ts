import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "../src/github.js";
import { runBriefing } from "../src/run.js";
import type { DateRange } from "../src/dateRange.js";

class MockClient extends GitHubClient {
  async fetchRepos() {
    return [
      {
        name: "evolver",
        fullName: "EvoMap/evolver",
        htmlUrl: "https://github.com/EvoMap/evolver",
        description: "Agent evolution runtime",
        pushedAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
        private: false
      }
    ];
  }

  async fetchCommits(_org: string, repo: string, _range: DateRange) {
    return [
      {
        repo,
        sha: "abcdef123456",
        shortSha: "abcdef1",
        author: "alice",
        date: "2026-05-08T00:00:00.000Z",
        message: "Add briefing workflow",
        url: "https://github.com/EvoMap/evolver/commit/abcdef123456"
      }
    ];
  }
}

describe("runBriefing", () => {
  let tmp: string | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (tmp) await rm(tmp, { recursive: true, force: true });
  });

  it("generates complete report files without OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    tmp = await mkdtemp(path.join(os.tmpdir(), "github-org-briefing-"));

    const result = await runBriefing({ org: "EvoMap", date: "2026-05-08", out: tmp }, new MockClient());
    const markdown = await readFile(result.markdownPath, "utf8");
    const html = await readFile(result.htmlPath, "utf8");
    const raw = await readFile(path.join(result.reportDir, "raw", "github.json"), "utf8");

    expect(markdown).toContain("Add briefing workflow");
    expect(html).toContain("comic.png");
    expect(raw).toContain("abcdef123456");
    expect(result.comicPath).toMatch(/comic\.png$/);
    expect(result.warnings.some((warning) => warning.includes("OPENAI_API_KEY"))).toBe(true);
  });
});
