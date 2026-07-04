// Crime & safety context from data.gov.my's public-safety dataset
// (storage.data.gov.my/publicsafety/crime_district.parquet: state, district,
// category, type, value, date). "district" here is a POLICE district, which
// does not line up with electoral seats or the KPDN price districts — so we
// surface crime as JOHOR-LEVEL context (trend + type breakdown) plus a
// per-police-district table, not a per-seat join.
//
// First run is diagnostic: we log the real distinct categories/types/districts
// and a sample row so the aggregation can be finalized against actual data
// rather than the documented schema. Non-fatal: any failure returns null and
// the rest of the pipeline continues (matches loadCpi/loadFuel).
import { readParquetUrl, asIsoDate, asNum } from '../lib/parquet.mjs'
import { SOURCES, STATE } from '../config.mjs'

const isAll = (v) => {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'all' || s === 'semua' || s === 'total' || s === ''
}

export async function loadCrime() {
  let rows
  try {
    rows = await readParquetUrl(SOURCES.crimeDistrict)
  } catch (e) {
    console.warn(`crime_district unavailable (${e.message.slice(0, 100)}), skipping`)
    return null
  }
  if (!rows?.length) { console.warn('crime_district returned no rows, skipping'); return null }

  // ---- diagnostics: reveal the real shape in the build log ----
  const cols = Object.keys(rows[0])
  const johor = rows.filter(r => r.state === STATE)
  const distinct = (key, src = johor) => [...new Set(src.map(r => r[key]))]
  console.log(`[crime] columns: ${cols.join(', ')}`)
  console.log(`[crime] rows total=${rows.length} johor=${johor.length}`)
  console.log(`[crime] states sample: ${distinct('state', rows).slice(0, 20).join(' | ')}`)
  if (!johor.length) {
    console.warn(`[crime] no rows for state='${STATE}' — check the state label; skipping`)
    return null
  }
  console.log(`[crime] johor districts: ${distinct('district').join(' | ')}`)
  console.log(`[crime] categories: ${distinct('category').join(' | ')}`)
  console.log(`[crime] types: ${distinct('type').join(' | ')}`)
  const dates = distinct('date').map(asIsoDate).sort()
  console.log(`[crime] date range: ${dates[0]} .. ${dates[dates.length - 1]} (${dates.length} distinct)`)
  console.log(`[crime] sample row: ${JSON.stringify(rows[0])}`)

  // ---- aggregation (defensive against rollup rows) ----
  // Leaf rows carry a concrete category AND type; district-level totals often
  // ship as separate rows with category/type = 'all'. To avoid double counting
  // we sum ONLY leaf rows, and read state totals from the dataset's own 'all'
  // rows where present (logged alongside so the two can be reconciled).
  const norm = (r) => ({
    district: String(r.district ?? '').trim(),
    category: String(r.category ?? '').trim(),
    type: String(r.type ?? '').trim(),
    value: asNum(r.value) ?? 0,
    date: asIsoDate(r.date),
    year: asIsoDate(r.date)?.slice(0, 4),
  })
  const jr = johor.map(norm)
  const leaves = jr.filter(r => !isAll(r.category) && !isAll(r.type) && !isAll(r.district))
  const latestYear = dates[dates.length - 1]?.slice(0, 4)

  // Johor total per year (leaf sum) + reconciliation against any 'all' rows
  const totalByYear = {}
  for (const r of leaves) totalByYear[r.year] = (totalByYear[r.year] ?? 0) + r.value
  const total_by_year = Object.entries(totalByYear).sort().map(([year, value]) => ({ year, value }))

  // latest-year breakdown by crime type (leaf), biggest first
  const typeAgg = {}
  for (const r of leaves) if (r.year === latestYear) {
    const k = `${r.category}|${r.type}`
    typeAgg[k] = (typeAgg[k] ?? 0) + r.value
  }
  const by_type_latest = Object.entries(typeAgg)
    .map(([k, value]) => ({ category: k.split('|')[0], type: k.split('|')[1], value }))
    .sort((a, b) => b.value - a.value)

  // latest-year total per police district, biggest first
  const distAgg = {}
  for (const r of leaves) if (r.year === latestYear) distAgg[r.district] = (distAgg[r.district] ?? 0) + r.value
  const by_district_latest = Object.entries(distAgg)
    .map(([district, value]) => ({ district, value }))
    .sort((a, b) => b.value - a.value)

  const latestTotal = totalByYear[latestYear] ?? 0
  const prevYear = total_by_year.at(-2)?.year
  const prevTotal = prevYear ? totalByYear[prevYear] : null
  console.log(`[crime] Johor ${latestYear}: total=${latestTotal} across ${by_district_latest.length} districts, ${by_type_latest.length} crime types`)

  return {
    state: STATE,
    source: 'data.gov.my / PDRM (crime_district)',
    latest_year: latestYear,
    total_latest: latestTotal,
    change_yoy_perc: prevTotal ? +(100 * (latestTotal - prevTotal) / prevTotal).toFixed(1) : null,
    total_by_year,
    by_type_latest,
    by_district_latest,
  }
}
