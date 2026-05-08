import { describe, expect, it } from "vitest";
import { renderHtml } from "../src/render/html.js";
import { renderMarkdown } from "../src/render/markdown.js";
import type { BriefingSummary } from "../src/types.js";

const emptySummary: BriefingSummary = {
  org: "EvoMap",
  reportDate: "2026-05-08",
  timezone: "Asia/Shanghai",
  generatedAt: "2026-05-08T01:00:00.000Z",
  windowLabel: "past 24 hours",
  totalRepos: 2,
  activeRepos: 0,
  totalCommits: 0,
  topRepos: [],
  quietRepos: [],
  warnings: []
};

describe("renderers", () => {
  it("renders empty commit reports clearly", () => {
    const markdown = renderMarkdown(emptySummary);
    const html = renderHtml(emptySummary);

    expect(markdown).toContain("No public commits were found");
    expect(html).toContain("No public commits were found");
  });
});
