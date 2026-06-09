// Time math helpers for the timeline playback dashboard.
//
// The timeline maps a time range [now - rangeMs, now] onto the horizontal axis,
// where the RIGHT edge (x = width) is always NOW and the LEFT edge is the
// oldest visible moment.

export const SECOND = 1_000
export const MINUTE = 60_000

/** Live-edge threshold: within this distance of NOW we consider it "LIVE". */
export const LIVE_THRESHOLD_MS = 10 * SECOND

/** Format an epoch-ms timestamp as a HH:MM:SS clock label. */
export function formatClock(ts: number, withSeconds = true): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  if (!withSeconds) return `${h}:${m}`
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** Human "N min ago" / "Ns ago" / "now" label for a timestamp vs. a reference. */
export function minutesAgoLabel(ts: number, now: number): string {
  const deltaMs = Math.max(0, now - ts)
  if (deltaMs < 5 * SECOND) return 'now'
  if (deltaMs < MINUTE) return `${Math.round(deltaMs / SECOND)}s ago`
  const mins = Math.floor(deltaMs / MINUTE)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m ago`
}

/** Whether a timestamp is at the live edge (within LIVE_THRESHOLD_MS of now). */
export function isLive(ts: number, now: number): boolean {
  return now - ts <= LIVE_THRESHOLD_MS
}

/**
 * Map a timestamp to a horizontal fraction [0, 1] within the visible window.
 * 0 = left edge (oldest visible), 1 = right edge (NOW).
 */
export function timeToFraction(ts: number, now: number, rangeMs: number): number {
  const start = now - rangeMs
  const f = (ts - start) / rangeMs
  return Math.min(1, Math.max(0, f))
}

/** Map a timestamp to an x pixel position given the track width. */
export function timeToX(
  ts: number,
  now: number,
  rangeMs: number,
  width: number,
): number {
  return timeToFraction(ts, now, rangeMs) * width
}

/** Inverse of {@link timeToFraction}: a fraction [0,1] back to a timestamp. */
export function fractionToTime(fraction: number, now: number, rangeMs: number): number {
  const f = Math.min(1, Math.max(0, fraction))
  return now - rangeMs + f * rangeMs
}

export interface RulerTick {
  ts: number
  /** Fraction [0,1] across the visible window. */
  fraction: number
  label: string
  /** True for the rightmost tick (NOW / LIVE). */
  isNow: boolean
}

/**
 * Generate evenly-spaced ruler ticks across the visible window, with the
 * rightmost tick pinned exactly to NOW (labelled "LIVE").
 */
export function generateTicks(now: number, rangeMs: number): RulerTick[] {
  // Pick a tick step that yields ~6 labels for the chosen range.
  const rangeMin = rangeMs / MINUTE
  let stepMin = 5
  if (rangeMin <= 15) stepMin = 3
  else if (rangeMin <= 30) stepMin = 5
  else if (rangeMin <= 60) stepMin = 10
  else stepMin = 15

  const stepMs = stepMin * MINUTE
  const ticks: RulerTick[] = []

  // Walk from NOW backwards by the step so labels land on round-ish marks
  // and the last (rightmost) tick is exactly NOW.
  for (let ts = now; ts >= now - rangeMs - 1; ts -= stepMs) {
    const isNowTick = ts === now
    ticks.push({
      ts,
      fraction: timeToFraction(ts, now, rangeMs),
      label: isNowTick ? 'LIVE' : formatClock(ts, false),
      isNow: isNowTick,
    })
  }

  return ticks.reverse()
}
