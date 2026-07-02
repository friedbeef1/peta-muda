// Peta MUDA pipeline: joins electiondata.my (results, voter rolls, boundaries),
// data.gov.my / OpenDOSM (income, poverty, labour, CPI, fuel) and KPDN
// PriceCatcher (via storage.data.gov.my, discovered/health-checked through
// pasarapi.xyz) into static JSON consumed by the site in /site.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchJson } from './lib/fetch.mjs'
import { SOURCES, DATASET_IDS, ELECTION_2026, STATE } from './config.mjs'
import { loadSeats } from './steps/seats.mjs'
import { loadHistory, loadCareers } from './steps/history.mjs'
import { loadSaluran } from './steps/saluran.mjs'
import { loadDemographics } from './steps/demographics.mjs'
import { loadKawasanku } from './steps/kawasanku.mjs'
import { loadSocio, loadDunParlimen, loadCpi, loadFuel } from './steps/socio.mjs'
import { loadPrices, mergeDistrict } from './steps/prices.mjs'
import { loadGeo } from './steps/geo.mjs'

const OUT = path.join('site', 'data')
const t0 = Date.now()
const log = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`)

// ---- source health via pasarapi.xyz (best effort) ----
let health = null
try {
  const h = await fetchJson(SOURCES.pasarHealth)
  health = Object.fromEntries(DATASET_IDS.map(id => [id, h.health?.[id] ? { ok: h.health[id].ok, status: h.health[id].status } : null]))
  log('pasarapi health fetched')
} catch (e) {
  log(`pasarapi health unavailable: ${e.message}`)
}

// ---- load everything ----
log('loading DUN->parlimen crosswalk (data.gov.my)')
const dunParlimen = await loadDunParlimen()
log('loading seat spine (electiondata.my)')
const seats = await loadSeats(dunParlimen)
log(`seats: ${seats.length} (featured: ${seats.filter(s => s.featured).map(s => s.code).join(', ')})`)

log('loading election history (lake headline files)')
const history = await loadHistory(seats)
// career records for everyone on a 2026 ballot
const pendingUids = new Set()
for (const seat of seats) {
  for (const c of history.get(seat.code) ?? []) {
    if (c.status === 'upcoming') for (const b of c.ballot) if (b.uid) pendingUids.add(b.uid)
  }
}
log(`loading career records for ${pendingUids.size} 2026 candidates`)
const careers = pendingUids.size ? await loadCareers(pendingUids) : new Map()
log('loading saluran-level SE-15 results')
const saluran = await loadSaluran(seats)
log('loading voter demographics (incl. SE-16 roll)')
const demographics = await loadDemographics(seats)
log('loading kawasanku scorecard')
const kawasanku = await loadKawasanku(seats)
log('loading socioeconomic series (data.gov.my)')
const { socio } = await loadSocio(seats)
log('loading CPI + fuel')
const cpi = await loadCpi()
const fuel = await loadFuel()
log('loading PriceCatcher (this downloads a few MB per month on first run)')
const prices = await loadPrices()
log(`basket: ${prices.basket.map(b => `${b.key}=#${b.code}(${b.johor_coverage})`).join(' ')}`)
log('loading boundaries')
const { geojson, bboxes } = await loadGeo(seats)

// ---- manual 2026 contest info ----
let manual = { election: {}, seats: {} }
try {
  manual = JSON.parse(await readFile(path.join('data', 'manual', 'se16.json'), 'utf8'))
} catch { log('no manual se16.json, using config defaults') }

// ---- assemble ----
await mkdir(path.join(OUT, 'seats'), { recursive: true })

const priceBlockFor = (seat) => {
  const districts = [...new Set(seat.kpdn_districts.map(mergeDistrict))]
  const district = districts[0] ?? null
  const items = prices.basket.map(b => {
    const s = prices.series[b.code]
    const dSeries = district ? (s.districts[district] ?? {}) : {}
    const weeks = prices.weeks
    // anchor on the series' own latest valued week (a sparse district can lag
    // the shared axis); a change is only reported against a strictly earlier
    // observation at least `back` weeks before it, else null
    const idxOfLast = (series) => {
      for (let i = weeks.length - 1; i >= 0; i--) if (series[weeks[i]] != null) return i
      return -1
    }
    const refBefore = (series, from, back) => {
      for (let i = from - back; i >= 0; i--) if (series[weeks[i]] != null) return series[weeks[i]]
      return null
    }
    const lastD = idxOfLast(dSeries)
    const latest = lastD >= 0 ? dSeries[weeks[lastD]] : null
    const w4 = lastD >= 0 ? refBefore(dSeries, lastD, 4) : null
    const w12 = lastD >= 0 ? refBefore(dSeries, lastD, 12) : null
    const lastJ = idxOfLast(s.johor)
    const latestJohor = lastJ >= 0 ? s.johor[weeks[lastJ]] : null
    const lastN = idxOfLast(s.national)
    // change since the previous Johor election (2022-03), district scope when
    // both ends exist there, else Johor scope
    const aD = district ? prices.anchor.districts[district]?.[b.code] ?? null : null
    const aJ = prices.anchor.johor[b.code] ?? null
    let since_se15 = null
    if (latest != null && aD) since_se15 = { perc: +(100 * (latest - aD) / aD).toFixed(1), then: aD, scope: 'district' }
    else if (latestJohor != null && aJ) since_se15 = { perc: +(100 * (latestJohor - aJ) / aJ).toFixed(1), then: aJ, scope: 'johor' }
    return {
      code: b.code, key: b.key, label_bm: b.label_bm, label_en: b.label_en, item: b.item, unit: b.unit,
      latest_district: latest,
      latest_johor: latestJohor,
      latest_national: lastN >= 0 ? s.national[weeks[lastN]] : null,
      change_4w_perc: latest != null && w4 ? +(100 * (latest - w4) / w4).toFixed(1) : null,
      change_12w_perc: latest != null && w12 ? +(100 * (latest - w12) / w12).toFixed(1) : null,
      since_se15,
      series: { district: dSeries, johor: s.johor, national: s.national },
    }
  })
  return { district, weeks: prices.weeks, max_date: prices.max_date, anchor_month: prices.anchor.month, items, premises: district ? (prices.latest[district] ?? []).slice(0, 25) : [] }
}

const summaries = []
for (const seat of seats) {
  const demo = demographics.get(seat.code) ?? []
  const current = demo.find(d => d.election === 'JHR-SE-16') ?? demo[0] ?? null
  const hist = history.get(seat.code) ?? []
  const upcoming = hist.find(c => c.status === 'upcoming') ?? null
  const completed = hist.filter(c => c.status === 'completed')
  const last = completed[0] ?? null
  const priceBlock = priceBlockFor(seat)
  const manualSeat = manual.seats?.[seat.code] ?? null

  const youth = current ? +((100 * (current.age.age_18_20 + current.age.age_21_29)) / current.voters_total).toFixed(1) : null
  // Progressive Bloc candidate on the 2026 ballot (MUDA or PSM, from live data)
  const blocCandidate = upcoming?.ballot.find(b => b.party === 'MUDA' || b.party === 'PSM') ?? null
  // a seat is featured if configured as a target OR a bloc candidate is on the ballot
  const featured = seat.featured || !!blocCandidate
  const ballot2026 = upcoming ? upcoming.ballot.map(b => ({ ...b, career: careers.get(b.uid) ?? null })) : null

  const seatJson = {
    ...seat,
    featured,
    bbox: bboxes.get(seat.code) ?? null,
    election2026: {
      ...ELECTION_2026,
      ...(manual.election ?? {}),
      ...(manualSeat ?? {}),
      is_target: featured,
      ballot: ballot2026,
      voters_total: upcoming?.voters_total ?? current?.voters_total ?? null,
      muda_candidate: blocCandidate?.name ?? manualSeat?.muda_candidate ?? null,
      bloc_party: blocCandidate?.party ?? null,
    },
    demographics: demo,
    history: completed,
    saluran2022: saluran.get(seat.code),
    socio: socio.get(seat.code) ?? {},
    kawasanku: kawasanku.get(seat.code) ?? null,
    prices: priceBlock,
  }
  await writeFile(path.join(OUT, 'seats', `${seat.slug}.json`), JSON.stringify(seatJson))

  summaries.push({
    code: seat.code, name: seat.name, slug: seat.slug, parlimen: seat.parlimen,
    kpdn_district: priceBlock.district, featured,
    muda_candidate: blocCandidate?.name ?? manualSeat?.muda_candidate ?? null,
    bloc_party: blocCandidate?.party ?? manualSeat?.bloc ?? null,
    n_candidates_2026: upcoming?.ballot.length ?? null,
    voters_total: current?.voters_total ?? null,
    youth_perc: youth,
    income_median: socio.get(seat.code)?.income?.at(-1)?.income_median ?? null,
    income_year: socio.get(seat.code)?.income?.at(-1)?.date?.slice(0, 4) ?? null,
    u_rate: socio.get(seat.code)?.labour?.at(-1)?.u_rate ?? null,
    last_result: last ? {
      date: last.date, election: last.election,
      winner: last.ballot[0]?.name ?? null,
      party: last.ballot[0]?.party ?? null,
      coalition: last.ballot[0]?.coalition ?? null,
      majority_perc: last.majority_perc ?? null,
      turnout_perc: last.voter_turnout_perc ?? null,
    } : null,
  })
}

// ---- headline: Johor basket change over ~12 weeks + fuel + cpi ----
const basketChanges = prices.basket.map(b => {
  const s = prices.series[b.code].johor
  const weeks = prices.weeks.filter(w => s[w] != null)
  if (weeks.length < 2) return null
  const latest = s[weeks[weeks.length - 1]]
  const oldest = s[weeks[0]]
  return { key: b.key, label_bm: b.label_bm, label_en: b.label_en, latest, oldest, weeks: weeks.length, change_perc: +(100 * (latest - oldest) / oldest).toFixed(1) }
}).filter(Boolean)

// Johor-scope change since the previous election, for the home page + race card
const sinceSe15Items = prices.basket.map(b => {
  const aJ = prices.anchor.johor[b.code]
  const s = prices.series[b.code].johor
  const wk = prices.weeks.filter(w => s[w] != null)
  if (!aJ || !wk.length) return null
  const latest = s[wk[wk.length - 1]]
  return { key: b.key, label_bm: b.label_bm, label_en: b.label_en, then: aJ, now: latest, perc: +(100 * (latest - aJ) / aJ).toFixed(1) }
}).filter(Boolean)
const sinceMedian = sinceSe15Items.length >= 3
  ? [...sinceSe15Items.map(i => i.perc)].sort((a, b) => a - b)[sinceSe15Items.length >> 1]
  : null

const index = {
  built_at: new Date().toISOString(),
  state: STATE,
  election: { ...ELECTION_2026, ...(manual.election ?? {}) },
  seats: summaries,
  basket: prices.basket,
  basket_changes: basketChanges,
  basket_since_se15: sinceSe15Items.length ? { anchor_month: prices.anchor.month, median_perc: sinceMedian, items: sinceSe15Items } : null,
  price_max_date: prices.max_date,
  price_months: prices.months_used,
  fuel,
  cpi,
  source_health: health,
  attribution: [
    { name: 'ElectionData.MY (Malaysian Election Corpus, CC0)', url: 'https://electiondata.my' },
    { name: 'data.gov.my / OpenDOSM (CC BY 4.0)', url: 'https://data.gov.my' },
    { name: 'KPDN PriceCatcher via data.gov.my', url: 'https://data.gov.my/data-catalogue/pricecatcher' },
    { name: 'Pasar API (directory + uptime)', url: 'https://pasarapi.xyz' },
  ],
}
await writeFile(path.join(OUT, 'index.json'), JSON.stringify(index))
await writeFile(path.join(OUT, 'johor_dun.geojson'), JSON.stringify(geojson))

// ---- sanity checks ----
// PriceCatcher freshness guard: the current-month file updates daily at
// source; if the newest observation is over a week old the feed has stalled
// (the same silent failure hit the official flood API).
const priceAgeDays = Math.round((Date.now() - new Date(`${prices.max_date}T00:00:00Z`).getTime()) / 86400e3)
if (priceAgeDays > 7) log(`WARNING: PriceCatcher data is ${priceAgeDays} days old (newest obs ${prices.max_date}) — feed may have stalled`)

const withDemo = summaries.filter(s => s.voters_total).length
const withResult = summaries.filter(s => s.last_result).length
const withPrices = summaries.filter(s => s.kpdn_district).length
log(`sanity: demographics=${withDemo}/56 results=${withResult}/56 price-district=${withPrices}/56 saluran=${seats.filter(s => saluran.get(s.code)).length}/56 geo=${geojson.features.length}/56`)
const pw = summaries.find(s => s.code === 'N.41')
log(`Puteri Wangsa check: voters=${pw.voters_total} youth=${pw.youth_perc}% last=${pw.last_result?.winner} (${pw.last_result?.party}) majority=${pw.last_result?.majority_perc}%`)
log(`Progressive Bloc seats on 2026 ballot: ${summaries.filter(s => s.bloc_party).map(s => `${s.code} ${s.name} (${s.bloc_party}: ${s.muda_candidate})`).join(' | ')}`)
if (withDemo < 50 || withResult < 50 || geojson.features.length < 50) {
  console.error('SANITY FAIL: too many seats missing core data')
  process.exit(1)
}
log('done')
