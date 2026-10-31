// Edit these once after you create the GitHub repo.
window.POOL_CONFIG = {
  appName: 'SpreadSheet',
  tagline: 'College football pick\'em, live',
  // Where the app loads picks from (relative to the site). The admin page writes to this same path in the repo.
  picksPath: 'data/picks.json',
  // GitHub repo that hosts the site (used by admin.html to publish the weekly picks file).
  github: { owner: 'YOUR_GITHUB_USERNAME', repo: 'pickem', branch: 'main' },
  // ESPN public scoreboard. groups=80 is FBS.
  espn: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=',
  refreshSecondsLive: 45,     // when any game is in progress
  refreshSecondsIdle: 180     // when games are still to kick off
};
