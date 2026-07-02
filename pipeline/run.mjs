// Peta MUDA pipeline: joins electiondata.my (results, voter rolls, boundaries),
// data.gov.my / OpenDOSM (income, poverty, labour, CPI, fuel) and KPDN
// PriceCatcher (via storage.data.gov.my, discovered/health-checked through
// pasarapi.xyz) into static JSON consumed by the site in /site.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchJson } from './lib/fetch.mjs'
import { SOURCES, DATASET_IDS, ELECTION_2026, STATE } from './config.mjs'
import { loadSeats } from './steps/seats.mjs'
import { loadHistory } from './steps/history.mjs'
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
    const at = (series, idx) => { // idx weeks back from the latest week that has a value
      for (let i = weeks.length - 1 - idx; i >= 0; i--) if (series[weeks[i]] != null) return series[weeks[i]]
      return null
    }
    const latest = at(dSeries, 0)
    const w4 = at(dSeries, 4)
    const w12 = at(dSeries, 12)
    return {
      code: b.code, key: b.key, label_bm: b.label_bm, label_en: b.label_en, item: b.item, unit: b.unit,
      latest_district: latest,
      latest_johor: at(s.johor, 0),
      latest_national: at(s.national, 0),
      change_4w_perc: latest != null && w4 ? +(100 * (latest - w4) / w4).toFixed(1) : null,
      change_12w_perc: latest != null && w12 ? +(100 * (latest - w12) / w12).toFixed(1) : null,
      series: { district: dSeries, johor: s.johor, national: s.national },
    }
  })
  return { district, weeks: prices.weeks, max_date: prices.max_date, items, premises: district ? (prices.latest[district] ?? []).slice(0, 25) : [] }
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

  const seatJson = {
    ...seat,
    featured,
    bbox: bboxes.get(seat.code) ?? null,
    election2026: {
      ...ELECTION_2026,
      ...(manual.election ?? {}),
      ...(manualSeat ?? {}),
      is_target: featured,
      ballot: upcoming?.ballot ?? null,
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

const index = {
  built_at: new Date().toISOString(),
  state: STATE,
  election: { ...ELECTION_2026, ...(manual.election ?? {}) },
  seats: summaries,
  basket: prices.basket,
  basket_changes: basketChanges,
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
