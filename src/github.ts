import type { BriefingConfig, CommitInfo, FetchWarning, GitHubSnapshot, RepoInfo } from "./types.js";
import { toIso, type DateRange } from "./dateRange.js";

type GitHubRepoResponse = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  pushed_at: string | null;
  updated_at: string;
  private: boolean;
};

type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit: {
    author?: {
      name?: string;
      date?: string;
    };
    committer?: {
      date?: string;
    };
    message: string;
  };
  author?: {
    login?: string;
  } | null;
};

export class GitHubClient {
  constructor(
    private readonly token = process.env.GITHUB_TOKEN,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchRepos(org: string): Promise<RepoInfo[]> {
    const repos = await this.paginate<GitHubRepoResponse>(`https://api.github.com/orgs/${org}/repos?type=public&per_page=100&sort=pushed`);
    return repos
      .filter((repo) => !repo.private)
      .map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        pushedAt: repo.pushed_at,
        updatedAt: repo.updated_at,
        private: repo.private
      }));
  }

  async fetchCommits(org: string, repo: string, range: DateRange): Promise<CommitInfo[]> {
    const url = new URL(`https://api.github.com/repos/${org}/${repo}/commits`);
    url.searchParams.set("since", toIso(range.since));
    url.searchParams.set("until", toIso(range.until));
    url.searchParams.set("per_page", "100");

    const commits = await this.paginate<GitHubCommitResponse>(url.toString());
    return commits.map((commit) => {
      const message = commit.commit.message.split("\n")[0]?.trim() || "(empty commit message)";
      const date = commit.commit.author?.date ?? commit.commit.committer?.date ?? range.until.toISOString();
      const author = commit.author?.login ?? commit.commit.author?.name ?? "unknown";
      return {
        repo,
        sha: commit.sha,
        shortSha: commit.sha.slice(0, 7),
        author,
        date,
        message,
        url: commit.html_url
      };
    });
  }

  private async paginate<T>(firstUrl: string): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | null = firstUrl;

    while (nextUrl) {
      const response = await this.fetchImpl(nextUrl, {
        headers: this.headers()
      });

      if (!response.ok) {
        const text = await response.text();
        const limit = response.headers.get("x-ratelimit-remaining") === "0" ? " GitHub API rate limit may be exhausted." : "";
        throw new Error(`GitHub API ${response.status} for ${nextUrl}.${limit} ${text}`.trim());
      }

      items.push(...((await response.json()) as T[]));
      nextUrl = parseNextLink(response.headers.get("link"));
    }

    return items;
  }

  private headers(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-org-briefing",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }
}

export async function collectGitHubSnapshot(
  config: BriefingConfig,
  range: DateRange,
  client = new GitHubClient()
): Promise<GitHubSnapshot> {
  const warnings: FetchWarning[] = [];
  let repos: RepoInfo[] = [];

  try {
    repos = await client.fetchRepos(config.org);
  } catch (error) {
    throw new Error(`Unable to fetch repositories for ${config.org}: ${errorMessage(error)}`);
  }

  const include = new Set(config.includeRepos);
  const exclude = new Set(config.excludeRepos);
  const filteredRepos = repos.filter((repo) => {
    if (include.size > 0 && !include.has(repo.name)) return false;
    if (exclude.has(repo.name)) return false;
    return true;
  });

  const commits: CommitInfo[] = [];
  for (const repo of filteredRepos) {
    try {
      commits.push(...(await client.fetchCommits(config.org, repo.name, range)));
    } catch (error) {
      warnings.push({
        scope: repo.name,
        message: errorMessage(error)
      });
    }
  }

  return {
    org: config.org,
    fetchedAt: new Date().toISOString(),
    window: {
      since: range.since.toISOString(),
      until: range.until.toISOString(),
      label: range.label
    },
    repos: filteredRepos,
    commits: commits.sort((a, b) => b.date.localeCompare(a.date)),
    warnings
  };
}

function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  const next = link.split(",").find((part) => part.includes('rel="next"'));
  return next?.match(/<([^>]+)>/)?.[1] ?? null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
