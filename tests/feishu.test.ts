import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendFeishuReport, signFeishu } from "../src/feishu.js";

describe("feishu", () => {
  let tmp: string | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (tmp) await rm(tmp, { recursive: true, force: true });
  });

  it("creates deterministic signatures", () => {
    expect(signFeishu("1700000000", "SECabc")).toBe(signFeishu("1700000000", "SECabc"));
  });

  it("sends an existing report with webhook and secret", async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "github-org-briefing-feishu-"));
    const report = path.join(tmp, "2026-05-08");
    await mkdir(report, { recursive: true });
    await writeFile(
      path.join(report, "brief.md"),
      [
        "# Demo GitHub Briefing",
        "",
        "## Overview",
        "- Public repositories checked: 1",
        "- Active repositories: 1",
        "## Repository Highlights",
        "### [demo](https://github.com/example/demo)",
        "- [abcdef1](https://github.com/example/demo/commit/abcdef1) Add feature - alice, 2026-05-08T00:00:00Z",
        "## Risks / Watch Notes",
        "- No fetch warnings.",
        "## Link Index"
      ].join("\n"),
      "utf8"
    );

    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.msg_type).toBe("text");
      expect(body.timestamp).toBeDefined();
      expect(body.sign).toBeDefined();
      expect(JSON.stringify(body)).toContain("Demo GitHub Briefing");
      return new Response('{"StatusCode":0,"msg":"success"}', { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendFeishuReport(report, {
      webhook: "https://open.feishu.cn/open-apis/bot/v2/hook/test",
      secret: "SECabc",
      fetchImpl
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
