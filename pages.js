import * as data from "./data.js";
import { TEAMS, teamById, badge } from "./teams.js";
import { LEAGUE } from "./config.js";
import {
  esc, $, $$, fmtDate, fmtTime, dayKey, teamLabel, sortFixtures, computeTable, topScorers,
  squadOf, roundName
} from "./ui.js";

const MAX = LEAGUE.playersPerTeam;

// ---------- shared pieces ----------
export function fixtureCard(f) {
  const done = f.status === "finished", live = f.status === "live";
  const started = done || live;
  const mid = started
    ? `<div class="score" aria-label="${live ? "Live score" : "Final score"} ${f.homeScore ?? 0} to ${f.awayScore ?? 0}">${f.homeScore ?? 0} – ${f.awayScore ?? 0}</div>${live ? `<div class="livetag"><span class="dot"></span>LIVE</div>` : `<div class="small muted">FT</div>`}`
    : `<div class="score">${f.kickoff ? esc(fmtTime(f.kickoff)) : "TBC"}</div><div class="small muted">vs</div>`;
  const sc = f.scorers || [];
  const side = (id) => sc.filter((s) => s.teamId === id).map((s) => `${esc(s.name)}${s.minute ? ` ${esc(s.minute)}'` : ""}`).join(", ");
  const lu = f.lineup || {};
  const hasLu = (lu.home || []).length || (lu.away || []).length;
  const col = (list) => `<ol class="names">${(list || []).map((p) => `<li>${esc(p.name)}</li>`).join("") || "<li class='muted'>Not announced</li>"}</ol>`;
  return `<div class="fx${live ? " is-live" : ""}">
    <div class="t h">${teamLabel(f.homeId, 30)}</div>
    <div class="mid">${mid}</div>
    <div class="t">${teamLabel(f.awayId, 30)}</div>
    <div class="meta">${f.kickoff ? esc(fmtDate(f.kickoff)) : ""}${f.venue ? " · " + esc(f.venue) : ""}</div>
    ${started && sc.length ? `<div class="gs"><span>⚽ ${side(f.homeId) || "—"}</span><span>${side(f.awayId) || "—"} ⚽</span></div>` : ""}
    ${hasLu ? `<details class="lu" ${live ? "open" : ""}><summary>Line-ups</summary><div class="lucols"><div><b>${esc(teamById[f.homeId]?.name || "")}</b>${col(lu.home)}</div><div><b>${esc(teamById[f.awayId]?.name || "")}</b>${col(lu.away)}</div></div></details>` : ""}
  </div>`;
}

export function groupedFixtures(list) {
  const fx = sortFixtures(list);
  if (!fx.length) return `<div class="empty">No fixtures yet. They will appear here once the committee schedules them.</div>`;
  const groups = new Map();
  fx.forEach((f) => {
    const key = f.round ? `${dayKey(f.kickoff || "2000-01-01")}|r${f.round}` : `${dayKey(f.kickoff || "2000-01-01")}`;
    if (!groups.has(key)) groups.set(key, { round: f.round, day: f.kickoff, items: [] });
    groups.get(key).items.push(f);
  });
  return [...groups.values()].map((g) => `<section class="round">
    <h3>${g.round ? esc(roundName(g.round)) : esc(g.day ? fmtDate(g.day) : "Fixtures")}
      <small>${g.day ? esc(fmtDate(g.day)) : ""}${g.round && g.items[0].kickoff ? " · " + esc(fmtTime(g.items[0].kickoff)) : ""}</small></h3>
    ${g.items.map(fixtureCard).join("")}</section>`).join("");
}

// ---------- pages ----------
export async function home(el, ctx) {
  const [fixtures, players] = await Promise.all([data.getFixtures(), data.getPlayers()]);
  const finished = fixtures.filter((f) => f.status === "finished").length;
  const liveNow = sortFixtures(fixtures).filter((f) => f.status === "live");
  const next = sortFixtures(fixtures).find((f) => f.status !== "finished" && f.status !== "live");
  const full = TEAMS.filter((t) => squadOf(players, t.id).length >= MAX).length;
  el.innerHTML = `
  <section class="hero">
    <img src="logo.png" alt="Elite Premier League crest">
    <h1>Elite Premier League</h1>
    <p>Eight clubs. Eight players each. One champion. Follow every fixture, result and goal, and watch the table move live.</p>
    <div class="btns"><a class="btn" href="#/fixtures">See fixtures</a><a class="btn ghost" href="#/table">League table</a></div>
  </section>
  <div class="grid g4" style="margin-bottom:22px">
    <div class="card stat"><b>${TEAMS.length}</b><span>Teams</span></div>
    <div class="card stat"><b>${players.length}/${TEAMS.length * MAX}</b><span>Players</span></div>
    <div class="card stat"><b>${full}/${TEAMS.length}</b><span>Squads full</span></div>
    <div class="card stat"><b>${finished}/${fixtures.length}</b><span>Matches played</span></div>
  </div>
  ${liveNow.length ? `<h2><span class="livetag big"><span class="dot"></span>LIVE NOW</span></h2>${liveNow.map(fixtureCard).join("")}` : ""}
  ${next ? `<h2>Next match</h2>${fixtureCard(next)}` : ""}
  <h2 style="margin-top:22px">The teams</h2>
  <div class="grid g4">${TEAMS.map((t) => {
    const n = squadOf(players, t.id).length;
    return `<a class="card stat" style="text-decoration:none;color:inherit" href="#/teams">${badge(t.id, 56)}<div style="font-weight:700;margin-top:6px">${esc(t.name)}</div><span>${n >= MAX ? "Squad full" : `${n}/${MAX} players`}</span></a>`;
  }).join("")}</div>`;
}

export async function fixtures(el) {
  const list = await data.getFixtures();
  el.innerHTML = `<h2>Fixtures &amp; results</h2>${groupedFixtures(list)}`;
}

export async function table(el) {
  const rows = computeTable(await data.getFixtures());
  el.innerHTML = `<h2>League table</h2>
  <div class="tablewrap"><table><thead><tr><th>#</th><th class="team">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
  <tbody>${rows.map((r, i) => `<tr class="${i === 0 && r.p ? "p1" : ""}"><td>${i + 1}</td><td class="team">${badge(r.id, 28)}<span>${esc(teamById[r.id].name)}</span></td>
    <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td><td class="pts">${r.pts}</td></tr>`).join("")}</tbody></table></div>
  <p class="muted small" style="margin-top:10px">Win 3 points, draw 1, loss 0. Ties are split by goal difference, then goals scored. The table updates as soon as the committee confirms a result.</p>`;
}

export async function teams(el) {
  const players = await data.getPlayers();
  el.innerHTML = `<h2>Teams &amp; squads</h2><div class="grid g2">${TEAMS.map((t) => {
    const sq = squadOf(players, t.id);
    return `<article class="card"><div class="teamhead">${badge(t.id, 46)}<div><h3>${esc(t.name)}</h3>
      <span class="pill ${sq.length >= MAX ? "ok" : ""}">${sq.length}/${MAX} players</span></div></div>
      ${sq.length ? `<ol class="names">${sq.map((p) => `<li>${esc(p.name)}</li>`).join("")}</ol>` : `<p class="muted small" style="margin:12px 0 0">Squad will be announced soon.</p>`}</article>`;
  }).join("")}</div>`;
}

export async function stats(el) {
  const list = await data.getFixtures();
  const scorers = topScorers(list);
  const table = computeTable(list).filter((r) => r.p);
  const goals = list.filter((f) => f.status === "finished").reduce((s, f) => s + f.homeScore + f.awayScore, 0);
  const played = list.filter((f) => f.status === "finished").length;
  const best = (key, dir) => [...table].sort((a, b) => dir * (a[key] - b[key]))[0];
  const atk = best("gf", -1), def = best("ga", 1);
  el.innerHTML = `<h2>Stats</h2>
  <div class="grid g4" style="margin-bottom:18px">
    <div class="card stat"><b>${played}</b><span>Matches played</span></div>
    <div class="card stat"><b>${goals}</b><span>Goals scored</span></div>
    <div class="card stat"><b>${played ? (goals / played).toFixed(1) : "0.0"}</b><span>Goals per match</span></div>
  </div>
  <div class="grid g2">
    <section class="card"><h3>Top scorers</h3>${scorers.length ? `<ol style="padding-left:20px;margin:8px 0 0">${scorers.slice(0, 10).map((s) => `<li style="margin:6px 0"><b>${esc(s.name)}</b> <span class="muted">· ${esc(teamById[s.teamId]?.name || "")}</span> <b style="float:right;color:var(--mint)">${s.goals}</b></li>`).join("")}</ol>` : `<p class="muted">No goals recorded yet.</p>`}</section>
    <section class="card"><h3>Team form</h3>${table.length ? `
      <p>Best attack: <b>${esc(teamById[atk.id].name)}</b> <span class="muted">(${atk.gf} goals)</span></p>
      <p>Best defence: <b>${esc(teamById[def.id].name)}</b> <span class="muted">(${def.ga} conceded)</span></p>
      <p>Leaders: <b>${esc(teamById[computeTable(list)[0].id].name)}</b></p>` : `<p class="muted">Stats appear after the first result.</p>`}</section>
  </div>`;
}

export function rules(el) {
  el.innerHTML = `<h2>Rules &amp; regulations</h2>
  <ol class="rules">
    <li><b>Teams.</b> Eight teams take part: ${TEAMS.map((t) => esc(t.name)).join(", ")}.</li>
    <li><b>Squads.</b> Each team has a maximum of <b>${MAX} players</b>. Squads are announced by the league organiser.</li>
    <li><b>Match length.</b> Each match lasts ${LEAGUE.matchMinutes} minutes ${LEAGUE.matchSeconds} seconds. Matches follow each other with no transition time, from 07:45 AM to 12:00 PM on match day.</li>
    <li><b>Points.</b> Win 3 points, draw 1 point, loss 0.</li>
    <li><b>Table order.</b> Points, then goal difference, then goals scored.</li>
    <li><b>Results.</b> Scores and goal scorers are entered by the organiser after each match and are final once shown on this site.</li>
    <li><b>Prizes.</b> The team on top of the table lifts the Elite Premier League trophy.</li>
  </ol>
  <p class="muted small">The organiser can change these rules at any time. Edit the list in <code>pages.js</code>.</p>`;
}

let deferred = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });
export function install(el) {
  el.innerHTML = `<h2>Get the app</h2>
  <p class="muted">Put Elite Premier League on your home screen. It opens like an app, with no app store.</p>
  ${deferred ? `<p><button class="btn" id="inst">Install now</button></p>` : ""}
  <div class="grid g2">
    <div class="card"><h3>Android (Chrome)</h3><ol class="steps"><li>Open this site in Chrome.</li><li>Tap the ⋮ menu.</li><li>Tap “Install app” or “Add to Home screen”.</li><li>Tap Install.</li></ol></div>
    <div class="card"><h3>iPhone (Safari)</h3><ol class="steps"><li>Open this site in Safari.</li><li>Tap the Share button.</li><li>Tap “Add to Home Screen”.</li><li>Tap Add.</li></ol></div>
  </div>`;
  $("#inst", el)?.addEventListener("click", async () => { deferred.prompt(); await deferred.userChoice; deferred = null; });
}
