// Generates pinned-project markdown using github-readme-stats pin API.
// Writes into README.md between PROJECTS markers.
//
// Usage: GITHUB_USERNAME=Mkid095 node scripts/update-projects.js

const fs = require("fs");
const path = require("path");

const USERNAME = process.env.GITHUB_USERNAME || "Mkid095";
const README_PATH = path.join(__dirname, "..", "README.md");
const START_MARKER = "<!-- PROJECTS:START -->";
const END_MARKER = "<!-- PROJECTS:END -->";
const MAX_PROJECTS = 6;

async function fetchRepos(username) {
  const headers = { "User-Agent": "readme-updater" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&type=owner`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function formatRepos(repos) {
  const filtered = repos
    .filter((r) => !r.fork && !r.archived && !r.private)
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    })
    .slice(0, MAX_PROJECTS);

  if (filtered.length === 0) {
    return "_No public repositories found yet._";
  }

  // Use github-readme-stats pin API — renders as proper SVG cards in GitHub markdown
  const rows = filtered.map(
    (r) =>
      `[<img align="center" src="https://github-readme-stats.vercel.app/api/pin/?username=${username}&repo=${r.name}&show_owner=false&theme=default" width="492" />](${r.html_url})`
  );

  return rows.join("\n");
}

async function main() {
  const repos = await fetchRepos(USERNAME);
  const content = formatRepos(repos);

  const readme = fs.readFileSync(README_PATH, "utf8");
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("PROJECTS markers not found in README.md");
  }

  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);

  const updated = `${before}\n\n${content}\n\n${after}`;
  fs.writeFileSync(README_PATH, updated);
  console.log(`README.md updated with ${Math.min(repos.length, MAX_PROJECTS)} project cards.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
