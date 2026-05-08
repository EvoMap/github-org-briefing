export type BriefingConfig = {
  org: string;
  timezone: string;
  window: string;
  comicStyle: "infographic-comic";
  includeRepos: string[];
  excludeRepos: string[];
};

export type RepoInfo = {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  pushedAt: string | null;
  updatedAt: string;
  private: boolean;
};

export type CommitInfo = {
  repo: string;
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
  url: string;
};

export type FetchWarning = {
  scope: string;
  message: string;
};

export type GitHubSnapshot = {
  org: string;
  fetchedAt: string;
  window: {
    since: string;
    until: string;
    label: string;
  };
  repos: RepoInfo[];
  commits: CommitInfo[];
  warnings: FetchWarning[];
};

export type RepoSummary = {
  repo: RepoInfo;
  commits: CommitInfo[];
};

export type BriefingSummary = {
  org: string;
  reportDate: string;
  timezone: string;
  generatedAt: string;
  windowLabel: string;
  totalRepos: number;
  activeRepos: number;
  totalCommits: number;
  topRepos: RepoSummary[];
  quietRepos: RepoInfo[];
  warnings: FetchWarning[];
};

export type StoryboardPanel = {
  title: string;
  text: string;
  metric: string;
};

export type Storyboard = {
  title: string;
  subtitle: string;
  style: string;
  panels: StoryboardPanel[];
};

export type RunOptions = {
  org?: string;
  date?: string;
  since?: string;
  out?: string;
  config?: string;
  noComic?: boolean;
  sendFeishu?: boolean;
  feishuWebhook?: string;
  feishuSecret?: string;
};
