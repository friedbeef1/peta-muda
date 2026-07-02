// Election history per DUN from the electiondata.my open data lake
// (headline_ballots.csv + headline_stats.csv, every contest 1955-present).
// Seats are matched across delimitation exercises by seat NAME within Johor,
// so pre-2018 contests under a different N-number still attach to the current
// seat; the code shown per contest is the one used on that polling day.
import { fetchText } from '../lib/fetch.mjs'
import { parseCsvObjects } from '../lib/csv.mjs'
import { SOURCES, STATE } from '../config.mjs'
import { seatCode, seatName } from './seats.mjs'

const num = (v) => (v === '' || v == null ? null : Number(v))

export async function loadHistory(seats) {
  const [ballotsText, statsText] = await Promise.all([
    fetchText(SOURCES.headlineBallots),
    fetchText(SOURCES.headlineStats),
  ])
  const ballots = parseCsvObjects(ballotsText).filter(r => r.state === STATE && r.seat.startsWith('N.'))
  const stats = parseCsvObjects(statsText).filter(r => r.state === STATE && r.seat.startsWith('N.'))

  const statKey = (r) => `${r.date}|${r.seat}`
  const statByContest = new Map(stats.map(r => [statKey(r), r]))

  // group ballots by contest
  const contests = new Map()
  for (const r of ballots) {
    const k = statKey(r)
    if (!contests.has(k)) contests.set(k, { date: r.date, election: r.election, seat: r.seat, ballot: [] })
    contests.get(k).ballot.push({
      name: r.name,
      party: r.party,
      party_uid: r.party_uid,
      coalition: r.coalition,
      coalition_uid: r.coalition_uid,
      votes: num(r.votes),
      votes_perc: num(r.votes_perc),
      result: r.result,
    })
  }

  // attach stats + index by seat name
  const bySeatName = new Map()
  for (const c of contests.values()) {
    c.ballot.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
    const s = statByContest.get(`${c.date}|${c.seat}`)
    if (s) {
      c.voters_total = num(s.voters_total)
      // in the lake headline_stats file, voter_turnout is already a percentage
      c.voter_turnout_perc = num(s.voter_turnout)
      c.majority = num(s.majority)
      c.majority_perc = num(s.majority_perc)
      c.votes_rejected = num(s.votes_rejected)
    }
    const nm = seatName(c.seat)
    if (!bySeatName.has(nm)) bySeatName.set(nm, [])
    bySeatName.get(nm).push(c)
  }
  for (const list of bySeatName.values()) list.sort((a, b) => b.date.localeCompare(a.date))

  const out = new Map()
  for (const seat of seats) {
    const list = (bySeatName.get(seat.name) ?? []).map(c => ({
      ...c,
      // nomination lineups for future polling days ship with result='pending'
      status: c.ballot.some(b => b.result === 'pending') ? 'upcoming' : 'completed',
      code_then: seatCode(c.seat),
      seat: undefined,
    }))
    out.set(seat.code, list)
  }
  return out
}
