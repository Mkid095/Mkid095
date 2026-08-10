// Fetches public repos and monthly commit count for a GitHub user.
// Writes repo cards into README.md between PROJECTS markers,
// and commit stats between COMMITS markers.
//
// Usage: GITHUB_USERNAME=Mkid095 node scripts/update-projects.js

const fs = require("fs");
const path = require("path");

const USERNAME = process.env.GITHUB_USERNAME || "Mkid095";
const README_PATH = path.join(__dirname, "..", "README.md");
const PROJECTS_START = "<!-- PROJECTS:START -->";
const PROJECTS_END = "<!-- PROJECTS:END -->";
const COMMITS_START = "<!-- COMMITS:START -->";
const COMMITS_END = "<!-- COMMITS:END -->";
const MAX_PROJECTS = 6;

// Solid language colors
const LANG_COLORS = {
  TypeScript: "3178c6",
  JavaScript: "f1e05a",
  Python: "3572A5",
  Java: "b07219",
  Go: "00ADD8",
  Rust: "dea584",
  Ruby: "701516",
  PHP: "4F5D95",
  "C++": "f34b7d",
  C: "555555",
  "C#": "178600",
  Swift: "F05138",
  Kotlin: "A97BFF",
  Dart: "00B4AB",
  Shell: "89e051",
  HTML: "e34c26",
  CSS: "563d7c",
  Vue: "41b883",
  Svelte: "ff3e00",
};

function getLangColor(lang) {
  return LANG_COLORS[lang] || "8b949e";
}

// Fetch all pages of public events for a user and count commits this month
async function fetchMonthlyCommits(username) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const headers = { "User-Agent": "readme-updater" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let page = 1;
  let totalCommits = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://api.github.com/users/${username}/events?per_page=100&page=${page}`,
      { headers }
    );

    if (!res.ok) {
      // If we hit a 403 or 404, just stop gracefully
      break;
    }

    const events = await res.json();
    if (!Array.isArray(events) || events.length === 0) {
      break;
    }

    for (const event of events) {
      const eventDate = new Date(event.created_at);
      if (
        event.type === "PushEvent" &&
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      ) {
        totalCommits += (event.payload?.commits || []).length;
      }
    }

    hasMore = events.length === 100;
    page++;
  }

  return totalCommits;
}

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

function truncate(str, maxLen = 90) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str;
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
    return '<p align="center"><em>No public repositories found yet.</em></p>';
  }

  const cards = filtered.map((r) => {
    const name = r.name;
    const desc = truncate(r.description || "No description provided.");
    const lang = r.language || null;
    const stars = r.stargazers_count;
    const forks = r.forks_count;
    const url = r.html_url;
    const color = lang ? getLangColor(lang) : "8b949e";
    const updated = new Date(r.pushed_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `\
<div class="project-card">
  <div class="project-card-header">
    <a class="project-name" href="${url}" target="_blank">
      <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right:6px">
        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-1a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072-1.072A1 1 0 0 0 12 6h-1v2h-1a1 1 0 0 0-.714-1.7.75.75 0 0 1 1.072-1.072A1 1 0 0 0 10.25 4h-.5v2H6.5a.75.75 0 0 1 0-1.5H8V1.75A.75.75 0 0 1 8.75 1h.5v.75H9.5a.75.75 0 0 0 0-1.5h-5z"/>
      </svg>
      ${name}
    </a>
  </div>
  <p class="project-desc">${desc}</p>
  <div class="project-card-footer">
    <div class="project-meta">
      ${lang ? `<span class="lang-dot" style="background-color:#${color}"></span><span class="lang-name">${lang}</span>` : ""}
      <span class="meta-item">
        <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/>
        </svg>
        ${stars}
      </span>
      <span class="meta-item">
        <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0zM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0z"/>
        </svg>
        ${forks}
      </span>
    </div>
    <span class="project-updated">Updated ${updated}</span>
  </div>
</div>`;
  });

  return `<div class="projects-grid">\n${cards.join("\n")}\n</div>`;
}

function formatCommits(count) {
  const month = new Date().toLocaleDateString("en-US", { month: "long" });
  return `<div class="commits-card">
  <div class="commits-label">Commits this month</div>
  <div class="commits-count">${count}</div>
  <div class="commits-month">${month} ${new Date().getFullYear()}</div>
</div>`;
}

async function main() {
  const [repos, monthlyCommits] = await Promise.all([
    fetchRepos(USERNAME),
    fetchMonthlyCommits(USERNAME),
  ]);

  const projectCards = formatRepos(repos);
  const commitsBlock = formatCommits(monthlyCommits);

  let readme = fs.readFileSync(README_PATH, "utf8");

  // Replace projects section
  const pStart = readme.indexOf(PROJECTS_START);
  const pEnd = readme.indexOf(PROJECTS_END);
  if (pStart !== -1 && pEnd !== -1) {
    readme =
      readme.slice(0, pStart + PROJECTS_START.length) +
      "\n\n" + projectCards + "\n\n" +
      readme.slice(pEnd);
  }

  // Replace commits section
  const cStart = readme.indexOf(COMMITS_START);
  const cEnd = readme.indexOf(COMMITS_END);
  if (cStart !== -1 && cEnd !== -1) {
    readme =
      readme.slice(0, cStart + COMMITS_START.length) +
      "\n\n" + commitsBlock + "\n\n" +
      readme.slice(cEnd);
  }

  fs.writeFileSync(README_PATH, readme);
  console.log(
    `README.md updated — ${Math.min(repos.length, MAX_PROJECTS)} projects, ${monthlyCommits} commits this month.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
