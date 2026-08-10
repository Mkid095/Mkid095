// Fetches GitHub profile data and generates animated SVG stat files locally.
// No external API needed for rendering — all SVGs generated inline with CSS animations.
// Run: GITHUB_TOKEN=... node scripts/generate-stats.js

const fs = require("fs");
const https = require("https");
const path = require("path");

const TOKEN = process.env.GITHUB_TOKEN;
const OUT_DIR = path.join(__dirname, "..", "profile");
const README_PATH = path.join(__dirname, "..", "README.md");
const USERNAME = process.env.GITHUB_USERNAME || "Mkid095";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── GitHub API helpers ────────────────────────────────────────────────────────

function api(pathStr) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: pathStr,
      method: "GET",
      headers: {
        "User-Agent": "readme-updater",
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.end();
  });
}

function gql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const opts = {
      hostname: "api.github.com",
      path: "/graphql",
      method: "POST",
      headers: {
        "User-Agent": "readme-updater",
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

const ANIMATIONS = `
  @keyframes countUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
  @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
`;

function svgShell({ width = 495, height = 195, bg = "#fff", children, styles = "" }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>${ANIMATIONS}\n${styles}</style></defs>
  <rect width="${width}" height="${height}" fill="${bg}" rx="8"/>
${children}
</svg>`;
}

// ── Stat Card SVG (animated number + label + optional icon) ─────────────────

function statCard({ label, value, icon, accent = "#22c55e", bg = "#fff", text = "#444", sublabel = "" }) {
  const w = 150, h = 100;
  const rows = [];
  rows.push(`  <text x="12" y="28" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" fill="${text}" opacity="0.7" text-transform="uppercase" letter-spacing="0.05em">${label}</text>`);
  rows.push(`  <text x="12" y="62" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="34" font-weight="700" fill="${accent}" style="animation:countUp 0.8s ease-out both">${value}</text>`);
  if (sublabel) rows.push(`  <text x="12" y="80" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="10" fill="${text}" opacity="0.5">${sublabel}</text>`);
  return svgShell({ width: w, height: h, bg, styles: `.card { animation:slideIn 0.5s ease-out both; }`, children: rows.join("\n") });
}

// ── Main Stats Card SVG (github-readme-stats style) ─────────────────────────

function mainStatsCard({ commits, prs, issues, stars, repos, followers, following, accent = "#22c55e", bg = "#fffefe", title = "#222", text = "#444", icon = "#222", rank = "#22c55e" }) {
  const w = 495, h = 195;
  const mid = 164;

  const rows = [];
  // Title
  rows.push(`  <text x="24" y="38" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="14" font-weight="650" fill="${title}">Kennedy Mwangi</text>`);
  // Divider
  rows.push(`  <line x1="24" y1="50" x2="471" y2="50" stroke="${text}" stroke-opacity="0.1" stroke-width="1"/>`);

  // Rank circle
  rows.push(`  <circle cx="428" cy="120" r="42" fill="${rank}" fill-opacity="0.1"/>`);
  rows.push(`  <circle cx="428" cy="120" r="32" fill="none" stroke="${rank}" stroke-opacity="0.3" stroke-width="4"/>`);
  rows.push(`  <text x="428" y="116" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="700" fill="${rank}" text-anchor="middle">Rank</text>`);
  rows.push(`  <text x="428" y="130" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="13" font-weight="700" fill="${rank}" text-anchor="middle">S</text>`);

  const stats = [
    { label: "Commits", value: commits, x: 24 },
    { label: "Pull Requests", value: prs, x: 136 },
    { label: "Issues", value: issues, x: 248 },
    { label: "Stars", value: stars, x: 360 },
  ];

  stats.forEach((s, i) => {
    rows.push(`  <text x="${s.x}" y="80" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" fill="${text}" opacity="0.6">${s.label}</text>`);
    rows.push(`  <text x="${s.x}" y="108" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="22" font-weight="700" fill="${accent}" style="animation:countUp ${0.4 + i * 0.12}s ease-out both">${s.value}</text>`);
  });

  rows.push(`  <line x1="24" y1="128" x2="471" y2="128" stroke="${text}" stroke-opacity="0.1" stroke-width="1"/>`);

  const botStats = [
    { label: "Public Repos", value: repos, x: 24 },
    { label: "Followers", value: followers, x: 148 },
    { label: "Following", value: following, x: 272 },
  ];

  botStats.forEach((s, i) => {
    rows.push(`  <text x="${s.x}" y="155" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" fill="${text}" opacity="0.6">${s.label}</text>`);
    rows.push(`  <text x="${s.x}" y="178" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="18" font-weight="700" fill="${accent}" style="animation:countUp ${0.6 + i * 0.1}s ease-out both">${s.value}</text>`);
  });

  return svgShell({ width: w, height: h, bg, children: rows.join("\n") });
}

// ── Top Languages Card SVG ───────────────────────────────────────────────────

function langsCard({ langs, accent = "#22c55e", bg = "#fff", title = "#222", text = "#444" }) {
  // langs: [{name, color, pct}]
  const w = 495, h = 180;
  const barH = 10;
  let y = 50;

  const rows = [];
  rows.push(`  <text x="24" y="34" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="13" font-weight="650" fill="${title}">Top Languages</text>`);
  rows.push(`  <line x1="24" y1="44" x2="471" y2="44" stroke="${text}" stroke-opacity="0.1" stroke-width="1"/>`);

  langs.slice(0, 8).forEach((lang) => {
    rows.push(`  <text x="24" y="${y + 12}" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="12" font-weight="500" fill="${text}">${lang.name}</text>`);
    rows.push(`  <text x="471" y="${y + 12}" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="${text}" opacity="0.6" text-anchor="end">${lang.pct}%</text>`);
    // Background bar
    rows.push(`  <rect x="24" y="${y + 17}" width="447" height="${barH}" fill="${text}" opacity="0.08" rx="5"/>`);
    // Fill bar
    rows.push(`  <rect x="24" y="${y + 17}" width="${Math.round(lang.pct * 4.47)}" height="${barH}" fill="${lang.color}" rx="5" style="animation:countUp 0.6s ease-out both"/>`);
    y += 28;
  });

  return svgShell({ width: w, height: h, bg, children: rows.join("\n") });
}

// ── Monthly Commits Card SVG (animated) ────────────────────────────────────

function commitsCard({ monthly, total, accent = "#22c55e", bg = "#fff", title = "#222", text = "#444" }) {
  const w = 300, h = 120;
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows = [];
  rows.push(`  <text x="20" y="26" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="10" font-weight="600" fill="${text}" opacity="0.6" letter-spacing="0.05em">COMMITS THIS MONTH</text>`);
  rows.push(`  <text x="20" y="68" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="42" font-weight="800" fill="${accent}" style="animation:countUp 0.8s ease-out both">${monthly}</text>`);
  rows.push(`  <text x="20" y="88" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="10" fill="${text}" opacity="0.5">${month}</text>`);
  rows.push(`  <circle cx="268" cy="28" r="5" fill="${accent}" style="animation:pulse 2s ease-in-out infinite"/>`);
  rows.push(`  <text x="20" y="112" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="10" fill="${text}" opacity="0.4">All time: ${total.toLocaleString()} commits</text>`);
  rows.push(`  <line x1="0" y1="0" x2="0" y2="120" stroke="${accent}" stroke-width="4" opacity="0.8"/>`);

  return svgShell({ width: w, height: h, bg, styles: "", children: rows.join("\n") });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch user data (public repos, private repos count)
  const user = await api(`/users/${USERNAME}`);

  // 2. Fetch repos for language data + stars
  const repos = await api(`/users/${USERNAME}/repos?per_page=100&type=owner`);

  // 3. GraphQL: commit counts
  const gqlResult = await gql(`{
    viewer {
      contributionsCollection {
        totalCommitContributions
        commitmentChronology: contributionCalendar {
          weeks {
            contributionDays { contributionCount date }
          }
        }
      }
    }
  }`);

  const cal = gqlResult.data?.viewer?.contributionsCollection?.commitmentChronology;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let monthly = 0;
  if (cal?.weeks) {
    cal.weeks.forEach((w) =>
      w.contributionDays.forEach((d) => {
        if (d.date.startsWith(thisMonth)) monthly += d.contributionCount;
      })
    );
  }
  const totalCommits = gqlResult.data?.viewer?.contributionsCollection?.totalCommitContributions || 0;

  // 4. Compute derived stats
  const publicRepos = repos.filter((r) => !r.private).length;
  const privateRepos = (user.total_private_repos || 0);
  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const followers = user.followers || 0;
  const following = user.following || 0;

  // Language percentages
  const langBytes = {};
  repos.forEach((r) => {
    if (r.language) langBytes[r.language] = (langBytes[r.language] || 0) + 1;
  });
  const totalLang = Object.values(langBytes).reduce((a, b) => a + b, 0);
  const topLangs = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      color: LANG_COLORS[name] || "#8b949e",
      pct: totalLang > 0 ? Math.round((count / totalLang) * 100) : 0,
    }));

  console.log(`Data: monthly=${monthly} total=${totalCommits} public=${publicRepos} private=${privateRepos} stars=${totalStars} followers=${followers} following=${following}`);
  console.log("Top langs:", topLangs.map((l) => `${l.name}(${l.pct}%)`).join(", "));

  // 5. Save animated SVGs (light version)
  const lightBg = "#ffffff";
  const lightText = "#444444";
  const lightTitle = "#222222";

  fs.writeFileSync(
    path.join(OUT_DIR, "commits.svg"),
    commitsCard({ monthly, total: totalCommits, bg: lightBg, title: lightTitle, text: lightText })
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "stats.svg"),
    mainStatsCard({
      commits: totalCommits.toLocaleString(),
      prs: "0",
      issues: "0",
      stars: totalStars,
      repos: publicRepos,
      followers,
      following,
      bg: lightBg, title: lightTitle, text: lightText,
    })
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "langs.svg"),
    langsCard({ langs: topLangs, bg: lightBg, title: lightTitle, text: lightText })
  );

  // Also save dark versions
  const darkBg = "#0d1117";
  const darkText = "#8b949e";
  const darkTitle = "#e6edf3";

  fs.writeFileSync(
    path.join(OUT_DIR, "commits-dark.svg"),
    commitsCard({ monthly, total: totalCommits, bg: darkBg, title: darkTitle, text: darkText })
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "stats-dark.svg"),
    mainStatsCard({
      commits: totalCommits.toLocaleString(),
      prs: "0",
      issues: "0",
      stars: totalStars,
      repos: publicRepos,
      followers,
      following,
      bg: darkBg, title: darkTitle, text: darkText,
    })
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "langs-dark.svg"),
    langsCard({ langs: topLangs, bg: darkBg, title: darkTitle, text: darkText })
  );

  console.log("SVGs saved to profile/.");

  // 6. Build pinned repos markdown
  const sorted = [...repos]
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6);

  const pinRows = sorted.map((r) => {
    const stars = r.stargazers_count || 0;
    const lang = r.language || "-";
    const desc = r.description || "No description";
    return `### [${r.name}](${r.html_url})\n${desc}\n\n**${lang}** &middot; **${stars}** stars`;
  });

  // 7. Update README markers
  let readme = fs.readFileSync(README_PATH, "utf8");

  // Stats section — clean markdown image syntax for committed SVGs
  const statsBlock = `
![Commits this month](./profile/commits.svg)

![GitHub Stats](./profile/stats.svg)

![Top Languages](./profile/langs.svg)

**${monthly}** commits this month &middot; **${publicRepos}** public repos &middot; **${privateRepos}** private repos &middot; **${followers}** followers &middot; **${totalStars}** stars &middot; **${totalCommits.toLocaleString()}** all-time commits`;

  const sStart = readme.indexOf("<!-- STATS:START -->");
  const sEnd = readme.indexOf("<!-- STATS:END -->");
  if (sStart !== -1 && sEnd !== -1) {
    readme =
      readme.slice(0, sStart + "<!-- STATS:START -->".length) +
      "\n" + statsBlock + "\n" +
      readme.slice(sEnd);
  }

  // Pinned repos
  const pStart = readme.indexOf("<!-- PROJECTS:START -->");
  const pEnd = readme.indexOf("<!-- PROJECTS:END -->");
  if (pStart !== -1 && pEnd !== -1) {
    readme =
      readme.slice(0, pStart + "<!-- PROJECTS:START -->".length) +
      "\n\n" + pinRows.join("\n\n---\n\n") + "\n\n" +
      readme.slice(pEnd);
  }

  fs.writeFileSync(README_PATH, readme);
  console.log("README.md updated.");
}

const LANG_COLORS = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
