import * as data from "./data.js";
import { TEAMS, teamById, badge } from "./teams.js";
import { LEAGUE, ADMIN_EMAIL, STARTING_SQUADS } from "./config.js";
import {
  esc, $, $$, toast, fmtDate, fmtTime, dayKey, timeValue, teamLabel, sortFixtures, squadOf, roundName
} from "./ui.js";

const MAX = LEAGUE.playersPerTeam;
let tab = "squads";

// The 16 matches from the official fixtures poster: 4 rounds of 4 games, each 63 min 45 s, no breaks, from 07:45.
const POSTER = [
  [["mun", "mci"], ["ars", "rma"], ["che", "bar"], ["liv", "bay"]],
  [["mun", "rma"], ["mci", "bar"], ["ars", "bay"], ["che", "liv"]],
  [["mun", "bar"], ["rma", "bay"], ["mci", "liv"], ["ars", "che"]],
  [["mun", "bay"], ["bar", "liv"], ["rma", "che"], ["mci", "ars"]]
];
const MATCH_SECONDS = LEAGUE.matchMinutes * 60 + LEAGUE.matchSeconds;
const START_SECONDS = 7 * 3600 + 45 * 60;
const pad = (n) => String(n).padStart(2, "0");
const hms = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
export function posterFixtures(date) {
  return POSTER.flatMap((games, r) => games.map(([homeId, awayId]) => ({
    round: r + 1, homeId, awayId, venue: "TBA", status: "scheduled", homeScore: null, awayScore: null, scorers: [],
    kickoff: `${date}T${hms(START_SECONDS + r * MATCH_SECONDS)}+01:00`
  })));
}
const toKickoff = (date, time) => `${date}T${time.length === 5 ? time + ":00" : time}+01:00`;

function dialog(html, onMount) {
  const d = document.createElement("dialog");
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener("close", () => d.remove());
  d.addEventListener("click", (e) => { if (e.target.matches("[data-close]")) d.close(); });
  d.showModal();
  onMount?.(d);
  return d;
}

export async function admin(el, ctx) {
  const u = ctx.user;
  if (!u || !u.isAdmin) return login(el, ctx);
  await panel(el, ctx);
}

function login(el, ctx) {
  const u = ctx.user;
  el.innerHTML = `<h2>Admin sign-in</h2>
  ${u && !u.isAdmin ? `<div class="note bad" style="max-width:420px;margin-bottom:14px"><b>Not authorised.</b> ${esc(u.email)} is not an admin account.
    <div style="margin-top:10px"><button class="btn ghost sm" id="so">Sign out</button></div></div>` : ""}
  <form class="f" id="lf" style="max-width:420px" autocomplete="on">
    <p class="muted" style="margin:0">Only the league organiser can enter this area. Paste the admin key once; this device remembers it until you sign out.</p>
    <input type="hidden" name="email" value="${esc(ADMIN_EMAIL)}">
    <label>Admin key<input type="password" name="password" required autocomplete="off" placeholder="${data.mode === "demo" ? "anything" : "github_pat_..."}"></label>
    <div id="err" class="note bad" hidden></div>
    <button class="btn" type="submit">Sign in</button>
    ${data.mode === "demo" ? `<p class="small muted" style="margin:0">Demo mode: any key works. On the live site this is your GitHub admin key.</p>` : ""}
  </form>`;
  $("#so", el)?.addEventListener("click", () => data.signOut());
  $("#lf", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, err = $("#err", el);
    try { err.hidden = true; await data.signInAdmin(f.email.value, f.password.value); }
    catch (ex) { err.hidden = false; err.textContent = ex.message; }
  });
}

async function panel(el, ctx) {
  const [players, fixtures] = await Promise.all([data.getPlayers(), data.getFixtures()]);
  const rerender = () => panel(el, ctx);
  const tabs = [["squads", "Squads"], ["fixtures", "Fixtures"], ["results", "Results"]];
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <h2 style="margin:0">Admin panel</h2><span class="small muted">${esc(ctx.user.email)} · <button class="btn ghost sm" id="so">Sign out</button></span></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>
    <div id="tabbody"></div>`;
  $("#so", el).addEventListener("click", async () => { await data.signOut(); ctx.go("#/"); });
  $$("[data-tab]", el).forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; rerender(); }));
  const body = $("#tabbody", el);
  const env = { players, fixtures, rerender };
  ({ squads: tabSquads, fixtures: tabFixtures, results: tabResults }[tab])(body, env);
}

// ---- squads: the admin types or pastes the player names for each team ----
function tabSquads(el, { players, rerender }) {
  const total = players.length;
  const starting = Object.values(STARTING_SQUADS || {}).some((l) => l?.length) && total === 0;
  el.innerHTML = `<p class="muted small" style="margin-top:0">Add the player names for each team (up to ${MAX} per team). Names appear on the Teams page and in the goal-scorer list when you enter a result. ${total}/${TEAMS.length * MAX} players added.</p>
    ${starting ? `<div class="card" style="margin-bottom:14px"><h3>Starting squads are ready</h3><p class="muted small" style="margin:4px 0 10px">The player names are already stored in the site. Load them with one click.</p><button class="btn" id="loadsq">Load starting squads</button></div>` : ""}
    <div class="grid g2">${TEAMS.map((t) => {
      const sq = squadOf(players, t.id);
      const full = sq.length >= MAX;
      return `<article class="card"><div class="teamhead">${badge(t.id, 40)}<div><h3>${esc(t.name)}</h3><span class="pill ${full ? "ok" : ""}">${sq.length}/${MAX}${full ? " · full" : ""}</span></div></div>
        <ol class="names edit">${sq.map((p) => `<li><span>${esc(p.name)}</span><span class="rowbtns"><button class="btn ghost sm" data-ren="${esc(p.uid)}" data-name="${esc(p.name)}">Rename</button><button class="btn bad sm" data-remove="${esc(p.uid)}" data-name="${esc(p.name)}" aria-label="Remove ${esc(p.name)}">✕</button></span></li>`).join("")}</ol>
        ${full ? `<p class="small muted" style="margin:10px 0 0">Squad is full.</p>` : `<form class="addp" data-team="${t.id}"><input type="text" name="n" maxlength="60" placeholder="Player name" aria-label="Add a player to ${esc(t.name)}"><button class="btn sm" type="submit">Add</button></form>
        <button class="btn ghost sm" style="margin-top:8px" data-paste="${t.id}">Paste a list of names</button>`}</article>`;
    }).join("")}</div>`;
  const run = async (fn, ok) => { try { await fn(); if (ok) toast(ok); } catch (e) { toast(e.message, true); } rerender(); };
  $("#loadsq", el)?.addEventListener("click", () => run(async () => {
    for (const [team, names] of Object.entries(STARTING_SQUADS)) if (names?.length) await data.addPlayers(team, names);
  }, "Starting squads loaded."));
  $$(".addp", el).forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = f.n.value;
    if (!v.trim()) return;
    run(() => data.addPlayers(f.dataset.team, [v]), "Player added.");
  }));
  $$("[data-paste]", el).forEach((b) => b.addEventListener("click", () => {
    const team = b.dataset.paste, room = MAX - squadOf(players, team).length;
    dialog(`<form method="dialog" class="f" id="pf" style="max-width:none">
      <h3>${esc(teamById[team].name)}: paste names</h3>
      <p class="muted small" style="margin:0">One name per line. You can add up to ${room} more.</p>
      <textarea name="names" rows="8" placeholder="Player One&#10;Player Two&#10;Player Three" style="min-height:160px"></textarea>
      <div class="row"><button class="btn" type="submit">Add these players</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, (d) => {
      $("#pf", d).addEventListener("submit", (e) => {
        e.preventDefault();
        const names = e.target.names.value.split(/\r?\n/).map((x) => x.replace(/^\s*\d+[.)-]?\s*/, "").trim()).filter(Boolean);
        d.close();
        run(() => data.addPlayers(team, names), `${names.length} player${names.length === 1 ? "" : "s"} added.`);
      });
    });
  }));
  $$("[data-ren]", el).forEach((b) => b.addEventListener("click", () => {
    const n = window.prompt("Player name:", b.dataset.name);
    if (n === null) return;
    run(() => data.renamePlayer(b.dataset.ren, n), "Name updated.");
  }));
  $$("[data-remove]", el).forEach((b) => b.addEventListener("click", () => {
    if (!window.confirm(`Remove ${b.dataset.name} from the squad?`)) return;
    run(() => data.removePlayer(b.dataset.remove), "Player removed.");
  }));
}

// ---- fixtures ----
function fixtureDialog(fx, rerender) {
  const date = fx?.kickoff ? dayKey(fx.kickoff) : "";
  const time = fx?.kickoff ? timeValue(fx.kickoff) : "09:00:00";
  const opts = (sel) => `<option value="">Choose…</option>${TEAMS.map((t) => `<option value="${t.id}" ${sel === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}`;
  dialog(`<form method="dialog" class="f" id="ff" style="max-width:none" novalidate>
    <h3>${fx ? "Edit fixture" : "Schedule a fixture"}</h3>
    <div class="row"><label>Home team<select name="home">${opts(fx?.homeId)}</select></label><label>Away team<select name="away">${opts(fx?.awayId)}</select></label></div>
    <div class="row"><label>Date<input type="date" name="date" value="${date}" required></label><label>Kick-off time<input type="time" step="1" name="time" value="${time}" required></label></div>
    <div class="row"><label>Match<select name="round"><option value="">—</option>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${fx?.round === n ? "selected" : ""}>${roundName(n)}</option>`).join("")}</select></label><label>Venue<input type="text" name="venue" maxlength="60" value="${esc(fx?.venue || "")}" placeholder="e.g. Main pitch"></label></div>
    <div id="derr" class="note bad" hidden></div>
    <div class="row"><button class="btn" type="submit">Save fixture</button><button class="btn ghost" type="button" data-close>Cancel</button></div>
  </form>`, (d) => {
    $("#ff", d).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, err = $("#derr", d);
      if (!f.home.value || !f.away.value) return (err.hidden = false, err.textContent = "Choose both teams.");
      if (f.home.value === f.away.value) return (err.hidden = false, err.textContent = "A team cannot play itself.");
      if (!f.date.value || !f.time.value) return (err.hidden = false, err.textContent = "Set the date and kick-off time.");
      const next = {
        ...(fx || { status: "scheduled", homeScore: null, awayScore: null, scorers: [] }),
        homeId: f.home.value, awayId: f.away.value, kickoff: toKickoff(f.date.value, f.time.value),
        round: f.round.value ? Number(f.round.value) : null, venue: f.venue.value.trim()
      };
      try { await data.saveFixture(next); d.close(); toast("Fixture saved."); rerender(); } catch (ex) { err.hidden = false; err.textContent = ex.message; }
    });
  });
}

function tabFixtures(el, { fixtures, players, rerender }) {
  const list = sortFixtures(fixtures);
  el.innerHTML = `<div class="row" style="margin-bottom:16px"><button class="btn" id="add" style="flex:0 0 auto">+ Schedule a fixture</button></div>
    <div class="card" style="margin-bottom:16px"><h3>Load the poster fixtures</h3>
      <p class="muted small" style="margin:4px 0 10px">Adds the 16 matches from the official poster (4 matches at 07:45, 08:48:45, 09:52:30 and 10:56:15, each 63 min 45 s). Pick the match day.</p>
      <div class="row"><label>Match day<input type="date" id="seeddate"></label><button class="btn ghost" id="seed" style="flex:0 0 auto">Load 16 fixtures</button></div></div>
    ${list.length ? list.map((f) => `<div class="fx" style="grid-template-columns:1fr auto 1fr">
      <div class="t h">${teamLabel(f.homeId, 26)}</div><div class="mid"><div class="score" style="font-size:20px">${f.kickoff ? esc(fmtTime(f.kickoff)) : "TBC"}</div></div><div class="t">${teamLabel(f.awayId, 26)}</div>
      <div class="meta">${f.round ? esc(roundName(f.round)) + " · " : ""}${f.kickoff ? esc(fmtDate(f.kickoff)) : ""}${f.venue ? " · " + esc(f.venue) : ""}${f.status === "finished" ? ` · Result ${f.homeScore}–${f.awayScore}` : ""}
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:center"><button class="btn ghost sm" data-edit="${esc(f.id)}">Edit</button><button class="btn ghost sm" data-lu="${esc(f.id)}">Line-up</button><button class="btn bad sm" data-del="${esc(f.id)}">Delete</button></div></div></div>`).join("") : `<div class="empty">No fixtures scheduled yet.</div>`}`;
  $("#add", el).addEventListener("click", () => fixtureDialog(null, rerender));
  $("#seed", el).addEventListener("click", async () => {
    const date = $("#seeddate", el).value;
    if (!date) return toast("Pick the match day first.", true);
    if (list.length && !window.confirm(`You already have ${list.length} fixtures. Add the 16 poster fixtures as well?`)) return;
    try { await data.seedFixtures(posterFixtures(date)); toast("16 fixtures added."); } catch (e) { toast(e.message, true); }
    rerender();
  });
  $$("[data-edit]", el).forEach((b) => b.addEventListener("click", () => fixtureDialog(list.find((f) => f.id === b.dataset.edit), rerender)));
  $$("[data-lu]", el).forEach((b) => b.addEventListener("click", () => lineupDialog(list.find((f) => f.id === b.dataset.lu), players, rerender)));
  $$("[data-del]", el).forEach((b) => b.addEventListener("click", async () => {
    if (!window.confirm("Delete this fixture? Any result on it is deleted too.")) return;
    try { await data.deleteFixture(b.dataset.del); toast("Fixture deleted."); } catch (e) { toast(e.message, true); }
    rerender();
  }));
}

// ---- line-ups, live scoreboard and results ----
function lineupDialog(f, players, rerender) {
  const sq = (team) => squadOf(players, team);
  const has = f.lineup && ((f.lineup.home || []).length || (f.lineup.away || []).length);
  const col = (side, team) => {
    const chosen = new Set((f.lineup?.[side] || []).map((p) => p.id));
    return `<div><h3 style="font-size:18px;margin-bottom:6px">${esc(teamById[team].name)}</h3>${sq(team).map((p) => `<label><input type="checkbox" data-side="${side}" value="${esc(p.uid)}" ${!has || chosen.has(p.uid) ? "checked" : ""}>${esc(p.name)}</label>`).join("") || `<p class="muted small">No players in this squad yet. Add them on the Squads tab.</p>`}</div>`;
  };
  dialog(`<form method="dialog" class="f" id="luf" style="max-width:none"><h3>Line-up</h3>
    <p class="muted small" style="margin:0">Tick the players who start. Everyone is ticked by default.</p>
    <div class="lugrid">${col("home", f.homeId)}${col("away", f.awayId)}</div>
    <div class="row"><button class="btn" type="submit">Save line-up</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, (d) => {
    $("#luf", d).addEventListener("submit", async (e) => {
      e.preventDefault();
      const pick = (side, team) => $$(`input[data-side=${side}]:checked`, d).map((i) => { const p = sq(team).find((x) => x.uid === i.value); return p && { id: p.uid, name: p.name }; }).filter(Boolean);
      try { await data.saveFixture({ id: f.id, lineup: { home: pick("home", f.homeId), away: pick("away", f.awayId) } }); d.close(); toast("Line-up saved."); rerender(); }
      catch (ex) { toast(ex.message, true); }
    });
  });
}

function goalDialog(f, side, players, rerender) {
  const team = side === "home" ? f.homeId : f.awayId;
  const sq = squadOf(players, team);
  dialog(`<form method="dialog" class="f" id="gf" style="max-width:none"><h3>⚽ Goal for ${esc(teamById[team].name)}</h3>
    <label>Scorer<select name="p"><option value="">Not recorded</option>${sq.map((p) => `<option value="${esc(p.uid)}">${esc(p.name)}</option>`).join("")}</select></label>
    <label>Minute (optional)<input type="text" name="m" inputmode="numeric" maxlength="3" placeholder="e.g. 23"></label>
    <div class="row"><button class="btn" type="submit">Add goal</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, (d) => {
    $("#gf", d).addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target, p = sq.find((x) => x.uid === form.p.value);
      const scorers = [...(f.scorers || [])];
      if (p) scorers.push({ playerId: p.uid, name: p.name, teamId: team, minute: form.m.value.trim() });
      try {
        await data.saveFixture({ id: f.id, status: "live", scorers, homeScore: (f.homeScore || 0) + (side === "home" ? 1 : 0), awayScore: (f.awayScore || 0) + (side === "away" ? 1 : 0) });
        d.close(); toast("Goal added. The scoreboard is updated."); rerender();
      } catch (ex) { toast(ex.message, true); }
    });
  });
}

async function undoGoal(f, side, rerender) {
  const team = side === "home" ? f.homeId : f.awayId;
  const cur = side === "home" ? f.homeScore || 0 : f.awayScore || 0;
  if (cur <= 0) return toast("That team has no goals to undo.", true);
  const scorers = [...(f.scorers || [])];
  const i = scorers.map((s) => s.teamId).lastIndexOf(team);
  if (i >= 0) scorers.splice(i, 1);
  try { await data.saveFixture({ id: f.id, scorers, [side === "home" ? "homeScore" : "awayScore"]: cur - 1 }); toast("Last goal undone."); } catch (e) { toast(e.message, true); }
  rerender();
}

function resultDialog(f, players, rerender) {
  const pool = [...squadOf(players, f.homeId), ...squadOf(players, f.awayId)];
  const scorerRow = (s = {}) => `<div class="sc"><select aria-label="Scorer">${pool.length ? pool.map((p) => `<option value="${esc(p.uid)}" ${s.playerId === p.uid ? "selected" : ""}>${esc(p.name)} (${teamById[p.team].short})</option>`).join("") : `<option value="">No players in the squads</option>`}</select>
    <input type="text" inputmode="numeric" maxlength="3" placeholder="Min" aria-label="Minute" value="${esc(s.minute || "")}"><button type="button" class="btn bad sm" data-rm aria-label="Remove scorer">✕</button></div>`;
  dialog(`<form method="dialog" class="f" id="rf" style="max-width:none" novalidate>
    <h3>${f.status === "live" ? "Edit live score" : "Enter result"}</h3>
    <div class="fx" style="margin:0"><div class="t h">${teamLabel(f.homeId, 26)}</div>
      <div class="mid inline" style="justify-content:center"><input type="number" min="0" max="99" name="hs" value="${f.homeScore ?? ""}" aria-label="${esc(teamById[f.homeId].name)} goals" required> <b>–</b> <input type="number" min="0" max="99" name="as" value="${f.awayScore ?? ""}" aria-label="${esc(teamById[f.awayId].name)} goals" required></div>
      <div class="t">${teamLabel(f.awayId, 26)}</div></div>
    <label>Match status<select name="st"><option value="finished" ${f.status !== "live" ? "selected" : ""}>Full time (final result)</option><option value="live" ${f.status === "live" ? "selected" : ""}>Still live</option></select></label>
    <div><div style="font-weight:600;font-size:13px;margin-bottom:6px">Goal scorers (optional)</div><div id="scs">${(f.scorers || []).map(scorerRow).join("")}</div>
      <button type="button" class="btn ghost sm" id="addsc" ${pool.length ? "" : "disabled"}>+ Add scorer</button></div>
    <div id="derr" class="note bad" hidden></div>
    <div class="row"><button class="btn" type="submit">Save</button>${f.status && f.status !== "scheduled" ? `<button class="btn bad" type="button" id="clr">Clear result</button>` : ""}<button class="btn ghost" type="button" data-close>Cancel</button></div>
  </form>`, (d) => {
    const wire = () => $$("[data-rm]", d).forEach((b) => (b.onclick = () => b.parentElement.remove()));
    wire();
    $("#addsc", d).addEventListener("click", () => { $("#scs", d).insertAdjacentHTML("beforeend", scorerRow()); wire(); });
    $("#clr", d)?.addEventListener("click", async () => {
      await data.saveFixture({ ...f, status: "scheduled", homeScore: null, awayScore: null, scorers: [] });
      d.close(); toast("Result cleared."); rerender();
    });
    $("#rf", d).addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target, err = $("#derr", d);
      const hs = parseInt(form.hs.value, 10), as = parseInt(form.as.value, 10);
      if (!(hs >= 0) || !(as >= 0)) return (err.hidden = false, err.textContent = "Enter both scores (0 or more).");
      const scorers = $$(".sc", d).map((row) => {
        const p = pool.find((x) => x.uid === $("select", row).value);
        return p ? { playerId: p.uid, name: p.name, teamId: p.team, minute: $("input", row).value.trim() } : null;
      }).filter(Boolean);
      const hg = scorers.filter((s) => s.teamId === f.homeId).length, ag = scorers.filter((s) => s.teamId === f.awayId).length;
      if (hg > hs || ag > as) return (err.hidden = false, err.textContent = "More goal scorers than goals scored. Check the scores or remove a scorer.");
      try { await data.saveFixture({ ...f, status: form.st.value, homeScore: hs, awayScore: as, scorers }); d.close(); toast(form.st.value === "live" ? "Live score updated." : "Result saved. The table is updated."); rerender(); }
      catch (ex) { err.hidden = false; err.textContent = ex.message; }
    });
  });
}

function tabResults(el, { fixtures, players, rerender }) {
  const list = sortFixtures(fixtures);
  const order = { live: 0, scheduled: 1, finished: 2 };
  const rows = [...list].sort((a, b) => (order[a.status || "scheduled"] - order[b.status || "scheduled"]));
  el.innerHTML = rows.length ? `<p class="muted small" style="margin-top:0">Match day: set the line-up, press <b>Start match</b>, tap <b>⚽ goal</b> each time a team scores, and press <b>Full time</b> at the end. Everyone watching sees every change straight away.</p>` + rows.map((f) => {
    const st = f.status || "scheduled";
    const home = teamById[f.homeId], away = teamById[f.awayId];
    const mid = st === "scheduled" ? `<div class="score" style="font-size:20px">${f.kickoff ? esc(fmtTime(f.kickoff)) : "TBC"}</div>`
      : `<div class="score">${f.homeScore ?? 0} – ${f.awayScore ?? 0}</div>${st === "live" ? `<div class="livetag"><span class="dot"></span>LIVE</div>` : `<div class="small muted">FT</div>`}`;
    const hasLu = f.lineup && ((f.lineup.home || []).length || (f.lineup.away || []).length);
    const ctl = st === "scheduled"
      ? `<button class="btn sm" data-start="${esc(f.id)}">Start match</button><button class="btn ghost sm" data-lu="${esc(f.id)}">${hasLu ? "Edit line-up" : "Set line-up"}</button><button class="btn ghost sm" data-res="${esc(f.id)}">Enter final result</button>`
      : st === "live"
        ? `<button class="btn sm" data-goal="home" data-id="${esc(f.id)}">⚽ ${esc(home.short)} goal</button><button class="btn sm" data-goal="away" data-id="${esc(f.id)}">⚽ ${esc(away.short)} goal</button>
           <button class="btn ghost sm" data-undo="home" data-id="${esc(f.id)}">Undo ${esc(home.short)}</button><button class="btn ghost sm" data-undo="away" data-id="${esc(f.id)}">Undo ${esc(away.short)}</button>
           <button class="btn ghost sm" data-lu="${esc(f.id)}">${hasLu ? "Line-up" : "Set line-up"}</button><button class="btn ghost sm" data-res="${esc(f.id)}">Edit score</button><button class="btn bad sm" data-ft="${esc(f.id)}">Full time</button>`
        : `<button class="btn ghost sm" data-res="${esc(f.id)}">Edit result</button><button class="btn ghost sm" data-lu="${esc(f.id)}">${hasLu ? "Line-up" : "Set line-up"}</button>`;
    return `<div class="fx${st === "live" ? " is-live" : ""}"><div class="t h">${teamLabel(f.homeId, 26)}</div><div class="mid">${mid}</div><div class="t">${teamLabel(f.awayId, 26)}</div>
      <div class="meta">${f.round ? esc(roundName(f.round)) + " · " : ""}${f.kickoff ? esc(fmtDate(f.kickoff)) : ""}</div><div class="ctl">${ctl}</div></div>`;
  }).join("") : `<div class="empty">Schedule fixtures first, then run the matches from here.</div>`;
  const byId = (id) => list.find((f) => f.id === id);
  $$("[data-res]", el).forEach((b) => b.addEventListener("click", () => resultDialog(byId(b.dataset.res), players, rerender)));
  $$("[data-lu]", el).forEach((b) => b.addEventListener("click", () => lineupDialog(byId(b.dataset.lu), players, rerender)));
  $$("[data-goal]", el).forEach((b) => b.addEventListener("click", () => goalDialog(byId(b.dataset.id), b.dataset.goal, players, rerender)));
  $$("[data-undo]", el).forEach((b) => b.addEventListener("click", () => undoGoal(byId(b.dataset.id), b.dataset.undo, rerender)));
  $$("[data-start]", el).forEach((b) => b.addEventListener("click", async () => {
    const f = byId(b.dataset.start);
    try { await data.saveFixture({ id: f.id, status: "live", homeScore: 0, awayScore: 0, scorers: f.scorers || [] }); toast("Match started. It now shows LIVE on the site."); } catch (e) { toast(e.message, true); }
    rerender();
  }));
  $$("[data-ft]", el).forEach((b) => b.addEventListener("click", async () => {
    const f = byId(b.dataset.ft);
    if (!window.confirm(`End the match at ${f.homeScore ?? 0} – ${f.awayScore ?? 0}? The table will be updated.`)) return;
    try { await data.saveFixture({ id: f.id, status: "finished" }); toast("Full time. The table is updated."); } catch (e) { toast(e.message, true); }
    rerender();
  }));
}
