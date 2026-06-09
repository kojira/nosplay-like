// localStorage persistence for playback state.
//
// We persist `secondsBehindNow` (now - playheadAt) rather than an absolute
// timestamp, so restoring after a reload keeps the playhead at a sensible
// position relative to the freshly-computed "now".

import type { PlaybackState } from './types'

const STORAGE_KEY = 'nosplay-like:playback:v1'

export const DEFAULT_PLAYBACK: PlaybackState = {
  secondsBehindNow: 30 * 60, // start ~30 min behind the live edge
  speed: 1,
  follow: false,
  playing: false,
  rangeMinutes: 30,
}

const ALLOWED_SPEEDS: PlaybackState['speed'][] = [1, 1.2, 1.5, 2]
const ALLOWED_RANGES = [15, 30, 60, 90]

function coerce(raw: unknown): PlaybackState {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_PLAYBACK }
  const r = raw as Record<string, unknown>

  const speed = ALLOWED_SPEEDS.includes(r.speed as PlaybackState['speed'])
    ? (r.speed as PlaybackState['speed'])
    : DEFAULT_PLAYBACK.speed

  const rangeMinutes = ALLOWED_RANGES.includes(r.rangeMinutes as number)
    ? (r.rangeMinutes as number)
    : DEFAULT_PLAYBACK.rangeMinutes

  const secondsBehindNow =
    typeof r.secondsBehindNow === 'number' && isFinite(r.secondsBehindNow)
      ? Math.max(0, r.secondsBehindNow)
      : DEFAULT_PLAYBACK.secondsBehindNow

  return {
    secondsBehindNow,
    speed,
    rangeMinutes,
    follow: typeof r.follow === 'boolean' ? r.follow : DEFAULT_PLAYBACK.follow,
    playing: typeof r.playing === 'boolean' ? r.playing : DEFAULT_PLAYBACK.playing,
  }
}

/** Load persisted playback state, falling back to defaults on any error. */
export function loadPlayback(): PlaybackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLAYBACK }
    return coerce(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PLAYBACK }
  }
}

/** Persist playback state. Failures (e.g. private mode) are swallowed. */
export function savePlayback(state: PlaybackState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write failures
  }
}
