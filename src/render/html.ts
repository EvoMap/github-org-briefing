import type { BriefingSummary } from "../types.js";

export function renderHtml(summary: BriefingSummary, markdownPath = "brief.md", comicPath = "comic.png"): string {
  const repoSections =
    summary.topRepos.length > 0
      ? summary.topRepos
          .map(
            (repo) => `
      <section class="repo">
        <h2><a href="${escapeAttr(repo.repo.htmlUrl)}">${escapeHtml(repo.repo.name)}</a></h2>
        ${repo.repo.description ? `<p>${escapeHtml(repo.repo.description)}</p>` : ""}
        <p class="metric">${repo.commits.length} commit(s)</p>
        <ul>
          ${repo.commits
            .slice(0, 10)
            .map(
              (commit) =>
                `<li><a href="${escapeAttr(commit.url)}">${escapeHtml(commit.shortSha)}</a> ${escapeHtml(commit.message)} <span>${escapeHtml(commit.author)} | ${escapeHtml(commit.date)}</span></li>`
            )
            .join("\n")}
        </ul>
      </section>`
          )
          .join("\n")
      : `<section class="repo"><p>No public commits were found for ${escapeHtml(summary.org)} in the selected window.</p></section>`;

  const warnings =
    summary.warnings.length > 0
      ? summary.warnings.map((warning) => `<li>${escapeHtml(warning.scope)}: ${escapeHtml(warning.message)}</li>`).join("\n")
      : "<li>No fetch warnings.</li>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(summary.org)} GitHub Briefing - ${escapeHtml(summary.reportDate)}</title>
  <style>
    :root { color-scheme: light; --ink: #17202a; --muted: #5d6d7e; --line: #d7dbdd; --accent: #1f8a70; --warm: #f6c85f; }
    body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; color: var(--ink); background: #f7f8f3; line-height: 1.55; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 56px; }
    header { border-bottom: 3px solid var(--ink); padding-bottom: 20px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    h2 { margin-top: 0; }
    a { color: #0b6bcb; text-decoration-thickness: 1px; }
    .meta { color: var(--muted); margin: 0; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 24px 0; }
    .stat { border: 1px solid var(--line); background: white; border-radius: 8px; padding: 14px; }
    .stat strong { display: block; font-size: 28px; }
    .comic { width: 100%; max-width: 720px; display: block; margin: 24px 0; border: 1px solid var(--line); }
    .repo { border-top: 1px solid var(--line); padding: 22px 0; }
    .metric { font-weight: 700; color: var(--accent); }
    li { margin: 8px 0; }
    li span { color: var(--muted); font-size: 0.92em; }
    .links { margin-top: 24px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(summary.org)} GitHub Briefing</h1>
      <p class="meta">${escapeHtml(summary.reportDate)} | ${escapeHtml(summary.windowLabel)} | generated ${escapeHtml(summary.generatedAt)}</p>
    </header>
    <section class="stats">
      <div class="stat"><strong>${summary.totalRepos}</strong>repos checked</div>
      <div class="stat"><strong>${summary.activeRepos}</strong>active repos</div>
      <div class="stat"><strong>${summary.totalCommits}</strong>commits</div>
    </section>
    <img class="comic" src="${escapeAttr(comicPath)}" alt="Comic infographic briefing">
    ${repoSections}
    <section class="repo">
      <h2>Risks / Watch Notes</h2>
      <ul>${warnings}</ul>
    </section>
    <p class="links"><a href="${escapeAttr(markdownPath)}">Open Markdown report</a></p>
  </main>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
