# Elite Premier League 2026

Live site for the Elite Premier League: fixtures, live scores, league table, squads and top scorers.
No server and no database. All league data is in `data.json` in this repository.

## Files
| File | What it is |
|---|---|
| `index.html` | The page |
| `app.css` | All the styling |
| `app.js`, `pages.js`, `admin.js`, `ui.js`, `teams.js` | The site code |
| `config.js` | League settings and the starting squads |
| `data.js`, `backend-github.js`, `backend-demo.js` | Where the data is read and saved |
| `data.json` | The league data (squads, fixtures, scores) |
| `sw.js`, `manifest.webmanifest` | Lets people install it on their phone |
| `logo.png`, `favicon.png`, `icon-192.png`, `icon-512.png`, `og.png` | Images |

## Put it online
1. Upload every file in this folder to the repository root.
2. Settings > Pages > Deploy from a branch > `main` / `(root)` > Save.
3. After about 2 minutes the site is at `https://USERNAME.github.io/REPOSITORY/`.

## Admin
1. Make a key: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate.
   Choose only this repository and set Contents to Read and write.
2. Open the site address with `#/admin` on the end, paste the key, sign in.
3. Squads tab: add players (8 max per team) or Load starting squads. Fixtures tab: Load the poster fixtures.
   Results tab: Start match, goals, Full time. Viewers see changes within about 15 seconds.

Keep the key private. Anyone who has it can change the league.
