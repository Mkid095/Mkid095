// Fetches public, non-forked repos for a GitHub user and writes them
// into README.md between the PROJECTS markers.
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
      // Prioritize stars, then recency
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    })
    .slice(0, MAX_PROJECTS);

  if (filtered.length === 0) {
    return "_No public repositories found yet._";
  }

  const rows = filtered.map((r) => {
    const name = r.name;
    const desc = (r.description || "No description provided.").replace(/\|/g, "-");
    const lang = r.language || "-";
    const stars = r.stargazers_count;
    const updated = new Date(r.pushed_at).toISOString().split("T")[0];
    return `| [${name}](${r.html_url}) | ${desc} | ${lang} | ${stars} | ${updated} |`;
  });

  return [
    "| Project | Description | Language | Stars | Last Updated |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

async function main() {
  const repos = await fetchRepos(USERNAME);
  const table = formatRepos(repos);

  const readme = fs.readFileSync(README_PATH, "utf8");
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("PROJECTS markers not found in README.md");
  }

  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);

  const updated = `${before}\n\n${table}\n\n${after}`;
  fs.writeFileSync(README_PATH, updated);
  console.log(`README.md updated with ${Math.min(repos.length, MAX_PROJECTS)} projects.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
