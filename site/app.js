// Peta MUDA — Seat Command Center (static, no build step).
// Data: electiondata.my (CC0) + data.gov.my/OpenDOSM (CC BY 4.0) + KPDN PriceCatcher.

// localStorage may be blocked (SecurityError) or hold a foreign value written
// by another app on a shared origin (e.g. github.io) — only accept 'en'/'bm'.
const storage = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch { /* blocked */ } },
}
const state = {
  lang: storage.get('lang') === 'en' ? 'en' : 'bm',
  index: null,
  seats: new Map(), // slug -> seat json
  geo: null,
}

// ---------- i18n ----------
const STR = {
  bm: {
    tagline: 'Pusat Data Kerusi — PRN Johor 2026',
    days_to_poll: 'hari lagi ke hari mengundi',
    poll_day: 'Hari mengundi: 11 Julai 2026',
    early_vote: 'Undi awal: 7 Julai 2026',
    poll_today: 'HARI MENGUNDI — keluar mengundi!',
    poll_over: 'PRN Johor 2026 telah selesai. Terima kasih kerana mengundi!',
    featured: 'Kerusi Blok Progresif (MUDA–PSM)',
    as_of: 'Harga setakat',
    cost_headline: 'Harga dapur di Johor — 12 minggu terkini',
    cost_sub: 'Perubahan harga median barangan asas di premis Johor (data PriceCatcher KPDN, dikemas kini harian)',
    fuel: 'Harga runcit petrol minggu ini (seluruh negara)',
    all_seats: 'Semua 56 kerusi DUN Johor',
    search: 'Cari kerusi, kawasan atau parlimen…',
    voters: 'pengundi',
    youth: 'bawah 30',
    last_result: 'Keputusan 2022',
    majority: 'majoriti',
    turnout: 'keluar mengundi',
    tab_brief: 'Ringkas',
    tab_field: 'Lapangan',
    tab_hq: 'Analisis',
    contest_2026: 'Pertandingan 11 Julai 2026',
    contest_sub: 'Senarai calon rasmi (hari penamaan 27 Jun) — data ElectionData.MY',
    results_2026: 'Keputusan 11 Julai 2026',
    results_sub: 'Keputusan rasmi — data ElectionData.MY',
    first_time: 'Calon kali pertama',
    career_line: (c, w, el, yr) => `Rekod: ${c} tandingan, ${w} menang · terakhir ${el} (${yr})`,
    race_title: 'Harga vs pendapatan vs inflasi rasmi',
    race_sub: 'Kadar perubahan setahun — harga dapur diukur sejak PRN lalu (Mac 2022)',
    basket_rate: 'Bakul dapur',
    income_rate: 'Pendapatan penengah',
    cpi_official: 'Inflasi rasmi (CPI Johor)',
    since_se15: 'Sejak PRN Mac 2022',
    stress_line: (r) => `Perbelanjaan isi rumah menyerap RM${r} daripada setiap RM100 pendapatan`,
    race_note: 'Kadar harga dikira daripada median bakul KPDN; pendapatan daripada HIES (anggaran DOSM); barangan yang kod KPDN-nya berubah selepas 2022 dikecualikan.',
    bloc_candidate: 'Calon Blok Progresif',
    prices_here: 'Harga barang dapur di kawasan anda',
    prices_sub: (d) => `Harga median di premis KPDN daerah ${d} — vs median negeri Johor`,
    col_item: 'Barang',
    col_price: 'Harga',
    col_johor: 'Johor',
    col_4w: '4 mgu',
    col_12w: '3 bln',
    trend: 'Arah',
    income_ctx: 'Konteks pendapatan',
    income_median: 'Pendapatan penengah isi rumah',
    income_mean: 'Pendapatan purata',
    poverty: 'Kadar kemiskinan mutlak',
    gini: 'Ketaksamaan (Gini)',
    u_rate: 'Kadar pengangguran',
    vs_johor_median: 'penengah DUN Johor',
    share: 'Kongsi ringkasan',
    copied: 'Disalin ke papan keratan!',
    story_title: 'Cerita kempen — 5 langkah',
    story_sub: 'Satu naratif tersusun; butiran penuh di bahagian bawah',
    beat_path: 'Jalan kemenangan',
    beat_voters: 'Pengundi penentu',
    beat_message: 'Mesej di pintu',
    beat_ground: 'Peta lapangan',
    beat_ask: 'Tindakan',
    talking_points: 'Isu untuk pintu ke pintu',
    tp_sub: 'Dijana automatik daripada data rasmi — semak sebelum guna',
    demo_title: 'Profil pengundi (daftar pemilih 2026)',
    demo_sub: 'Daftar pemilih JHR-SE-16 — ElectionData.MY',
    age_dist: 'Umur pengundi',
    ethnic_dist: 'Etnik pengundi',
    new_voters: 'pengundi baharu sejak PRU15 (Nov 2022)',
    women: 'wanita',
    nearby: 'Premis harga terdekat (KPDN)',
    nearby_sub: 'Harga terkini di pasar & kedai yang dipantau di daerah ini',
    history: 'Sejarah keputusan',
    saluran: 'Analisis daerah mengundi (PRN 2022)',
    saluran_sub: 'Undian mengikut daerah mengundi — kenal pasti kubu & medan rebutan',
    dm: 'Daerah mengundi',
    kaw_title: 'Penunjuk kawasan (Kawasanku DOSM)',
    kaw_sub: 'Kemudahan & sosioekonomi per kapita kawasan',
    socio_series: 'Siri sosioekonomi (HIES/LFS)',
    export: 'Muat turun data',
    export_json: 'JSON penuh kerusi',
    export_csv: 'CSV daerah mengundi',
    winner: 'Pemenang',
    party: 'Parti',
    election: 'Pilihan raya',
    sources: 'Sumber data',
    built: 'Data dibina',
    disclaimer: 'Alat maklumat tidak rasmi berasaskan 100% data terbuka kerajaan/awam. Bukan ramalan. Sahkan fakta sebelum penerbitan kempen.',
    err: 'Maaf, data tidak dapat dimuatkan.',
    candidates: 'calon',
    postal: 'Undi pos',
    early: 'Undi awal',
    income_note: (y) => `Anggaran HIES ${y}, DOSM`,
    price_note: 'Harga ialah median premis yang dipantau KPDN; boleh berbeza di kedai berlainan.',
    no_price: 'Tiada data harga daerah — median Johor ditunjukkan.',
    clinics: 'Klinik', schools: 'Sekolah', hospitals: 'Hospital', grocery: 'Kedai runcit', atm: 'ATM', petrol: 'Stesen minyak', police_fire: 'Polis/Bomba', water: 'Akses air', electricity: 'Akses elektrik', expenditure: 'Perbelanjaan purata',
  },
  en: {
    tagline: 'Seat Command Center — 2026 Johor Election',
    days_to_poll: 'days to polling day',
    poll_day: 'Polling day: 11 July 2026',
    early_vote: 'Early voting: 7 July 2026',
    poll_today: 'POLLING DAY — get out and vote!',
    poll_over: 'The 2026 Johor election has concluded. Thank you for voting!',
    featured: 'Progressive Bloc seats (MUDA–PSM)',
    as_of: 'Prices as of',
    cost_headline: 'Kitchen prices in Johor — last 12 weeks',
    cost_sub: 'Median price change for staples at Johor premises (KPDN PriceCatcher, updated daily)',
    fuel: 'This week’s retail fuel prices (nationwide)',
    all_seats: 'All 56 Johor state seats',
    search: 'Search seat, area or parlimen…',
    voters: 'voters',
    youth: 'under 30',
    last_result: '2022 result',
    majority: 'majority',
    turnout: 'turnout',
    tab_brief: 'Brief',
    tab_field: 'Field',
    tab_hq: 'Analysis',
    contest_2026: 'The 11 July 2026 contest',
    contest_sub: 'Official candidate list (nomination 27 Jun) — ElectionData.MY',
    results_2026: 'The 11 July 2026 result',
    results_sub: 'Official result — ElectionData.MY',
    first_time: 'First-time candidate',
    career_line: (c, w, el, yr) => `Record: ${c} contests, ${w} won · last ${el} (${yr})`,
    race_title: 'Prices vs income vs official inflation',
    race_sub: 'Annual rates of change — kitchen prices measured since the last election (Mar 2022)',
    basket_rate: 'Kitchen basket',
    income_rate: 'Median income',
    cpi_official: 'Official inflation (Johor CPI)',
    since_se15: 'Since the Mar 2022 election',
    stress_line: (r) => `Household spending absorbs RM${r} of every RM100 earned`,
    race_note: 'Price rate computed from KPDN basket medians; income from HIES (DOSM estimates); items whose KPDN codes changed after 2022 are excluded.',
    bloc_candidate: 'Progressive Bloc candidate',
    prices_here: 'Grocery prices in your area',
    prices_sub: (d) => `Median prices at KPDN premises in ${d} district — vs Johor state median`,
    col_item: 'Item',
    col_price: 'Price',
    col_johor: 'Johor',
    col_4w: '4 wk',
    col_12w: '3 mo',
    trend: 'Trend',
    income_ctx: 'Income context',
    income_median: 'Median household income',
    income_mean: 'Mean income',
    poverty: 'Absolute poverty rate',
    gini: 'Inequality (Gini)',
    u_rate: 'Unemployment rate',
    vs_johor_median: 'Johor DUN median',
    share: 'Share summary',
    copied: 'Copied to clipboard!',
    story_title: 'The campaign story — 5 beats',
    story_sub: 'One ordered narrative; full detail in the sections below',
    beat_path: 'Path to victory',
    beat_voters: 'The deciders',
    beat_message: 'The doorstep message',
    beat_ground: 'The ground map',
    beat_ask: 'The ask',
    talking_points: 'Door-knocking talking points',
    tp_sub: 'Auto-generated from official data — verify before use',
    demo_title: 'Voter profile (2026 electoral roll)',
    demo_sub: 'JHR-SE-16 roll — ElectionData.MY',
    age_dist: 'Voter age',
    ethnic_dist: 'Voter ethnicity',
    new_voters: 'new voters since GE15 (Nov 2022)',
    women: 'women',
    nearby: 'Nearby monitored premises (KPDN)',
    nearby_sub: 'Latest prices at monitored markets & shops in this district',
    history: 'Result history',
    saluran: 'Polling-district analysis (2022 election)',
    saluran_sub: 'Votes by polling district — find strongholds & battlegrounds',
    dm: 'Polling district',
    kaw_title: 'Area indicators (DOSM Kawasanku)',
    kaw_sub: 'Amenities & socioeconomics for this area',
    socio_series: 'Socioeconomic series (HIES/LFS)',
    export: 'Download data',
    export_json: 'Full seat JSON',
    export_csv: 'Polling-district CSV',
    winner: 'Winner',
    party: 'Party',
    election: 'Election',
    sources: 'Data sources',
    built: 'Data built',
    disclaimer: 'Unofficial information tool built 100% on open government/public data. Not a prediction. Verify facts before campaign publication.',
    err: 'Sorry, data could not be loaded.',
    candidates: 'candidates',
    postal: 'Postal votes',
    early: 'Early votes',
    income_note: (y) => `HIES ${y} estimate, DOSM`,
    price_note: 'Prices are medians across KPDN-monitored premises; individual shops vary.',
    no_price: 'No district price data — Johor median shown.',
    clinics: 'Clinics', schools: 'Schools', hospitals: 'Hospitals', grocery: 'Grocery stores', atm: 'ATMs', petrol: 'Petrol stations', police_fire: 'Police/Fire', water: 'Water access', electricity: 'Electricity access', expenditure: 'Mean expenditure',
  },
}
const L = (k, ...args) => {
  const dict = STR[state.lang] ?? STR.bm
  const v = dict[k] ?? STR.bm[k] ?? k
  return typeof v === 'function' ? v(...args) : v
}

// ---------- utils ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmtNum = (v) => v == null ? '–' : Number(v).toLocaleString(state.lang === 'bm' ? 'ms-MY' : 'en-MY')
const fmtRM = (v) => v == null ? '–' : `RM${Number(v).toFixed(2)}`
const fmtPct = (v, dp = 1) => v == null ? '–' : `${Number(v).toFixed(dp)}%`
const deltaHtml = (v) => {
  if (v == null) return '<span class="delta-flat">–</span>'
  if (Math.abs(v) < 0.05) return '<span class="delta-flat">0%</span>'
  const cls = v > 0 ? 'delta-up' : 'delta-down'
  const arrow = v > 0 ? '▲' : '▼'
  return `<span class="${cls}">${arrow}${Math.abs(v).toFixed(1)}%</span>`
}
// Badge colored by the coalition AT THAT CONTEST when known (BERSATU won 2018
// as PH, GERAKAN's old wins were BN, MIPP/PEJUANG ride with PN in 2026);
// falls back to the party's own class when standing alone.
const partyBadge = (p, coalition) => {
  const cls = ['PH', 'BN', 'PN'].includes(coalition) ? coalition : esc(p)
  return `<span class="badge ${cls}">${esc(p)}</span>`
}
// Kawasanku amenity indicators are rates per 1,000 residents.
const perK = (v) => `${Number(v).toFixed(2)}/1k`

// "as of" label for price data, flagged red if the source feed has stalled
const asOfHtml = (maxDate) => {
  if (!maxDate) return ''
  const days = Math.round((Date.now() - new Date(`${maxDate}T00:00:00`).getTime()) / 86400e3)
  const stale = days > 7
  return ` · <span${stale ? ' class="delta-up"' : ''}>${L('as_of')} ${esc(maxDate)}${stale ? ` (${days}d!)` : ''}</span>`
}

const BLOC_COLORS = { PH: 'var(--ph)', BN: 'var(--bn)', PN: 'var(--pn)', MUDA: 'var(--muda)', LAIN: 'var(--lain)' }

// ---------- charts ----------
function sparkline(weeks, seriesList, w = 130, h = 34) {
  const vals = seriesList.flatMap(s => weeks.map(wk => s.data[wk]).filter(v => v != null))
  if (!vals.length) return ''
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = (max - min) || 1
  const x = (i) => 2 + (i / Math.max(weeks.length - 1, 1)) * (w - 4)
  const y = (v) => h - 3 - ((v - min) / span) * (h - 6)
  let out = `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  for (const s of seriesList) {
    const pts = weeks.map((wk, i) => s.data[wk] != null ? `${x(i).toFixed(1)},${y(s.data[wk]).toFixed(1)}` : null).filter(Boolean)
    if (pts.length > 1) out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 2}" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="3 3"' : ''}/>`
  }
  return out + '</svg>'
}

function barRow(label, perc, valText, color = 'var(--ink)') {
  return `<div class="bar-row"><span>${esc(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(perc, 100)}%;background:${color}"></div></div><span class="bar-val">${esc(valText)}</span></div>`
}

function stackBar(blocs, valid) {
  const order = ['PH', 'MUDA', 'BN', 'PN', 'LAIN']
  let html = '<div class="stack">'
  for (const b of order) {
    const v = blocs[b] || 0
    if (v > 0 && valid > 0) html += `<div style="width:${(100 * v / valid).toFixed(1)}%;background:${BLOC_COLORS[b]}" title="${b}: ${fmtNum(v)}"></div>`
  }
  return html + '</div>'
}

function miniMap(feature, bbox, size = 84) {
  if (!feature) return ''
  const [minX, minY, maxX, maxY] = bbox
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1
  const scale = (size - 8) / Math.max(spanX, spanY)
  const px = (x) => 4 + (x - minX) * scale + (size - 8 - spanX * scale) / 2
  const py = (y) => size - 4 - (y - minY) * scale - (size - 8 - spanY * scale) / 2
  const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  let d = ''
  for (const poly of rings) for (const ring of poly) {
    d += ring.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join('') + 'Z'
  }
  return `<svg class="minimap" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${d}" fill="#e9e9e6" stroke="var(--ink)" stroke-width="1.5"/></svg>`
}

// ---------- data ----------
async function loadIndex() {
  if (!state.index) state.index = await (await fetch('data/index.json')).json()
  return state.index
}
async function loadSeat(slug) {
  if (!state.seats.has(slug)) state.seats.set(slug, await (await fetch(`data/seats/${slug}.json`)).json())
  return state.seats.get(slug)
}
async function loadGeo() {
  if (!state.geo) state.geo = await (await fetch('data/johor_dun.geojson')).json()
  return state.geo
}

// Johor benchmarks from the index (median across 56 DUNs)
function johorBenchmarks(idx) {
  const med = (arr) => {
    const s = arr.filter(v => v != null).sort((a, b) => a - b)
    return s.length ? s[s.length >> 1] : null
  }
  return {
    income_median: med(idx.seats.map(s => s.income_median)),
    u_rate: med(idx.seats.map(s => s.u_rate)),
    youth_perc: med(idx.seats.map(s => s.youth_perc)),
  }
}

// ---------- views ----------
const app = document.getElementById('app')

function renderFooter(idx) {
  const el = document.getElementById('footer')
  if (!idx) { el.innerHTML = ''; return }
  const health = idx.source_health
    ? Object.entries(idx.source_health).map(([id, h]) =>
        `<span class="${h?.ok ? 'health-ok' : 'health-bad'}">●</span> ${esc(id)}`).join(' &nbsp; ')
    : ''
  el.innerHTML = `
    <p><strong>${L('sources')}:</strong> ${idx.attribution.map(a => `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>`).join(' · ')}</p>
    ${health ? `<p>${health}</p>` : ''}
    <p>${L('built')}: ${new Date(idx.built_at).toLocaleString()} · ${L('disclaimer')}</p>`
}

function countdownCard(idx) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const poll = new Date(`${idx.election.polling_date}T00:00:00`)
  const days = Math.round((poll - today) / 86400e3)
  let inner
  if (days > 0) {
    inner = `<div class="days">${days}</div>
      <div><div class="label">${L('days_to_poll')}</div>
      <div class="sublabel">${L('poll_day')} · ${L('early_vote')}</div></div>`
  } else if (days === 0) {
    inner = `<div class="days">0</div><div class="label">${L('poll_today')}</div>`
  } else {
    inner = `<div class="label">${L('poll_over')}</div>`
  }
  return `<div class="card"><div class="countdown">${inner}</div></div>`
}

async function renderHome() {
  const idx = await loadIndex()
  const featured = idx.seats.filter(s => s.featured)
  const chips = [...idx.basket_changes].sort((a, b) => Math.abs(b.change_perc) - Math.abs(a.change_perc)).slice(0, 8)
  const fuel = idx.fuel?.at(-1)

  app.innerHTML = `
    <p class="sub" style="margin:2px 0 12px;color:var(--muted)">${L('tagline')}</p>
    ${countdownCard(idx)}

    <div class="card">
      <h2>${L('featured')}</h2>
      <p class="sub">${esc((state.lang === 'bm' ? idx.election.name_bm : idx.election.name_en) ?? idx.election.name_bm ?? '')}</p>
      <div class="seat-grid">
        ${featured.map(s => `
          <a class="seat-card featured" href="#/seat/${s.slug}">
            <div class="code">${esc(s.code)} · ${esc(s.parlimen ?? '')}</div>
            <div class="name">${esc(s.name)}</div>
            ${s.muda_candidate ? `<div class="cand">${partyBadge(s.bloc_party)} ${esc(s.muda_candidate)}</div>` : ''}
            <div class="meta">${fmtNum(s.voters_total)} ${L('voters')} · ${fmtPct(s.youth_perc, 0)} ${L('youth')} · ${s.n_candidates_2026 ?? '–'} ${L('candidates')}</div>
          </a>`).join('')}
      </div>
    </div>

    <div class="card">
      <h2>${L('cost_headline')}</h2>
      <p class="sub">${L('cost_sub')}${asOfHtml(idx.price_max_date)}</p>
      <div class="chips">
        ${chips.map(c => `<span class="chip">${esc(state.lang === 'bm' ? c.label_bm : c.label_en)} ${deltaHtml(c.change_perc)}</span>`).join('')}
      </div>
      ${idx.basket_since_se15 ? `<h3>${L('since_se15')}</h3><div class="chips">
        ${[...idx.basket_since_se15.items].sort((a, b) => b.perc - a.perc).slice(0, 6).map(i =>
          `<span class="chip">${esc(state.lang === 'bm' ? i.label_bm : i.label_en)} ${deltaHtml(i.perc)}</span>`).join('')}
      </div>` : ''}
      ${fuel ? `<h3>${L('fuel')}</h3><div class="chips">
        ${fuel.ron95_budi95 != null ? `<span class="chip">RON95 BUDI95 ${fmtRM(fuel.ron95_budi95)}</span>` : ''}
        <span class="chip">RON95 ${state.lang === 'bm' ? 'tanpa subsidi' : 'unsubsidised'} ${fmtRM(fuel.ron95)}</span>
        <span class="chip">RON97 ${fmtRM(fuel.ron97)}</span>
        <span class="chip">Diesel ${fmtRM(fuel.diesel)}</span>
      </div>` : ''}
    </div>

    <div class="card">
      <h2>${L('all_seats')}</h2>
      <input class="searchbox" id="seatSearch" placeholder="${L('search')}" autocomplete="off">
      <div class="seat-list" id="seatList"></div>
    </div>`

  const listEl = document.getElementById('seatList')
  const renderList = (q = '') => {
    const needle = q.trim().toLowerCase()
    const rows = idx.seats.filter(s =>
      !needle || `${s.code} ${s.name} ${s.parlimen} ${s.kpdn_district}`.toLowerCase().includes(needle))
    listEl.innerHTML = rows.map(s => `
      <a class="seat-row" href="#/seat/${s.slug}">
        <span class="left">
          <span class="name">${esc(s.code)} ${esc(s.name)} ${s.featured ? '★' : ''}</span>
          <span class="meta">${esc(s.parlimen ?? '')} · ${fmtNum(s.voters_total)} ${L('voters')}</span>
        </span>
        <span class="right">${s.last_result ? `${esc(s.last_result.party)}<br>${L('majority')} ${fmtPct(s.last_result.majority_perc, 1)}` : ''}</span>
      </a>`).join('')
  }
  renderList()
  document.getElementById('seatSearch').addEventListener('input', (e) => renderList(e.target.value))
  renderFooter(idx)
}

// ---- seat tabs ----
function contestCard(seat) {
  const e = seat.election2026
  // once results are in, the pending ballot disappears and the contest tops history
  const done = seat.history?.[0]
  const resultsIn = !e?.ballot && done && done.date === e?.polling_date
  if (!e?.ballot && !resultsIn) return ''
  const ballot = e?.ballot ?? done.ballot
  return `<div class="card">
    <h2>${resultsIn ? L('results_2026') : L('contest_2026')}</h2>
    <p class="sub">${resultsIn ? L('results_sub') : L('contest_sub')} · ${fmtNum(resultsIn ? done.voters_total : e.voters_total)} ${L('voters')}</p>
    <table class="data"><tbody>
      ${ballot.map(b => {
        const isBloc = b.party === 'MUDA' || b.party === 'PSM'
        const won = b.result === 'won' || b.result === 'won_uncontested'
        const career = !resultsIn ? (b.career
          ? L('career_line', b.career.contested, b.career.won, `${b.career.last.election} ${b.career.last.seat}`, b.career.last.date.slice(0, 4))
          : L('first_time')) : null
        return `<tr${isBloc || won ? ' style="font-weight:800"' : ''}>
          <td>${won ? '✓ ' : ''}${esc(b.name)}${isBloc ? ` <span title="${L('bloc_candidate')}">★</span>` : ''}
            ${career ? `<br><span style="color:var(--muted);font-size:.72rem;font-weight:400">${esc(career)}</span>` : ''}</td>
          ${resultsIn ? `<td class="num">${fmtNum(b.votes)}${b.votes_perc != null ? ` <span style="color:var(--muted)">(${fmtPct(b.votes_perc)})</span>` : ''}</td>` : ''}
          <td class="num">${partyBadge(b.party, b.coalition)}</td></tr>`
      }).join('')}
    </tbody></table>
    ${e.notes_bm && !resultsIn ? `<div class="notice">${esc(state.lang === 'bm' ? e.notes_bm : (e.notes_en ?? e.notes_bm))}</div>` : ''}
  </div>`
}

function pricesCard(seat, compact = true) {
  const p = seat.prices
  if (!p?.items?.length) return ''
  const rows = p.items.map(it => {
    const hasDistrict = it.latest_district != null
    const price = hasDistrict ? it.latest_district : it.latest_johor
    const spark = sparkline(p.weeks, [
      { data: it.series.johor, color: '#c9c9c4', width: 1.5, dash: true },
      { data: hasDistrict ? it.series.district : it.series.johor, color: 'var(--ink)', width: 2 },
    ])
    return `<tr>
      <td><strong>${esc(state.lang === 'bm' ? it.label_bm : it.label_en)}</strong><br><span style="color:var(--muted);font-size:.72rem">${esc(it.unit)}</span></td>
      <td class="num"><strong>${fmtRM(price)}</strong></td>
      <td class="num">${fmtRM(it.latest_johor)}</td>
      <td>${spark}</td>
      <td class="num">${deltaHtml(it.change_12w_perc)}</td>
    </tr>`
  }).join('')
  const anyDistrict = p.items.some(it => it.latest_district != null)
  return `<div class="card">
    <h2>${L('prices_here')}</h2>
    <p class="sub">${L('prices_sub', esc(p.district ?? '–'))}${asOfHtml(p.max_date)}</p>
    <table class="data">
      <thead><tr><th>${L('col_item')}</th><th class="num">${L('col_price')}</th><th class="num">${L('col_johor')}</th><th>${L('trend')}</th><th class="num">${L('col_12w')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="notice">${anyDistrict ? L('price_note') : L('no_price')}</div>
  </div>`
}

function incomeCard(seat, bench) {
  const inc = seat.socio.income?.at(-1)
  const pov = seat.socio.poverty?.at(-1)
  const gin = seat.socio.inequality?.at(-1)
  const lab = seat.socio.labour?.at(-1)
  if (!inc && !lab) return ''
  const year = inc?.date?.slice(0, 4)
  return `<div class="card">
    <h2>${L('income_ctx')}</h2>
    ${inc ? `<p class="sub">${L('income_note', year)}</p>` : ''}
    <table class="data"><tbody>
      ${inc ? `<tr><td>${L('income_median')}</td><td class="num"><strong>RM${fmtNum(inc.income_median)}</strong></td><td class="num" style="color:var(--muted)">${L('vs_johor_median')}: RM${fmtNum(bench.income_median)}</td></tr>` : ''}
      ${inc ? `<tr><td>${L('income_mean')}</td><td class="num">RM${fmtNum(inc.income_mean)}</td><td></td></tr>` : ''}
      ${pov ? `<tr><td>${L('poverty')}</td><td class="num">${fmtPct(pov.poverty ?? pov.poverty_absolute)}</td><td></td></tr>` : ''}
      ${gin ? `<tr><td>${L('gini')}</td><td class="num">${(gin.gini ?? '–')}</td><td></td></tr>` : ''}
      ${lab ? `<tr><td>${L('u_rate')} (${lab.date?.slice(0, 4)})</td><td class="num">${fmtPct(lab.u_rate)}</td><td class="num" style="color:var(--muted)">${L('vs_johor_median')}: ${fmtPct(bench.u_rate)}</td></tr>` : ''}
    </tbody></table>
  </div>`
}

// Annualized rates: basket since the Mar 2022 election vs HIES income growth
// vs official CPI — the cross-source comparison no single dataset can make.
function raceStats(seat, idx) {
  const p = seat.prices
  const items = p.items.filter(i => i.since_se15?.perc != null)
  if (items.length < 3 || !p.anchor_month) return null
  const percs = items.map(i => i.since_se15.perc).sort((a, b) => a - b)
  const medPerc = percs[percs.length >> 1]
  const years = (new Date(`${p.max_date}T00:00:00`) - new Date(`${p.anchor_month}-15T00:00:00`)) / (365.25 * 86400e3)
  const basketAnnual = years > 0 ? ((1 + medPerc / 100) ** (1 / years) - 1) * 100 : null
  const inc = seat.socio.income ?? []
  let incomeAnnual = null
  if (inc.length >= 2) {
    const a = inc[0], b = inc.at(-1)
    const yrs = Number(b.date.slice(0, 4)) - Number(a.date.slice(0, 4))
    if (yrs > 0 && a.income_median > 0) incomeAnnual = ((b.income_median / a.income_median) ** (1 / yrs) - 1) * 100
  }
  const cpiYoy = (idx?.cpi ?? []).at(-1)?.inflation_yoy ?? null
  const top = [...items].sort((a, b) => b.since_se15.perc - a.since_se15.perc).slice(0, 3)
  const exp = seat.socio.expenditure?.at(-1)
  const expVal = exp?.expenditure_mean ?? exp?.expenditure ?? null
  const incMean = inc.at(-1)?.income_mean ?? null
  const stress = expVal && incMean ? Math.round(100 * expVal / incMean) : null
  return { items, medPerc, years, basketAnnual, incomeAnnual, cpiYoy, top, stress }
}

function raceCard(seat, idx) {
  const r = raceStats(seat, idx)
  if (!r || r.basketAnnual == null) return ''
  const bm = state.lang === 'bm'
  const maxRate = Math.max(r.basketAnnual, r.incomeAnnual ?? 0, r.cpiYoy ?? 0, 0.1)
  const topText = r.top.map(i => `${esc((bm ? i.label_bm : i.label_en).toLowerCase())} ${i.since_se15.perc > 0 ? '+' : ''}${i.since_se15.perc}%`).join(' · ')
  return `<div class="card">
    <h2>${L('race_title')}</h2>
    <p class="sub">${L('race_sub')}</p>
    ${barRow(L('basket_rate'), 100 * r.basketAnnual / maxRate, `+${r.basketAnnual.toFixed(1)}%/${bm ? 'thn' : 'yr'}`, 'var(--up)')}
    ${r.incomeAnnual != null ? barRow(L('income_rate'), 100 * r.incomeAnnual / maxRate, `+${r.incomeAnnual.toFixed(1)}%/${bm ? 'thn' : 'yr'}`, 'var(--ink)') : ''}
    ${r.cpiYoy != null ? barRow(L('cpi_official'), 100 * r.cpiYoy / maxRate, `+${r.cpiYoy.toFixed(1)}%/${bm ? 'thn' : 'yr'}`, 'var(--lain)') : ''}
    <p class="sub" style="margin-top:10px">${L('since_se15')}: ${topText}</p>
    ${r.stress != null ? `<p class="sub">${L('stress_line', r.stress)}</p>` : ''}
    <div class="notice">${L('race_note')}</div>
  </div>`
}

function shareText(seat) {
  const e = seat.election2026
  const inc = seat.socio.income?.at(-1)
  const worst = [...seat.prices.items].filter(i => i.change_12w_perc != null).sort((a, b) => b.change_12w_perc - a.change_12w_perc)[0]
  const lines = [
    `📍 ${seat.code} ${seat.name} — PRN Johor ${e.polling_date === '2026-07-11' ? '11 Julai 2026' : e.polling_date}`,
    e.muda_candidate ? `★ ${L('bloc_candidate')}: ${e.muda_candidate} (${e.bloc_party})` : null,
    worst ? `🧺 ${worst.label_bm}: ${fmtRM(worst.latest_district ?? worst.latest_johor)} (${worst.change_12w_perc > 0 ? '+' : ''}${worst.change_12w_perc}% / 3 bln)` : null,
    inc ? `💰 ${L('income_median')}: RM${fmtNum(inc.income_median)}` : null,
    `Data terbuka rasmi · ${location.origin}${location.pathname}#/seat/${seat.slug}`,
  ].filter(Boolean)
  return lines.join('\n')
}

function renderBrief(seat, bench, idx) {
  return `
    ${contestCard(seat)}
    ${pricesCard(seat)}
    ${raceCard(seat, idx)}
    ${incomeCard(seat, bench)}
    <div class="btn-row">
      <button class="btn" id="shareBtn">${L('share')}</button>
    </div>`
}

function talkingPoints(seat, bench, idx) {
  const pts = []
  const p = seat.prices
  const bm = state.lang === 'bm'
  // cross-source headliners: pasar vs official CPI, prices vs wages
  const r = raceStats(seat, idx)
  if (r?.basketAnnual != null && r.cpiYoy != null && r.basketAnnual > r.cpiYoy + 1) {
    pts.push(bm
      ? `Inflasi rasmi Johor hanya <strong>${r.cpiYoy.toFixed(1)}%</strong> setahun — tetapi bakul dapur di sini naik <strong>${r.basketAnnual.toFixed(1)}%</strong> setahun sejak PRN Mac 2022.`
      : `Official Johor inflation is just <strong>${r.cpiYoy.toFixed(1)}%</strong> a year — but the kitchen basket here is up <strong>${r.basketAnnual.toFixed(1)}%</strong> a year since the Mar 2022 election.`)
  }
  if (r?.basketAnnual != null && r.incomeAnnual != null && r.basketAnnual > r.incomeAnnual) {
    pts.push(bm
      ? `Harga dapur naik <strong>${r.basketAnnual.toFixed(1)}%/thn</strong> tetapi pendapatan penengah hanya <strong>${r.incomeAnnual.toFixed(1)}%/thn</strong> — gaji kalah dalam perlumbaan harga.`
      : `Kitchen prices are rising <strong>${r.basketAnnual.toFixed(1)}%/yr</strong> but median income only <strong>${r.incomeAnnual.toFixed(1)}%/yr</strong> — wages are losing the race.`)
  }
  if (r?.stress != null && r.stress >= 70) {
    pts.push(bm ? `${L('stress_line', r.stress)}.` : `${L('stress_line', r.stress)}.`)
  }
  for (const it of p.items) {
    if (it.change_12w_perc != null && it.change_12w_perc >= 3) {
      const price = it.latest_district ?? it.latest_johor
      pts.push(bm
        ? `Harga <strong>${esc(it.label_bm.toLowerCase())}</strong> naik <strong>${it.change_12w_perc}%</strong> dalam 3 bulan di daerah ${esc(p.district)} (kini ${fmtRM(price)}/${esc(it.unit)}).`
        : `<strong>${esc(it.label_en)}</strong> price up <strong>${it.change_12w_perc}%</strong> in 3 months in ${esc(p.district)} district (now ${fmtRM(price)}/${esc(it.unit)}).`)
    }
  }
  const inc = seat.socio.income?.at(-1)
  if (inc && bench.income_median && inc.income_median < bench.income_median * 0.9) {
    pts.push(bm
      ? `Pendapatan penengah isi rumah di sini <strong>RM${fmtNum(inc.income_median)}</strong> — lebih rendah daripada penengah DUN Johor (RM${fmtNum(bench.income_median)}).`
      : `Median household income here is <strong>RM${fmtNum(inc.income_median)}</strong> — below the Johor DUN median (RM${fmtNum(bench.income_median)}).`)
  }
  const lab = seat.socio.labour?.at(-1)
  if (lab && bench.u_rate && lab.u_rate > bench.u_rate) {
    pts.push(bm
      ? `Kadar pengangguran <strong>${fmtPct(lab.u_rate)}</strong>, melebihi penengah Johor (${fmtPct(bench.u_rate)}).`
      : `Unemployment at <strong>${fmtPct(lab.u_rate)}</strong>, above the Johor median (${fmtPct(bench.u_rate)}).`)
  }
  const demo = seat.demographics.find(d => d.election === 'JHR-SE-16')
  const ge15 = seat.demographics.find(d => d.election === 'GE-15')
  if (demo) {
    const youthN = demo.age.age_18_20 + demo.age.age_21_29
    const youthP = (100 * youthN / demo.voters_total).toFixed(0)
    pts.push(bm
      ? `<strong>${fmtNum(youthN)}</strong> pengundi bawah 30 tahun (${youthP}% daftar pemilih) — fokus Undi18.`
      : `<strong>${fmtNum(youthN)}</strong> voters under 30 (${youthP}% of the roll) — the Undi18 focus.`)
    if (ge15 && demo.voters_total > ge15.voters_total) {
      pts.push(bm
        ? `<strong>+${fmtNum(demo.voters_total - ge15.voters_total)}</strong> ${L('new_voters')}.`
        : `<strong>+${fmtNum(demo.voters_total - ge15.voters_total)}</strong> ${L('new_voters')}.`)
    }
  }
  const last = seat.history[0]
  if (last?.majority_perc != null && last.majority_perc < 10) {
    const yr = last.date?.slice(0, 4) ?? ''
    pts.push(bm
      ? `Kerusi marginal: majoriti ${yr} (${esc(last.election)}) hanya <strong>${fmtPct(last.majority_perc)}</strong> (${fmtNum(last.majority)} undi).`
      : `Marginal seat: the ${yr} (${esc(last.election)}) majority was only <strong>${fmtPct(last.majority_perc)}</strong> (${fmtNum(last.majority)} votes).`)
  }
  return pts
}

// The prioritized 5-beat narrative: one story a candidate can carry, ordered
// by what wins the seat — path, people, message, ground, ask. Every number is
// pulled from the same verified data as the sections below it.
function storyFor(seat, bench, idx) {
  const bm = state.lang === 'bm'
  const beats = []
  const hist = seat.history
  const last = hist[0]
  const prev = hist.slice(1).find(c => c.voter_turnout_perc != null)

  // 1 — path to victory (the turnout math)
  if (last) {
    const w = last.ballot[0]
    const t = last.voter_turnout_perc
    const tp = prev?.voter_turnout_perc
    const turnoutCollapsed = t != null && tp != null && tp - t > 10
    beats.push({
      title: L('beat_path'),
      text: bm
        ? `${esc(w?.party ?? '?')} menang pada ${last.date.slice(0, 4)} dengan majoriti <strong>${fmtPct(last.majority_perc)}</strong>${t != null ? `, tetapi hanya <strong>${fmtPct(t, 0)}</strong> keluar mengundi${turnoutCollapsed ? ` (${prev.date.slice(0, 4)}: ${fmtPct(tp, 0)})` : ''}` : ''}. ${turnoutCollapsed ? 'Kerusi ini diputuskan oleh siapa yang KELUAR, bukan siapa yang bertukar parti.' : 'Setiap undi dikira.'}`
        : `${esc(w?.party ?? '?')} won in ${last.date.slice(0, 4)} with a <strong>${fmtPct(last.majority_perc)}</strong> majority${t != null ? `, but only <strong>${fmtPct(t, 0)}</strong> turned out${turnoutCollapsed ? ` (${prev.date.slice(0, 4)}: ${fmtPct(tp, 0)})` : ''}` : ''}. ${turnoutCollapsed ? 'This seat is decided by who SHOWS UP, not who switches sides.' : 'Every vote counts.'}`,
    })
  }

  // 2 — the deciders (youth + new voters)
  const demo = seat.demographics.find(d => d.election === 'JHR-SE-16')
  const ge15 = seat.demographics.find(d => d.election === 'GE-15')
  if (demo) {
    const youthN = demo.age.age_18_20 + demo.age.age_21_29
    const youthP = Math.round(100 * youthN / demo.voters_total)
    const newV = ge15 && demo.voters_total > ge15.voters_total ? demo.voters_total - ge15.voters_total : null
    beats.push({
      title: L('beat_voters'),
      text: bm
        ? `<strong>${fmtNum(youthN)}</strong> pengundi bawah 30 (${youthP}% daftar 2026)${newV ? `, termasuk <strong>${fmtNum(newV)}</strong> pengundi baharu sejak PRU15` : ''}. Merekalah yang menentukan langkah 1.`
        : `<strong>${fmtNum(youthN)}</strong> voters under 30 (${youthP}% of the 2026 roll)${newV ? `, including <strong>${fmtNum(newV)}</strong> new voters since GE15` : ''}. They decide beat 1.`,
    })
  }

  // 3 — the doorstep message (one issue, not twelve)
  const risers = seat.prices.items
    .filter(i => i.change_12w_perc != null && i.change_12w_perc >= 3)
    .sort((a, b) => b.change_12w_perc - a.change_12w_perc)
  const r = raceStats(seat, idx)
  if (risers.length) {
    const top = risers[0]
    const lbl = (bm ? top.label_bm : top.label_en).toLowerCase()
    const cpi = r?.cpiYoy
    beats.push({
      title: L('beat_message'),
      text: bm
        ? `Satu isu, satu mesej: harga <strong>${esc(lbl)}</strong> naik <strong>${top.change_12w_perc}%</strong> dalam 12 minggu di ${esc(seat.prices.district ?? 'Johor')}${cpi != null ? ` — sedangkan inflasi rasmi kata ${cpi.toFixed(1)}% SETAHUN` : ''}. Tunjukkan harga di pasar mereka sendiri (senarai premis di bawah).`
        : `One issue, one message: <strong>${esc(lbl)}</strong> up <strong>${top.change_12w_perc}%</strong> in 12 weeks in ${esc(seat.prices.district ?? 'Johor')}${cpi != null ? ` — while official inflation says ${cpi.toFixed(1)}% A YEAR` : ''}. Show them prices from their own market (premise list below).`,
    })
  }

  // 4 — the ground map (where to spend shoe leather)
  const sal = seat.saluran2022
  if (sal) {
    const dms = sal.dms.filter(d => d.type === 'biasa' && d.valid > 0)
    const share = (dm, b) => 100 * (dm.blocs[b] || 0) / dm.valid
    const own = (sal.totals.MUDA ? 'MUDA' : sal.totals.PH ? 'PH' : null)
    if (seat.featured && own && dms.length) {
      const top = [...dms].sort((a, b) => share(b, own) - share(a, own)).slice(0, 3)
      const list = top.map(d => `${esc(d.name)} (${share(d, own).toFixed(0)}% ${own}, ${bm ? 'keluar' : 'turnout'} ${fmtPct(d.turnout_perc, 0)})`).join(' · ')
      beats.push({
        title: L('beat_ground'),
        text: bm
          ? `Kubu 2022 dengan keluar mengundi rendah = undi tersedia menunggu dikutip: ${list}.`
          : `2022 strongholds with low turnout = votes waiting to be collected: ${list}.`,
      })
    } else if (dms.length) {
      const close = dms.map(d => {
        const s = Object.values(d.blocs).map(v => 100 * v / d.valid).sort((x, y) => y - x)
        return { d, gap: (s[0] ?? 0) - (s[1] ?? 0) }
      }).sort((a, b) => a.gap - b.gap)[0]
      if (close) beats.push({
        title: L('beat_ground'),
        text: bm
          ? `Medan rebutan paling sengit 2022: <strong>${esc(close.d.name)}</strong> (beza hanya ${close.gap.toFixed(0)} mata). Mulakan di situ.`
          : `Tightest battleground in 2022: <strong>${esc(close.d.name)}</strong> (only ${close.gap.toFixed(0)} points apart). Start there.`,
      })
    }
  }

  // 5 — the ask
  const e = seat.election2026
  if (e?.polling_date) {
    const past = new Date(`${e.polling_date}T00:00:00`) < new Date()
    if (!past) beats.push({
      title: L('beat_ask'),
      text: bm
        ? `Undi awal <strong>7 Julai</strong> · hari mengundi <strong>11 Julai</strong>. Setiap penyokong yang dikenal pasti dalam langkah 4: pastikan mereka tahu pusat mengundi dan ada pengangkutan.`
        : `Early voting <strong>7 July</strong> · polling day <strong>11 July</strong>. For every supporter identified in beat 4: make sure they know their polling centre and have a ride.`,
    })
  }
  return beats
}

function storyCard(seat, bench, idx) {
  const beats = storyFor(seat, bench, idx)
  if (beats.length < 3) return ''
  return `<div class="card">
    <h2>${L('story_title')}</h2>
    <p class="sub">${L('story_sub')}</p>
    <ol class="story">
      ${beats.map(b => `<li><div><div class="beat-title">${esc(b.title)}</div><div>${b.text}</div></div></li>`).join('')}
    </ol>
  </div>`
}

function renderField(seat, bench, idx) {
  const demo = seat.demographics.find(d => d.election === 'JHR-SE-16') ?? seat.demographics[0]
  const pts = talkingPoints(seat, bench, idx)
  let demoHtml = ''
  if (demo) {
    const ageBands = [['18–20', demo.age.age_18_20], ['21–29', demo.age.age_21_29], ['30–39', demo.age.age_30_39], ['40–49', demo.age.age_40_49], ['50–59', demo.age.age_50_59], ['60–69', demo.age.age_60_69], ['70+', demo.age.age_70_79 + demo.age.age_80_89 + demo.age['age_90+']]]
    const eth = [['Melayu', demo.ethnic.ethnic_malay], ['Cina', demo.ethnic.ethnic_chinese], ['India', demo.ethnic.ethnic_indian], [state.lang === 'bm' ? 'Lain-lain' : 'Others', demo.ethnic.ethnic_bumi_sabah + demo.ethnic.ethnic_bumi_sarawak + demo.ethnic.ethnic_orang_asli + demo.ethnic.ethnic_other]]
    const maxAge = Math.max(...ageBands.map(a => a[1]))
    const maxEth = Math.max(...eth.map(a => a[1]))
    demoHtml = `<div class="card">
      <h2>${L('demo_title')}</h2>
      <p class="sub">${L('demo_sub')} · ${fmtNum(demo.voters_total)} ${L('voters')} · ${fmtPct(100 * demo.sex_female / demo.voters_total, 0)} ${L('women')}</p>
      <h3>${L('age_dist')}</h3>
      ${ageBands.map(([lbl, v]) => barRow(lbl, 100 * v / maxAge, fmtPct(100 * v / demo.voters_total, 0))).join('')}
      <h3>${L('ethnic_dist')}</h3>
      ${eth.map(([lbl, v]) => barRow(lbl, 100 * v / maxEth, fmtPct(100 * v / demo.voters_total, 0))).join('')}
    </div>`
  }
  const premises = seat.prices.premises.slice(0, 8)
  const itemLabel = new Map(seat.prices.items.map(i => [i.code, i]))
  const premHtml = premises.length ? `<div class="card">
    <h2>${L('nearby')}</h2>
    <p class="sub">${L('nearby_sub')}</p>
    <table class="data"><tbody>
      ${premises.map(pr => {
        const sample = Object.entries(pr.prices).slice(0, 3)
          .map(([code, v]) => {
            const it = itemLabel.get(Number(code))
            return it ? `${esc((state.lang === 'bm' ? it.label_bm : it.label_en).toLowerCase())} ${fmtRM(v.price)}` : null
          }).filter(Boolean).join(' · ')
        return `<tr><td><strong>${esc(pr.premise)}</strong><br><span style="color:var(--muted);font-size:.72rem">${esc(pr.type)}</span></td><td style="font-size:.78rem">${sample}</td></tr>`
      }).join('')}
    </tbody></table>
  </div>` : ''

  return `
    ${storyCard(seat, bench, idx)}
    <div class="card">
      <h2>${L('talking_points')}</h2>
      <p class="sub">${L('tp_sub')}</p>
      <ul class="points">${pts.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>
    ${demoHtml}
    ${premHtml}`
}

function renderHq(seat) {
  const hist = seat.history
  const histHtml = `<div class="card">
    <h2>${L('history')}</h2>
    <table class="data">
      <thead><tr><th>${L('election')}</th><th>${L('winner')}</th><th class="num">${L('majority')}</th><th class="num">${L('turnout')}</th></tr></thead>
      <tbody>${hist.map(c => `
        <tr>
          <td>${esc(c.election)}<br><span style="color:var(--muted);font-size:.72rem">${esc(c.date)} · ${esc(c.code_then)}</span></td>
          <td>${esc(c.ballot[0]?.name ?? '')}<br>${partyBadge(c.ballot[0]?.party ?? '?', c.ballot[0]?.coalition)}</td>
          <td class="num">${fmtPct(c.majority_perc)}</td>
          <td class="num">${fmtPct(c.voter_turnout_perc)}</td>
        </tr>`).join('')}
      </tbody></table>
  </div>`

  let salHtml = ''
  const sal = seat.saluran2022
  if (sal) {
    const dms = sal.dms.filter(d => d.type === 'biasa')
    const rows = dms.map(dm => {
      const shares = Object.fromEntries(Object.entries(dm.blocs).map(([b, v]) => [b, dm.valid ? 100 * v / dm.valid : 0]))
      const top = Object.entries(shares).sort((a, b) => b[1] - a[1])[0]
      return { dm, shares, top }
    })
    rows.sort((a, b) => (b.shares.MUDA ?? 0) + (b.shares.PH ?? 0) - ((a.shares.MUDA ?? 0) + (a.shares.PH ?? 0)))
    salHtml = `<div class="card">
      <h2>${L('saluran')}</h2>
      <p class="sub">${L('saluran_sub')}</p>
      <div class="legend"><span class="l-ph">PH</span><span class="l-muda">MUDA</span><span class="l-bn">BN</span><span class="l-pn">PN</span><span class="l-lain">Lain</span></div>
      <table class="data">
        <thead><tr><th>${L('dm')}</th><th style="width:38%"></th><th class="num">${L('turnout')}</th></tr></thead>
        <tbody>${rows.map(({ dm, top }) => `
          <tr>
            <td><strong>${esc(dm.name)}</strong><br><span style="color:var(--muted);font-size:.7rem">${esc(dm.code)} · ${fmtNum(dm.voters)} ${L('voters')} · ${top ? `${esc(top[0])} ${top[1].toFixed(0)}%` : ''}</span></td>
            <td>${stackBar(dm.blocs, dm.valid)}</td>
            <td class="num">${fmtPct(dm.turnout_perc, 0)}</td>
          </tr>`).join('')}
        </tbody></table>
    </div>`
  }

  const k = seat.kawasanku
  const kawHtml = k ? `<div class="card">
    <h2>${L('kaw_title')}</h2>
    <p class="sub">${L('kaw_sub')}</p>
    <div class="chips">
      ${k.income_mean != null ? `<span class="chip">${L('income_mean')} RM${fmtNum(k.income_mean)}</span>` : ''}
      ${k.expenditure_mean != null ? `<span class="chip">${L('expenditure')} RM${fmtNum(k.expenditure_mean)}</span>` : ''}
      ${k.gini != null ? `<span class="chip">Gini ${k.gini}</span>` : ''}
      ${k.poverty != null ? `<span class="chip">${L('poverty')} ${fmtPct(k.poverty)}</span>` : ''}
      ${k.labour_urate != null ? `<span class="chip">${L('u_rate')} ${fmtPct(k.labour_urate)}</span>` : ''}
      ${k.electricity != null ? `<span class="chip">${L('electricity')} ${fmtPct(k.electricity, 0)}</span>` : ''}
      ${k.water != null ? `<span class="chip">${L('water')} ${fmtPct(k.water, 0)}</span>` : ''}
      ${k.hospital != null ? `<span class="chip">${L('hospitals')} ${perK(k.hospital)}</span>` : ''}
      ${k.clinic != null ? `<span class="chip">${L('clinics')} ${perK(k.clinic)}</span>` : ''}
      ${k.school != null ? `<span class="chip">${L('schools')} ${perK(k.school)}</span>` : ''}
      ${k.grocery != null ? `<span class="chip">${L('grocery')} ${perK(k.grocery)}</span>` : ''}
      ${k.atm != null ? `<span class="chip">${L('atm')} ${perK(k.atm)}</span>` : ''}
      ${k.petrol != null ? `<span class="chip">${L('petrol')} ${perK(k.petrol)}</span>` : ''}
    </div>
  </div>` : ''

  const inc = seat.socio.income ?? []
  const lab = seat.socio.labour ?? []
  const socioHtml = (inc.length || lab.length) ? `<div class="card">
    <h2>${L('socio_series')}</h2>
    ${inc.length ? `<h3>${L('income_median')}</h3><table class="data"><tbody>
      <tr>${inc.map(r => `<td class="num"><span style="color:var(--muted);font-size:.72rem">${r.date.slice(0, 4)}</span><br>RM${fmtNum(r.income_median)}</td>`).join('')}</tr>
    </tbody></table>` : ''}
    ${lab.length ? `<h3>${L('u_rate')}</h3><table class="data"><tbody>
      <tr>${lab.map(r => `<td class="num"><span style="color:var(--muted);font-size:.72rem">${r.date.slice(0, 4)}</span><br>${fmtPct(r.u_rate)}</td>`).join('')}</tr>
    </tbody></table>` : ''}
  </div>` : ''

  return `${histHtml}${salHtml}${kawHtml}${socioHtml}
    <div class="card">
      <h2>${L('export')}</h2>
      <div class="btn-row">
        <a class="btn secondary" href="data/seats/${seat.slug}.json" download>${L('export_json')}</a>
        <button class="btn secondary" id="csvBtn">${L('export_csv')}</button>
      </div>
    </div>`
}

async function renderSeat(slug, tab = 'brief') {
  const [idx, seat] = await Promise.all([loadIndex(), loadSeat(slug)])
  const bench = johorBenchmarks(idx)
  let mapSvg = ''
  try {
    const geo = await loadGeo()
    const feature = geo.features.find(f => f.properties.slug === slug)
    if (feature && seat.bbox) mapSvg = miniMap(feature, seat.bbox)
  } catch { /* map optional */ }

  app.innerHTML = `
    <div class="seat-head">
      ${mapSvg}
      <div>
        <div class="crumbs"><a href="#/">← Johor</a> · ${esc(seat.parlimen ?? '')}</div>
        <h1>${esc(seat.code)} ${esc(seat.name)}</h1>
        <div class="crumbs">${esc(seat.prices.district ?? '')} · ${fmtNum(seat.election2026?.voters_total)} ${L('voters')}</div>
      </div>
    </div>
    <div class="tabs">
      <button data-tab="brief" class="${tab === 'brief' ? 'active' : ''}">${L('tab_brief')}</button>
      <button data-tab="field" class="${tab === 'field' ? 'active' : ''}">${L('tab_field')}</button>
      <button data-tab="hq" class="${tab === 'hq' ? 'active' : ''}">${L('tab_hq')}</button>
    </div>
    <div id="tabContent"></div>`

  const content = document.getElementById('tabContent')
  content.innerHTML = tab === 'field' ? renderField(seat, bench, idx) : tab === 'hq' ? renderHq(seat) : renderBrief(seat, bench, idx)

  document.querySelectorAll('.tabs button').forEach(btn =>
    btn.addEventListener('click', () => { location.hash = `#/seat/${slug}/${btn.dataset.tab}` }))

  const shareBtn = document.getElementById('shareBtn')
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const text = shareText(seat)
    if (navigator.share) { try { await navigator.share({ text }) } catch { /* cancelled */ } return }
    let ok = false
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); ok = true } catch { /* denied */ }
    }
    if (!ok) {
      // clipboard API needs a secure context; fall back for plain-http hosting
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { ok = document.execCommand('copy') } catch { /* unsupported */ }
      ta.remove()
    }
    if (!ok) { window.prompt('Salin / Copy:', text); return }
    const orig = shareBtn.textContent
    shareBtn.textContent = L('copied')
    setTimeout(() => { shareBtn.textContent = orig }, 2000)
  })

  const csvBtn = document.getElementById('csvBtn')
  if (csvBtn) csvBtn.addEventListener('click', () => {
    const sal = seat.saluran2022
    if (!sal) return
    const blocs = ['PH', 'MUDA', 'BN', 'PN', 'LAIN']
    const lines = [['dm_code', 'dm_name', 'type', 'voters', 'turnout_perc', 'valid', ...blocs].join(',')]
    for (const dm of sal.dms) {
      lines.push([dm.code, `"${dm.name.replace(/"/g, '""')}"`, dm.type, dm.voters ?? '', dm.turnout_perc ?? '', dm.valid, ...blocs.map(b => dm.blocs[b] ?? 0)].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${seat.slug}-saluran-2022.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  })

  renderFooter(idx)
  window.scrollTo(0, 0)
}

// ---------- router ----------
async function route() {
  const hash = location.hash || '#/'
  try {
    const m = hash.match(/^#\/seat\/([a-z0-9-]+)(?:\/(brief|field|hq))?/)
    if (m) await renderSeat(m[1], m[2] ?? 'brief')
    else await renderHome()
  } catch (e) {
    console.error(e)
    app.innerHTML = `<div class="card">${L('err')}</div>`
  }
}

document.getElementById('langToggle').addEventListener('click', () => {
  state.lang = state.lang === 'bm' ? 'en' : 'bm'
  storage.set('lang', state.lang)
  document.getElementById('langToggle').textContent = state.lang === 'bm' ? 'EN' : 'BM'
  route()
})
document.getElementById('langToggle').textContent = state.lang === 'bm' ? 'EN' : 'BM'

window.addEventListener('hashchange', route)
route()
