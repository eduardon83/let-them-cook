// planner.js — turns "how many students" + a mission's role rules into brigades.
// Pure functions (no DOM), so the maths is easy to check and reuse in the printed packs.
//
// Mission rules (lessons.json → roles):
//   teamSize { min, ideal, max }
//   perTeam  [{ role, count } | { role, count, optional } | { role, fill }]
//   shared   [{ role, perTeams, teacherCanCover } | { role, count, teacherCanCover }]
// Teacher choices: teacherRoles = role ids the teacher plays (shared roles: the teacher serves
// every brigade; a per-team role only when there is a single brigade).

/** Brigade names pair a colour with a shape, so they work for colour-blind learners too. */
export const BRIGADES = [
  { name: 'Tomato', color: '#e4572e', shape: 'circle', mascot: 'food/tomato' },
  { name: 'Broccoli', color: '#3f8f5b', shape: 'triangle', mascot: 'food/broccoli' },
  { name: 'Lemon', color: '#c9a227', shape: 'square', mascot: 'food/lemon' },
  { name: 'Grape', color: '#6b4fa0', shape: 'diamond', mascot: 'food/grapes' },
  { name: 'Fish', color: '#3b8fc4', shape: 'star', mascot: 'food/fish' },
  { name: 'Radish', color: '#d64f8b', shape: 'hexagon', mascot: 'food/radish' },
  { name: 'Avocado', color: '#7a7d2e', shape: 'heart', mascot: 'food/avocado' },
  { name: 'Cookie', color: '#7b4a2e', shape: 'cross', mascot: 'food/cookie' },
  { name: 'Mint', color: '#2fa39a', shape: 'moon', mascot: 'food/ice-cream-scoop-mint' },
  { name: 'Carrot', color: '#e07b1a', shape: 'drop', mascot: 'food/carrot' }
];

export function shapeSVG(shape, color = 'currentColor', size = 18) {
  const s = size, h = s / 2;
  const paths = {
    circle: `<circle cx="${h}" cy="${h}" r="${h * 0.8}"/>`,
    triangle: `<path d="M${h} ${s * 0.1} L${s * 0.92} ${s * 0.88} L${s * 0.08} ${s * 0.88}Z"/>`,
    square: `<rect x="${s * 0.14}" y="${s * 0.14}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.08}"/>`,
    diamond: `<path d="M${h} ${s * 0.05} L${s * 0.95} ${h} L${h} ${s * 0.95} L${s * 0.05} ${h}Z"/>`,
    star: `<path d="M${h} ${s * 0.06} L${s * 0.62} ${s * 0.38} L${s * 0.96} ${s * 0.39} L${s * 0.69} ${s * 0.6} L${s * 0.79} ${s * 0.93} L${h} ${s * 0.74} L${s * 0.21} ${s * 0.93} L${s * 0.31} ${s * 0.6} L${s * 0.04} ${s * 0.39} L${s * 0.38} ${s * 0.38}Z"/>`,
    hexagon: `<path d="M${s * 0.27} ${s * 0.1} L${s * 0.73} ${s * 0.1} L${s * 0.96} ${h} L${s * 0.73} ${s * 0.9} L${s * 0.27} ${s * 0.9} L${s * 0.04} ${h}Z"/>`,
    heart: `<path d="M${h} ${s * 0.88} C${s * 0.1} ${s * 0.6} ${s * 0.02} ${s * 0.32} ${s * 0.26} ${s * 0.18} C${s * 0.4} ${s * 0.1} ${h} ${s * 0.2} ${h} ${s * 0.3} C${h} ${s * 0.2} ${s * 0.6} ${s * 0.1} ${s * 0.74} ${s * 0.18} C${s * 0.98} ${s * 0.32} ${s * 0.9} ${s * 0.6} ${h} ${s * 0.88}Z"/>`,
    cross: `<path d="M${s * 0.36} ${s * 0.08} H${s * 0.64} V${s * 0.36} H${s * 0.92} V${s * 0.64} H${s * 0.64} V${s * 0.92} H${s * 0.36} V${s * 0.64} H${s * 0.08} V${s * 0.36} H${s * 0.36}Z"/>`,
    moon: `<path d="M${s * 0.66} ${s * 0.08} A${s * 0.42} ${s * 0.42} 0 1 0 ${s * 0.92} ${s * 0.7} A${s * 0.34} ${s * 0.34} 0 1 1 ${s * 0.66} ${s * 0.08}Z"/>`,
    drop: `<path d="M${h} ${s * 0.06} C${s * 0.75} ${s * 0.38} ${s * 0.86} ${s * 0.55} ${s * 0.86} ${s * 0.64} A${s * 0.36} ${s * 0.32} 0 0 1 ${s * 0.14} ${s * 0.64} C${s * 0.14} ${s * 0.55} ${s * 0.25} ${s * 0.38} ${h} ${s * 0.06}Z"/>`
  };
  return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="${color}" aria-hidden="true">${paths[shape] || paths.circle}</svg>`;
}

function sharedCount(rule, teams) {
  if (rule.count) return rule.count;
  return Math.ceil(teams / (rule.perTeams || 1));
}

/**
 * @returns {{ teams: Array<{name, color, shape, size, roles: Array<{role, count}>}>,
 *   shared: Array<{role, count, teacher: boolean}>, studentsInTeams: number, warnings: string[] }}
 */
export function planTeams(lesson, plan) {
  const S = Math.max(1, Math.floor(plan.students || 1));
  const rules = lesson.roles || { teamSize: { min: 3, ideal: 4, max: 5 }, perTeam: [{ role: 'line-cook', fill: true }], shared: [] };
  const size = { min: 3, ideal: 4, max: 5, ...rules.teamSize };
  const teacher = new Set(plan.teacherRoles || []);
  const warnings = [];

  let best = null;
  for (let T = 1; T <= Math.max(1, Math.floor(S / Math.max(1, size.min - 1))); T++) {
    const sharedStudents = (rules.shared || []).reduce((sum, r) => sum + (teacher.has(r.role) ? 0 : sharedCount(r, T)), 0);
    const inTeams = S - sharedStudents;
    if (inTeams < T) break;
    const avg = inTeams / T;
    const fits = inTeams >= T * size.min && inTeams <= T * size.max;
    const score = (fits ? 0 : 100) + Math.abs(avg - size.ideal);
    if (!best || score < best.score) best = { T, inTeams, sharedStudents, score, fits };
  }
  if (!best) {
    // Too few learners for any shared station: the teacher plays them all.
    best = { T: 1, inTeams: S, sharedStudents: 0, fits: false };
    for (const r of rules.shared || []) teacher.add(r.role);
    if ((rules.shared || []).length) warnings.push('Very small group: you play every shared role yourself, and learners stay in one brigade.');
  }

  const T = best.T;
  const shared = (rules.shared || []).map((r) => ({ role: r.role, count: teacher.has(r.role) ? 0 : sharedCount(r, T), teacher: teacher.has(r.role), teacherCanCover: !!r.teacherCanCover }));
  const base = Math.floor(best.inTeams / T), extra = best.inTeams % T;
  const teams = [];
  for (let i = 0; i < T; i++) {
    const n = base + (i < extra ? 1 : 0);
    const brigade = BRIGADES[i % BRIGADES.length];
    teams.push({ ...brigade, name: `${brigade.name} Brigade${i >= BRIGADES.length ? ' ' + (Math.floor(i / BRIGADES.length) + 1) : ''}`, size: n, roles: allocate(rules.perTeam || [], n, T === 1 ? teacher : new Set()) });
  }

  if (!best.fits) {
    if (best.inTeams / T < size.min) warnings.push(`Brigades are smaller than the ideal ${size.min}. Consider stepping into a role yourself, or let one learner hold two roles.`);
    else warnings.push(`Brigades are larger than ${size.max}. Give extra learners the Line Cook or Language Guardian role, or run two rounds.`);
  }
  for (const t of teams) {
    const required = (rules.perTeam || []).filter((r) => !r.optional && !r.fill).reduce((a, r) => a + (r.count || 1), 0);
    if (t.size < required) { warnings.push(`${t.name} has ${t.size} learner(s) for ${required} key roles: someone will hold two roles.`); break; }
  }
  const coverable = (rules.shared || []).filter((r) => r.teacherCanCover && !teacher.has(r.role) && sharedCount(r, T) > 0);
  if (S < 8 && coverable.length) warnings.push(`Small class: you could play the ${coverable.map((r) => r.role.replace('-', ' ')).join(' and ')} yourself to keep everyone cooking.`);
  for (const r of rules.shared || []) if (teacher.has(r.role) && sharedCount(r, T) > 1) warnings.push(`You play the ${r.role.replace('-', ' ')} for all ${T} brigades: serve them one at a time, or stagger the start.`);

  return { teams, shared, studentsInTeams: best.inTeams, students: S, warnings };
}

function allocate(perTeam, n, teacher) {
  const roles = [];
  let left = n;
  const fill = perTeam.find((r) => r.fill);
  for (const r of perTeam.filter((r) => !r.optional && !r.fill)) {
    if (teacher.has(r.role)) { roles.push({ role: r.role, count: 0, teacher: true }); continue; }
    const c = Math.min(left, r.count || 1); roles.push({ role: r.role, count: c }); left -= c;
  }
  const reserve = fill ? 1 : 0;
  for (const r of perTeam.filter((r) => r.optional)) {
    const c = r.count || 1;
    if (left - c >= reserve) { roles.push({ role: r.role, count: c }); left -= c; }
  }
  if (fill && left > 0) roles.push({ role: fill.role, count: left });
  else if (!fill && left > 0 && roles.length) roles[roles.length - 1].count += left;
  return roles;
}

/** Words chosen for a plan: first N, skipping tags the teacher wants to avoid. */
export function chooseWords(lesson, plan) {
  const avoid = new Set(plan.avoid || []);
  const ok = (lesson.words || []).filter((w) => !(w.tags || []).some((t) => avoid.has(t)));
  return ok.slice(0, Math.max(1, plan.words || 12));
}
