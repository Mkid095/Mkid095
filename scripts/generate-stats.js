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

// ── Main Stats Card SVG (tile-based professional layout) ─────────────────────
function mainStatsCard({ commits, prs, issues, stars, repos, followers, following, privateRepos,
  accent = "#22c55e", bg = "#ffffff", title = "#16a34a", textDark = "#374151", textMuted = "#6b7280", textLight = "#9ca3af", border = "#e5e7eb" }) {

  const F = "'Segoe UI', Helvetica, Arial, sans-serif";
  const anim = (delay = 0) => `animation:countUp 0.7s ease-out ${delay}s both`;

  const rows = [];
  // Card surface
  rows.push(`  <rect width="495" height="220" fill="${bg}" rx="12"/>`);

  // Header bar
  rows.push(`  <rect width="495" height="40" fill="#f8faf7" rx="12"/>`);
  rows.push(`  <rect y="28" width="495" height="12" fill="#f8faf7"/>`);
  rows.push(`  <text x="20" y="26" font-family="${F}" font-size="13" font-weight="700" fill="${title}" letter-spacing="0.5">Kennedy Mwangi</text>`);
  rows.push(`  <text x="138" y="26" font-family="${F}" font-size="13" font-weight="400" fill="${textMuted}">Profile Overview</text>`);

  // Divider
  rows.push(`  <line x1="20" y1="40" x2="475" y2="40" stroke="${border}" stroke-width="1"/>`);

  // Row 1: Commits (green) | PRs | Issues | Stars
  // Commits tile
  rows.push(`  <rect x="20" y="56" width="105" height="72" fill="#f0fdf4" rx="8"/>`);
  rows.push(`  <text x="32" y="76" font-family="${F}" font-size="10" font-weight="600" fill="${title}" opacity="0.7" letter-spacing="0.8">COMMITS</text>`);
  rows.push(`  <text x="32" y="108" font-family="${F}" font-size="28" font-weight="800" fill="${title}" style="${anim(0)}">${commits}</text>`);
  rows.push(`  <text x="32" y="122" font-family="${F}" font-size="10" fill="${textLight}">all time</text>`);

  // PRs tile
  rows.push(`  <rect x="135" y="56" width="105" height="72" fill="#f9fafb" rx="8"/>`);
  rows.push(`  <text x="147" y="76" font-family="${F}" font-size="10" font-weight="600" fill="${textDark}" opacity="0.5" letter-spacing="0.8">PULL REQUESTS</text>`);
  rows.push(`  <text x="147" y="108" font-family="${F}" font-size="28" font-weight="800" fill="${textDark}" style="${anim(0.1)}">${prs}</text>`);

  // Issues tile
  rows.push(`  <rect x="250" y="56" width="105" height="72" fill="#f9fafb" rx="8"/>`);
  rows.push(`  <text x="262" y="76" font-family="${F}" font-size="10" font-weight="600" fill="${textDark}" opacity="0.5" letter-spacing="0.8">ISSUES</text>`);
  rows.push(`  <text x="262" y="108" font-family="${F}" font-size="28" font-weight="800" fill="${textDark}" style="${anim(0.15)}">${issues}</text>`);

  // Stars tile
  rows.push(`  <rect x="365" y="56" width="110" height="72" fill="#f9fafb" rx="8"/>`);
  rows.push(`  <text x="377" y="76" font-family="${F}" font-size="10" font-weight="600" fill="${textDark}" opacity="0.5" letter-spacing="0.8">STARS</text>`);
  rows.push(`  <text x="377" y="108" font-family="${F}" font-size="28" font-weight="800" fill="${textDark}" style="${anim(0.2)}">${stars}</text>`);

  // Row 2: Public Repos (green) | Private Repos (green) | Followers | Following
  // Public Repos tile
  rows.push(`  <rect x="20" y="138" width="105" height="66" fill="#f0fdf4" rx="8"/>`);
  rows.push(`  <text x="32" y="157" font-family="${F}" font-size="10" font-weight="600" fill="${title}" opacity="0.7" letter-spacing="0.8">PUBLIC REPOS</text>`);
  rows.push(`  <text x="32" y="192" font-family="${F}" font-size="26" font-weight="800" fill="${title}" style="${anim(0.3)}">${repos}</text>`);

  // Private Repos tile
  rows.push(`  <rect x="135" y="138" width="105" height="66" fill="#f0fdf4" rx="8"/>`);
  rows.push(`  <text x="147" y="157" font-family="${F}" font-size="10" font-weight="600" fill="${title}" opacity="0.7" letter-spacing="0.8">PRIVATE REPOS</text>`);
  rows.push(`  <text x="147" y="192" font-family="${F}" font-size="26" font-weight="800" fill="${title}" style="${anim(0.35)}">${privateRepos}</text>`);

  // Followers tile
  rows.push(`  <rect x="250" y="138" width="105" height="66" fill="#f9fafb" rx="8"/>`);
  rows.push(`  <text x="262" y="157" font-family="${F}" font-size="10" font-weight="600" fill="${textDark}" opacity="0.5" letter-spacing="0.8">FOLLOWERS</text>`);
  rows.push(`  <text x="262" y="192" font-family="${F}" font-size="26" font-weight="800" fill="${textDark}" style="${anim(0.4)}">${followers}</text>`);

  // Following tile
  rows.push(`  <rect x="365" y="138" width="110" height="66" fill="#f9fafb" rx="8"/>`);
  rows.push(`  <text x="377" y="157" font-family="${F}" font-size="10" font-weight="600" fill="${textDark}" opacity="0.5" letter-spacing="0.8">FOLLOWING</text>`);
  rows.push(`  <text x="377" y="192" font-family="${F}" font-size="26" font-weight="800" fill="${textDark}" style="${anim(0.45)}">${following}</text>`);

  return svgShell({ width: 495, height: 220, bg, children: rows.join("\n") });
}

// ── Top Languages Card SVG ───────────────────────────────────────────────────

function langsCard({ langs, accent = "#22c55e", bg = "#ffffff", title = "#16a34a", textDark = "#374151", textMuted = "#6b7280", border = "#e5e7eb" }) {
  // langs: [{name, color, pct}]
  const F = "'Segoe UI', Helvetica, Arial, sans-serif";
  const w = 495, h = 200;
  const barH = 8;
  let y = 60;
  const barMaxW = 340; // width of the progress bar area

  const rows = [];
  // Card surface
  rows.push(`  <rect width="${w}" height="${h}" fill="${bg}" rx="12"/>`);
  // Header
  rows.push(`  <text x="20" y="32" font-family="${F}" font-size="13" font-weight="700" fill="${title}" letter-spacing="0.5">Top Languages</text>`);
  rows.push(`  <line x1="20" y1="42" x2="475" y2="42" stroke="${border}" stroke-width="1"/>`);

  langs.slice(0, 6).forEach((lang, i) => {
    const barW = Math.round((lang.pct / 100) * barMaxW);
    const delay = 0.4 + i * 0.08;
    rows.push(`  <text x="20" y="${y + 10}" font-family="${F}" font-size="12" font-weight="500" fill="${textDark}">${lang.name}</text>`);
    rows.push(`  <text x="475" y="${y + 10}" font-family="${F}" font-size="11" fill="${textMuted}" text-anchor="end">${lang.pct}%</text>`);
    // Background track
    rows.push(`  <rect x="20" y="${y + 16}" width="${barMaxW}" height="${barH}" fill="${border}" rx="4"/>`);
    // Fill bar (green accent for top lang, language color for rest)
    const fillColor = i === 0 ? accent : lang.color;
    rows.push(`  <rect x="20" y="${y + 16}" width="${barW}" height="${barH}" fill="${fillColor}" rx="4" style="animation:countUp 0.7s ease-out ${delay}s both"/>`);
    y += 30;
  });

  return svgShell({ width: w, height: h, bg, children: rows.join("\n") });
}

// ── Monthly Commits Hero Card SVG ──────────────────────────────────────────────

function commitsCard({ monthly, total, accent = "#22c55e", bg = "#ffffff", title = "#16a34a", textDark = "#374151", textMuted = "#9ca3af" }) {
  const F = "'Segoe UI', Helvetica, Arial, sans-serif";
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows = [];
  // Card surface
  rows.push(`  <rect width="300" height="130" fill="${bg}" rx="12"/>`);
  // Left accent stripe
  rows.push(`  <rect width="5" height="130" fill="${accent}" rx="3"/>`);
  rows.push(`  <rect x="0" y="12" width="5" height="116" fill="${accent}"/>`);
  // Label
  rows.push(`  <text x="20" y="30" font-family="${F}" font-size="10" font-weight="700" fill="${accent}" letter-spacing="1.2">COMMITS THIS MONTH</text>`);
  // Hero number
  rows.push(`  <text x="20" y="82" font-family="${F}" font-size="48" font-weight="800" fill="${accent}" style="animation:countUp 0.8s ease-out both">${monthly}</text>`);
  // Month subtitle
  rows.push(`  <text x="20" y="102" font-family="${F}" font-size="11" fill="${textMuted}">${month}</text>`);
  // Footer
  rows.push(`  <text x="20" y="120" font-family="${F}" font-size="10" fill="${textMuted}">All time: ${total.toLocaleString()} commits</text>`);
  // Pulsing dot
  rows.push(`  <circle cx="270" cy="30" r="5" fill="${accent}" style="animation:pulse 2s ease-in-out infinite"/>`);

  return svgShell({ width: 300, height: 130, bg, children: rows.join("\n") });
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
    return `### [${r.name}](${r.html_url})\n${desc}\n\n**${lang}**  - **${stars}** stars`;
  });

  // 7. Update README markers
  let readme = fs.readFileSync(README_PATH, "utf8");

  // Stats section — clean markdown image syntax for committed SVGs
  const statsBlock = `
![Commits this month](./profile/commits.svg)

![GitHub Stats](./profile/stats.svg)

![Top Languages](./profile/langs.svg)

**${monthly}** commits this month  - **${publicRepos}** public repos  - **${privateRepos}** private repos  - **${followers}** followers  - **${totalStars}** stars  - **${totalCommits.toLocaleString()}** all-time commits`;

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
