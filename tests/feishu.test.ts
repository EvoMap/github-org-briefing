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
    await mkdir(path.join(report, "raw"), { recursive: true });
    await writeFile(
      path.join(report, "raw", "github.json"),
      JSON.stringify({
        org: "Demo",
        fetchedAt: "2026-05-08T00:00:00.000Z",
        window: {
          since: "2026-05-07T16:00:00.000Z",
          until: "2026-05-08T16:00:00.000Z",
          label: "2026-05-08 full day (Asia/Shanghai)"
        },
        repos: [
          {
            name: "demo",
            fullName: "example/demo",
            htmlUrl: "https://github.com/example/demo",
            description: null,
            pushedAt: "2026-05-08T00:00:00.000Z",
            updatedAt: "2026-05-08T00:00:00.000Z",
            private: false
          }
        ],
        commits: [
          {
            repo: "demo",
            sha: "abcdef123456",
            shortSha: "abcdef1",
            author: "alice",
            date: "2026-05-08T00:00:00.000Z",
            message: "feat: add useful briefing",
            url: "https://github.com/example/demo/commit/abcdef1"
          }
        ],
        warnings: []
      }),
      "utf8"
    );

    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.msg_type).toBe("post");
      expect(body.timestamp).toBeDefined();
      expect(body.sign).toBeDefined();
      expect(JSON.stringify(body)).toContain("日报结论");
      expect(JSON.stringify(body)).toContain("feat 1");
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
