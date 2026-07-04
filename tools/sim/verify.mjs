// Per-scenario assertions over the simulated pipeline output.
// Each check pushes a failure string; empty list = scenario passes.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const loadDir = async (dataDir) => {
  const index = JSON.parse(await readFile(path.join(dataDir, 'index.json'), 'utf8'))
  const seats = {}
  for (const f of await readdir(path.join(dataDir, 'seats'))) {
    const d = JSON.parse(await readFile(path.join(dataDir, 'seats', f), 'utf8'))
    seats[d.code] = d
  }
  return { index, seats }
}

// normalize away fields the simulation intentionally does not reproduce
// exactly (price medians re-derive from sparse fixture obs; careers rebuild
// from truncated contest lists; source_health depends on the live monitor)
const normalizeSeat = (s) => {
  const c = structuredClone(s)
  c.prices = null
  // result_date is a new output field; committed data predates it, so ignore
  // it in the pending-fidelity baseline (real rebuilds populate it everywhere)
  if (c.election2026) delete c.election2026.result_date
  if (c.election2026?.ballot) for (const b of c.election2026.ballot) b.career = b.career ? '<career>' : null
  if (c.saluran2022) for (const dm of c.saluran2022.dms) dm.turnout_perc = dm.turnout_perc == null ? null : Math.round(dm.turnout_perc)
  c.bbox = c.bbox ? c.bbox.map(v => Math.round(v * 10) / 10) : null
  return c
}
const normalizeSummary = (s) => {
  const c = { ...s }
  delete c.kpdn_district // re-derived, unchanged by flip
  return c
}

const diffPaths = (a, b, base = '', out = [], depth = 0) => {
  if (out.length > 25 || depth > 12) return out
  if (a === b) return out
  if (typeof a !== typeof b || a == null || b == null || typeof a !== 'object') {
    if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6) return out
    out.push(`${base}: ${JSON.stringify(a)?.slice(0, 60)} != ${JSON.stringify(b)?.slice(0, 60)}`)
    return out
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) diffPaths(a[k], b[k], `${base}.${k}`, out, depth + 1)
  return out
}

export async function verifyScenario(scenario, simDataDir, committedDataDir) {
  const failures = []
  const ok = (cond, msg) => { if (!cond) failures.push(msg) }
  const sim = await loadDir(simDataDir)

  const flippedCodes = {
    'pending': [], 'full-flip': null, // null = all
    'partial-flip': Object.keys(sim.seats).filter(c => Number(c.slice(2)) <= 28),
    'stats-lag': null,
    'garbage': [], // garbage seats are NOT expected to flip cleanly
    'appended': [], // appended seats are the interesting ones, asserted separately
  }[scenario]

  const codes = Object.keys(sim.seats).sort()
  ok(codes.length === 56, `expected 56 seats, got ${codes.length}`)

  // candidate-record layer: every candidate with a career must carry an
  // ordered party_timeline, and a known cross-party mover must show >1 party
  for (const code of codes) {
    for (const b of sim.seats[code].election2026?.ballot ?? []) {
      if (!b.career) continue
      const tl = b.career.party_timeline
      ok(Array.isArray(tl), `${code}/${b.name}: career missing party_timeline`)
      if (Array.isArray(tl)) {
        const years = tl.map(s => s.from)
        ok(years.every((y, i) => i === 0 || y >= years[i - 1]), `${code}/${b.name}: party_timeline not oldest-first`)
        ok(tl.every((s, i) => i === 0 || s.party !== tl[i - 1].party), `${code}/${b.name}: adjacent same-party stints not merged`)
      }
    }
  }
  {
    // N.44 Larkin carries Suhaizan bin Kaiat (PAS → AMANAH), our timeline fixture
    const suhaizan = (sim.seats['N.44']?.election2026?.ballot ?? []).find(b => b.name.includes('Suhaizan'))
    if (suhaizan) {
      const parties = new Set((suhaizan.career?.party_timeline ?? []).map(s => s.party))
      ok(parties.size > 1, `N.44 Suhaizan should show a multi-party timeline, got ${[...parties].join('/')}`)
    }
  }

  // ---- MUDA edition gating + Undi18 rollup consistency (all scenarios) ----
  {
    const jc = sim.index.johor_context ?? {}
    ok(jc.undi18?.total_18_20 > 0, 'undi18 rollup missing/zero')
    let sum1820 = 0
    for (const code of codes) {
      const rolls = sim.seats[code].demographics ?? []
      const d = rolls.find(x => x.election === 'JHR-SE-16') ?? rolls[0]
      sum1820 += d?.age?.age_18_20 ?? 0
    }
    ok(jc.undi18?.total_18_20 === sum1820, `undi18 total ${jc.undi18?.total_18_20} != seat sum ${sum1820}`)
    if (sim.index.edition === 'muda') {
      ok((sim.index.muda_record?.national?.length ?? 0) > 0, 'muda edition missing muda_record.national')
      ok((jc.muda?.seats_contested ?? 0) > 0, 'muda edition missing johor_context.muda')
      const txt = JSON.stringify(sim.index.muda_record ?? {})
      ok(!/MUDA (passed|tabled|meluluskan|membentangkan) undi18/i.test(txt), 'guardrail: Undi18 must attribute to Syed Saddiq, not the MUDA party')
    } else {
      ok(sim.index.muda_record == null, 'neutral edition must omit muda_record')
      ok(jc.muda == null, 'neutral edition must omit johor_context.muda')
    }
  }

  if (scenario === 'pending') {
    // fidelity baseline: simulated output must reproduce the committed data
    const com = await loadDir(committedDataDir)
    for (const code of codes) {
      const d = diffPaths(normalizeSeat(com.seats[code]), normalizeSeat(sim.seats[code]), code)
      failures.push(...d.slice(0, 5))
    }
    const comSum = Object.fromEntries(com.index.seats.map(s => [s.code, normalizeSummary(s)]))
    const simSum = Object.fromEntries(sim.index.seats.map(s => [s.code, normalizeSummary(s)]))
    for (const code of codes) failures.push(...diffPaths(comSum[code], simSum[code], `index:${code}`).slice(0, 3))
    return failures
  }

  const isFlipped = (code) => flippedCodes === null || flippedCodes.includes(code)

  for (const code of codes) {
    const s = sim.seats[code]
    const sum = sim.index.seats.find(x => x.code === code)
    const flipped = scenario === 'appended' ? false : isFlipped(code)
    const special = (scenario === 'garbage' && Number(code.slice(2)) <= 5)
      || (scenario === 'appended' && ['N.41', 'N.13', 'N.48'].includes(code))

    if (flipped) {
      ok(s.election2026.ballot === null, `${code}: election2026.ballot should be null post-flip`)
      const h0 = s.history[0]
      ok(h0?.date === '2026-07-11', `${code}: history[0] should be the 2026 contest, got ${h0?.date}`)
      ok(h0?.status === 'completed', `${code}: history[0].status should be completed`)
      ok(h0?.ballot?.[0]?.result?.startsWith('won'), `${code}: history[0].ballot[0] should be the winner`)
      ok((h0?.ballot ?? []).every(b => b.result !== 'pending'), `${code}: no pending rows in completed 2026 contest`)
      const totalVotes = (h0?.ballot ?? []).reduce((a, b) => a + (b.votes ?? 0), 0)
      ok(totalVotes > 0, `${code}: completed 2026 contest has zero total votes`)
      ok(sum.last_result?.date === '2026-07-11', `${code}: index last_result should be the 2026 result`)
      ok(sum.last_result?.winner === h0?.ballot?.[0]?.name, `${code}: index winner mismatch`)
      if (scenario !== 'stats-lag') {
        ok(h0?.voters_total != null, `${code}: 2026 stats (voters_total) missing`)
        ok(h0?.majority_perc != null, `${code}: 2026 stats (majority_perc) missing`)
        ok(sum.last_result?.majority_perc != null, `${code}: index majority_perc missing`)
      } else {
        ok(h0?.voters_total == null, `${code}: stats-lag should leave voters_total absent`)
      }
    } else if (!special) {
      ok(Array.isArray(s.election2026.ballot) && s.election2026.ballot.length > 0,
        `${code}: still-pending seat should keep its 2026 ballot`)
      ok(s.history[0]?.date !== '2026-07-11', `${code}: pending seat should have no 2026 history entry`)
      ok(s.election2026.ballot?.every(b => b.result === 'pending') ?? false,
        `${code}: pending ballot rows should all be result=pending`)
    }
  }

  // scenario-specific probes documenting the interesting behavior
  if (scenario === 'garbage') {
    for (const code of ['N.01', 'N.02', 'N.03', 'N.04', 'N.05']) {
      const s = sim.seats[code]
      const h0 = s.history[0]
      // blanked result strings must NOT be published as a completed contest
      ok(!(h0?.date === '2026-07-11' && h0?.status === 'completed'),
        `${code}: blanked-result mid-count rows were published as a completed 2026 contest (winner='${h0?.ballot?.[0]?.name}', total votes=${(h0?.ballot ?? []).reduce((a, b) => a + (b.votes ?? 0), 0)})`)
    }
  }
  if (scenario === 'appended') {
    for (const code of ['N.41', 'N.13', 'N.48']) {
      const s = sim.seats[code]
      const nUnique = new Set((s.election2026.ballot ?? s.history[0]?.ballot ?? []).map(b => b.uid)).size
      const nRows = (s.election2026.ballot ?? s.history[0]?.ballot ?? []).length
      ok(nRows === nUnique, `${code}: duplicated candidates after lake append (${nRows} rows, ${nUnique} unique)`)
      ok(s.election2026.ballot === null && s.history[0]?.date === '2026-07-11',
        `${code}: appended result rows should still complete the contest (ballot=${s.election2026.ballot ? 'stuck' : 'null'}, history[0]=${s.history[0]?.date})`)
    }
  }
  if ((scenario === 'full-flip' || scenario === 'partial-flip') && isFlipped('N.48')) {
    const sum = sim.index.seats.find(x => x.code === 'N.48')
    ok(sum.featured === true, 'N.48 Skudai (PSM) should stay featured after the flip')
    ok(sum.bloc_party === 'PSM', `N.48 bloc_party should survive the flip, got ${sum.bloc_party}`)
    ok(sum.muda_candidate != null, 'N.48 bloc candidate name should survive the flip')
  }
  if (scenario === 'full-flip') {
    const n41 = sim.seats['N.41']
    ok(n41.election2026.bloc_party != null,
      `N.41 seat JSON bloc_party should survive the flip (share text renders "(null)" otherwise), got ${n41.election2026.bloc_party}`)
    const sum41 = sim.index.seats.find(x => x.code === 'N.41')
    ok(sum41.n_candidates_2026 != null, 'N.41 n_candidates_2026 should survive the flip')
  }
  return failures
}
