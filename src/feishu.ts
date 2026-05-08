import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CommitInfo, GitHubSnapshot } from "./types.js";

export type FeishuSendOptions = {
  webhook?: string;
  secret?: string;
  fetchImpl?: typeof fetch;
};

export type FeishuSendResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

type FeishuElement =
  | { tag: "text"; text: string }
  | { tag: "a"; text: string; href: string };

export async function sendFeishuReport(reportDir: string, options: FeishuSendOptions = {}): Promise<FeishuSendResult> {
  const webhook = resolveWebhook(options);
  const snapshot = await readSnapshot(reportDir);
  const post = buildFeishuPost(snapshot, reportDir);
  const postResult = await sendFeishuPayload(webhook, { msg_type: "post", content: { post } }, options);

  const imageResult = await trySendComicImage(webhook, reportDir, options);
  if (!imageResult) {
    return postResult;
  }

  return {
    ok: postResult.ok && imageResult.ok,
    status: imageResult.status,
    responseText: `post=${postResult.responseText}\nimage=${imageResult.responseText}`
  };
}

export async function sendFeishuText(text: string, options: FeishuSendOptions = {}): Promise<FeishuSendResult> {
  const webhook = resolveWebhook(options);
  return sendFeishuPayload(
    webhook,
    {
      msg_type: "text",
      content: { text }
    },
    options
  );
}

export function signFeishu(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  return createHmac("sha256", stringToSign).update("").digest("base64");
}

function buildFeishuPost(snapshot: GitHubSnapshot, reportDir: string): Record<string, unknown> {
  const repoCounts = countBy(snapshot.commits, (commit) => commit.repo);
  const authorCounts = countBy(snapshot.commits, (commit) => commit.author);
  const typeCounts = countBy(snapshot.commits, (commit) => commitType(commit.message));
  const activeRepos = [...repoCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const busiest = activeRepos[0];
  const commits = snapshot.commits.slice(0, 20);

  const conclusion =
    snapshot.commits.length === 0
      ? `这一天 ${snapshot.org} 的公开仓库没有提交，整体是安静日。`
      : `这一天 ${snapshot.org} 有 ${snapshot.commits.length} 条公开提交，覆盖 ${activeRepos.length}/${snapshot.repos.length} 个仓库，最活跃仓库是 ${busiest?.[0] ?? "N/A"}。`;

  const content: FeishuElement[][] = [
    textLine(`日报结论：${conclusion}`),
    textLine(`统计：公开仓库 ${snapshot.repos.length} 个，活跃仓库 ${activeRepos.length} 个，提交 ${snapshot.commits.length} 条。`),
    textLine(`类型分布：${formatPairs(topTypes) || "无提交类型"}`),
    textLine(`贡献者：${formatPairs(topAuthors) || "无提交者"}`),
    textLine("")
  ];

  if (activeRepos.length > 0) {
    content.push(textLine("重点仓库："));
    for (const [repo, count] of activeRepos.slice(0, 8)) {
      const repoInfo = snapshot.repos.find((item) => item.name === repo);
      content.push(linkLine(`- ${repo}: ${count} 条提交`, repoInfo?.htmlUrl));
    }
    content.push(textLine(""));
  }

  content.push(textLine("提交明细："));
  if (commits.length === 0) {
    content.push(textLine("- 无提交。"));
  } else {
    for (const commit of commits) {
      content.push([
        { tag: "text", text: `- ${commit.repo} / ${commit.shortSha}: ${commit.message} (${commit.author}) ` },
        { tag: "a", text: "查看", href: commit.url }
      ]);
    }
    if (snapshot.commits.length > commits.length) {
      content.push(textLine(`- 还有 ${snapshot.commits.length - commits.length} 条提交，请查看本地 Markdown 完整记录。`));
    }
  }

  if (snapshot.warnings.length > 0) {
    content.push(textLine(""));
    content.push(textLine(`注意事项：${snapshot.warnings.length} 条抓取告警，详见 brief.md。`));
  }

  content.push(textLine(""));
  content.push(textLine(`本地文件：${path.join(reportDir, "brief.html")}`));
  content.push(textLine(`漫画图：${path.join(reportDir, "comic.png")}`));

  return {
    zh_cn: {
      title: `${snapshot.org} GitHub 公开仓库日报 | ${snapshot.window.label}`,
      content
    }
  };
}

async function trySendComicImage(webhook: string, reportDir: string, options: FeishuSendOptions): Promise<FeishuSendResult | null> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    return null;
  }

  const token = await getTenantAccessToken(appId, appSecret, options.fetchImpl ?? fetch);
  const imageKey = await uploadFeishuImage(path.join(reportDir, "comic.png"), token, options.fetchImpl ?? fetch);
  return sendFeishuPayload(webhook, { msg_type: "image", content: { image_key: imageKey } }, options);
}

async function getTenantAccessToken(appId: string, appSecret: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  const data = (await response.json()) as { code?: number; msg?: string; tenant_access_token?: string };
  if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Unable to get Feishu tenant_access_token: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

async function uploadFeishuImage(imagePath: string, token: string, fetchImpl: typeof fetch): Promise<string> {
  const bytes = await readFile(imagePath);
  const form = new FormData();
  form.append("image_type", "message");
  form.append("image", new Blob([bytes], { type: "image/png" }), path.basename(imagePath));

  const response = await fetchImpl("https://open.feishu.cn/open-apis/im/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });
  const data = (await response.json()) as { code?: number; msg?: string; data?: { image_key?: string } };
  if (!response.ok || data.code !== 0 || !data.data?.image_key) {
    throw new Error(`Unable to upload Feishu image: ${JSON.stringify(data)}`);
  }
  return data.data.image_key;
}

async function readSnapshot(reportDir: string): Promise<GitHubSnapshot> {
  const raw = await readFile(path.join(reportDir, "raw", "github.json"), "utf8");
  return JSON.parse(raw) as GitHubSnapshot;
}

async function sendFeishuPayload(webhook: string, payload: Record<string, unknown>, options: FeishuSendOptions): Promise<FeishuSendResult> {
  const secret = options.secret ?? process.env.FEISHU_BOT_SECRET ?? process.env.FEISHU_SECRET;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body: Record<string, unknown> = { ...payload };

  if (secret) {
    body.timestamp = timestamp;
    body.sign = signFeishu(timestamp, secret);
  }

  const response = await (options.fetchImpl ?? fetch)(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  return {
    ok: response.ok && !responseText.includes('"code":190') && !responseText.includes('"code":9499'),
    status: response.status,
    responseText
  };
}

function resolveWebhook(options: FeishuSendOptions): string {
  const webhook = options.webhook ?? process.env.FEISHU_WEBHOOK_URL;
  if (!webhook) {
    throw new Error("FEISHU_WEBHOOK_URL is not set. Pass --feishu-webhook or set the environment variable.");
  }
  return webhook;
}

function textLine(text: string): FeishuElement[] {
  return [{ tag: "text", text }];
}

function linkLine(text: string, href?: string): FeishuElement[] {
  if (!href) return textLine(text);
  return [{ tag: "a", text, href }];
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function formatPairs(pairs: Array<[string, number]>): string {
  return pairs.map(([name, count]) => `${name} ${count}`).join("，");
}

function commitType(message: string): string {
  const match = message.match(/^([a-zA-Z]+)(\(.+?\))?:/);
  return match?.[1] ?? "other";
}
