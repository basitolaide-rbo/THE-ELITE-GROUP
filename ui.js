import { LEAGUE } from "./config.js";
import { TEAMS, teamById, badge } from "./teams.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(msg, bad = false) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

// ---- dates (always shown in Lagos time) ----
const tz = LEAGUE.timezone;
export const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" });
export function fmtTime(iso) {
  const d = new Date(iso);
  const secs = Number(d.toLocaleString("en-GB", { timeZone: tz, second: "2-digit" }));
  return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...(secs ? { second: "2-digit" } : {}), hour12: false });
}
export const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
export const timeValue = (iso) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour12: false });

export const teamLabel = (id, size = 28) => `${badge(id, size)}<span>${esc(teamById[id]?.name || id)}</span>`;

// ---- league maths ----
export const sortFixtures = (list) => [...list].sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || "") || (a.round || 0) - (b.round || 0));

export function computeTable(fixtures) {
  const rows = Object.fromEntries(TEAMS.map((t) => [t.id, { id: t.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  fixtures.filter((f) => f.status === "finished" && rows[f.homeId] && rows[f.awayId]).forEach((f) => {
    const h = rows[f.homeId], a = rows[f.awayId];
    h.p++; a.p++;
    h.gf += f.homeScore; h.ga += f.awayScore; a.gf += f.awayScore; a.ga += f.homeScore;
    if (f.homeScore > f.awayScore) { h.w++; a.l++; h.pts += 3; }
    else if (f.homeScore < f.awayScore) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  });
  return Object.values(rows)
    .map((r) => ({ ...r, gd: r.gf - r.ga }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || teamById[x.id].name.localeCompare(teamById[y.id].name));
}

export function topScorers(fixtures) {
  const m = new Map();
  fixtures.filter((f) => f.status === "finished").forEach((f) => (f.scorers || []).forEach((s) => {
    const key = s.playerId || s.name;
    const cur = m.get(key) || { name: s.name, teamId: s.teamId, goals: 0 };
    cur.goals++;
    m.set(key, cur);
  }));
  return [...m.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

export const squadOf = (players, teamId) => players.filter((p) => p.team === teamId).sort((a, b) => a.name.localeCompare(b.name));

export const ROUND_NAMES = ["", "First match", "Second match", "Third match", "Fourth match"];
export const roundName = (n) => ROUND_NAMES[n] || `Round ${n}`;
