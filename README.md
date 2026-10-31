# SpreadSheet — live pick'em tracker

A free, no-backend web app for a college football pick'em pool. Everyone opens one link on their phone, taps their name once, and sees their picks with live scores and the spread, a live weekly leaderboard, and a 1-v-1 comparison tool.

How it works:

- The site is plain HTML/JS hosted free on GitHub Pages.
- Each phone pulls live scores straight from ESPN's public scoreboard feed (no API key, no server, no cost). Refreshes every 45 seconds while games are live.
- The only manual step is weekly: drop the pool's .xlsx on `admin.html`, review the matchups, hit Publish. That writes `data/picks.json` into the repo and the site updates within a minute or two.

## One-time setup (about 10 minutes)

1. Create a free personal GitHub account if you don't have one (don't use the company one).
2. Create a new **public** repository, e.g. `pickem`. Upload everything in this folder to it (GitHub's web UI lets you drag and drop the files; keep the `data/` folder).
3. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Save. Your site will be at `https://YOURNAME.github.io/pickem/`.
4. Edit `config.js` in the repo: set `github.owner` to your username and `github.repo` to the repo name. (You can also change `appName`.)
5. Create a token for publishing: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate. Repository access: only this repo. Permissions: **Contents: Read and write**. Copy it.
6. Open `https://YOURNAME.github.io/pickem/admin.html`, tap "GitHub settings", paste the repo (`YOURNAME/pickem`) and the token, Save. It's stored only in that browser, so do this on whichever device you'll upload from.

Share `https://YOURNAME.github.io/pickem/` with the pool. Tell people to "Add to Home Screen" on their phone and it behaves like an app.

## Weekly (about 1 minute)

1. Open `admin.html`, drop the week's .xlsx.
2. Check that every row says "matched" (the parser matches sheet names like `Smu`, `GEORGIA @ATLANTA`, `Uab` to ESPN automatically; if one ever doesn't match, pick the right game from the dropdown).
3. Publish. Done.

If you'd rather not store a token anywhere, use "Download picks.json" and upload the file to `data/picks.json` through GitHub's web UI instead.

## Scoring rules as implemented

- Column A is the favorite; the sheet's spread is applied to it. A covers when `scoreA - scoreB > spread`, otherwise B covers. The sheet uses half-point lines so there are no pushes (a whole-number push would show as "Dead even" and count for nobody).
- Leaderboard: **W/L** are final games only. **Live** is in-progress games (covering-trailing). **Proj** = W + games currently covering, and that's the sort order.
- Home team is whoever is in ALL CAPS on the sheet; neutral-site games (the `@ATLANTA` style) show an "N".
- Players with no picks on the sheet are listed at the bottom as "no picks this week".

## Files

- `index.html` — the app (My Picks, Leaders, 1 v 1)
- `admin.html` — weekly upload/publish page
- `parser.js` — sheet parser, ESPN team matching, cover math (shared by both pages)
- `config.js` — app name, repo, refresh intervals
- `data/picks.json` — the current week (this folder ships with week 9 already loaded)
- `logo.svg` — icon
- `test/` — local tests (Playwright screenshots against a saved ESPN snapshot); not needed on the site, safe to leave out of the repo

## Things worth knowing

- ESPN's scoreboard feed is unofficial. It has been stable for years and is widely used by hobby projects, but if ESPN ever changes it the `flattenEvents` function in `parser.js` is the one place to fix.
- `admin.html` is visible to anyone who guesses the URL, but without your token it can only parse a sheet and download JSON. Nothing else on the site can write to the repo.
- GitHub Pages caches `picks.json` briefly; the app adds a cache-buster, but allow a couple of minutes after publishing.
- The 1 v 1 view defaults to you vs. the current leader; tapping any row on the leaderboard opens that matchup.
