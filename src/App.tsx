import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { ComposerMode, DemoPost, PlaybackSpeed, PostStatus } from './types'
import { generateDemoPosts } from './demoData'
import { DEFAULT_PLAYBACK, loadPlayback, savePlayback } from './storage'
import {
  MINUTE,
  formatClock,
  generateTicks,
  isLive,
  minutesAgoLabel,
  timeToFraction,
} from './time'

const SPEEDS: PlaybackSpeed[] = [1, 1.2, 1.5, 2]
const RANGES = [15, 30, 60, 90]

/** Deterministic accent color from an avatar seed. */
function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `hsl(${h}, 70%, 55%)`
}

export default function App() {
  const initial = useRef(loadPlayback())

  // Live-updating "now" clock.
  const [now, setNow] = useState(() => Date.now())

  // Playback head as an absolute epoch-ms timestamp.
  const [playheadAt, setPlayheadAt] = useState(
    () => Date.now() - initial.current.secondsBehindNow * 1000,
  )

  const [playing, setPlaying] = useState(initial.current.playing)
  const [speed, setSpeed] = useState<PlaybackSpeed>(initial.current.speed)
  const [follow, setFollow] = useState(initial.current.follow)
  const [rangeMinutes, setRangeMinutes] = useState(initial.current.rangeMinutes)

  const [composerText, setComposerText] = useState('')
  const [composerMode, setComposerMode] = useState<ComposerMode>('now')
  const [toast, setToast] = useState<string | null>(null)

  const rangeMs = rangeMinutes * MINUTE

  // Demo dataset, regenerated only when the per-minute anchor changes so new
  // posts "arrive" at the live edge over time but the set is otherwise stable.
  const minuteAnchor = Math.floor(now / MINUTE)
  const posts = useMemo<DemoPost[]>(
    () => generateDemoPosts(minuteAnchor * MINUTE + MINUTE),
    [minuteAnchor],
  )

  // ---- Animation loop: advance now + playhead via real-time deltas ----------
  const lastFrame = useRef<number>(performance.now())
  useEffect(() => {
    let raf = 0
    const tick = (t: number) => {
      const dt = t - lastFrame.current
      lastFrame.current = t
      const realNow = Date.now()
      setNow(realNow)

      setPlayheadAt((prev) => {
        if (follow) return realNow // pinned to the live edge
        if (!playing) return Math.min(prev, realNow)
        const next = prev + dt * speed
        return Math.min(next, realNow) // never overshoot the live edge
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, follow])

  // Keep the playhead inside the visible window's lower bound.
  useEffect(() => {
    setPlayheadAt((prev) => Math.max(prev, now - rangeMs))
  }, [now, rangeMs])

  // ---- Persist state (debounced-ish via secondsBehindNow snapshot) ----------
  useEffect(() => {
    const secondsBehindNow = Math.max(0, (now - playheadAt) / 1000)
    savePlayback({ secondsBehindNow, speed, follow, playing, rangeMinutes })
  }, [now, playheadAt, speed, follow, playing, rangeMinutes])

  // ---- Toast auto-dismiss ---------------------------------------------------
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const live = isLive(playheadAt, now)
  const secondsBehind = Math.max(0, Math.round((now - playheadAt) / 1000))

  // The "current" post is the latest one at or before the playhead.
  const visiblePosts = useMemo(
    () => posts.filter((p) => p.created_at >= now - rangeMs && p.created_at <= now),
    [posts, now, rangeMs],
  )

  const currentPostId = useMemo(() => {
    let candidate: DemoPost | null = null
    for (const p of posts) {
      if (p.created_at <= playheadAt) candidate = p
      else break
    }
    return candidate?.id ?? null
  }, [posts, playheadAt])

  function statusOf(post: DemoPost): PostStatus {
    if (post.id === currentPostId) return 'current'
    return post.created_at <= playheadAt ? 'played' : 'upcoming'
  }

  // ---- Control handlers -----------------------------------------------------
  const togglePlay = useCallback(() => {
    setFollow(false)
    setPlaying((p) => !p)
  }, [])

  const jump = useCallback(
    (deltaMin: number) => {
      setFollow(false)
      setPlayheadAt((prev) =>
        Math.min(now, Math.max(now - rangeMs, prev + deltaMin * MINUTE)),
      )
    },
    [now, rangeMs],
  )

  const toggleFollow = useCallback(() => {
    setFollow((f) => {
      const next = !f
      if (next) {
        setPlayheadAt(Date.now())
        setPlaying(true)
      }
      return next
    })
  }, [])

  const onSeek = useCallback(
    (fraction: number) => {
      setFollow(false)
      const ts = now - rangeMs + fraction * rangeMs
      setPlayheadAt(Math.min(now, Math.max(now - rangeMs, ts)))
    },
    [now, rangeMs],
  )

  const resetDemo = useCallback(() => {
    setPlaying(DEFAULT_PLAYBACK.playing)
    setSpeed(DEFAULT_PLAYBACK.speed)
    setFollow(DEFAULT_PLAYBACK.follow)
    setRangeMinutes(DEFAULT_PLAYBACK.rangeMinutes)
    setPlayheadAt(Date.now() - DEFAULT_PLAYBACK.secondsBehindNow * 1000)
  }, [])

  const onPost = useCallback(() => {
    const stamp =
      composerMode === 'now' ? now : playheadAt
    setToast(
      `Demo stub: posting is disabled. Would publish @ ${formatClock(stamp)} (${
        composerMode === 'now' ? 'NOW' : 'PLAYBACK'
      }).`,
    )
    setComposerText('')
  }, [composerMode, now, playheadAt])

  const ticks = useMemo(() => generateTicks(now, rangeMs), [now, rangeMs])
  const playheadFraction = timeToFraction(playheadAt, now, rangeMs)
  const seekValue = Math.round(playheadFraction * 1000)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo-dot" />
          <div>
            <h1>nosplay-like</h1>
            <p className="tagline">Nostr-style live timeline playback</p>
          </div>
        </div>
        <div className="status-cluster">
          <span className={`live-badge ${live ? 'is-live' : ''}`}>
            <span className="live-pip" />
            {live ? 'LIVE' : `-${secondsBehind}s`}
          </span>
          <span className="clock" aria-label="current time">
            {formatClock(now)}
          </span>
        </div>
      </header>

      <div className="demo-banner" role="note">
        Demo / sample data — all posts below are simulated, not real Nostr events.
      </div>

      <main className="stage">
        <section className="timeline-panel" aria-label="Timeline">
          <div className="timeline-head">
            <h2>Timeline</h2>
            <span className="window-label">
              showing last {rangeMinutes} min · playhead at{' '}
              {live ? 'NOW' : minutesAgoLabel(playheadAt, now)}
            </span>
          </div>

          <div className="ruler">
            <div className="ruler-track">
              {/* density markers for each visible post */}
              {visiblePosts.map((p) => (
                <span
                  key={p.id}
                  className={`density-mark ${
                    p.created_at <= playheadAt ? 'played' : 'upcoming'
                  }`}
                  style={{
                    left: `${timeToFraction(p.created_at, now, rangeMs) * 100}%`,
                  }}
                />
              ))}
              {/* playhead */}
              <div
                className="playhead"
                style={{ left: `${playheadFraction * 100}%` }}
              >
                <span className="playhead-flag">{formatClock(playheadAt, false)}</span>
              </div>
            </div>
            <div className="ruler-labels">
              {ticks.map((t) => (
                <span
                  key={t.ts}
                  className={`ruler-label ${t.isNow ? 'now' : ''}`}
                  style={{ left: `${t.fraction * 100}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <input
            className="seek"
            type="range"
            min={0}
            max={1000}
            value={seekValue}
            aria-label="Seek playback position"
            onChange={(e) => onSeek(Number(e.target.value) / 1000)}
          />

          {/* Controls bar */}
          <div className="controls">
            <button
              type="button"
              className="ctrl primary"
              onClick={togglePlay}
              aria-pressed={playing}
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>

            <button type="button" className="ctrl" onClick={() => jump(-1)}>
              « 1 min
            </button>
            <button type="button" className="ctrl" onClick={() => jump(1)}>
              1 min »
            </button>

            <label className="ctrl-field">
              <span>Speed</span>
              <select
                value={speed}
                onChange={(e) =>
                  setSpeed(Number(e.target.value) as PlaybackSpeed)
                }
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s.toFixed(1)}×
                  </option>
                ))}
              </select>
            </label>

            <label className="ctrl-field">
              <span>Window</span>
              <select
                value={rangeMinutes}
                onChange={(e) => setRangeMinutes(Number(e.target.value))}
              >
                {RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r} min
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`ctrl toggle ${follow ? 'on' : ''}`}
              onClick={toggleFollow}
              aria-pressed={follow}
            >
              {follow ? '◉ Following live' : '○ Follow live'}
            </button>

            <button type="button" className="ctrl ghost" onClick={resetDemo}>
              Reset
            </button>
          </div>
        </section>

        <section className="feed-panel" aria-label="Feed">
          <div className="feed-head">
            <h2>Feed</h2>
            <span className="feed-count">{visiblePosts.length} notes in window</span>
          </div>
          <ul className="feed">
            {visiblePosts.length === 0 && (
              <li className="empty">No notes in this window.</li>
            )}
            {visiblePosts
              .slice()
              .reverse()
              .map((post) => {
                const status = statusOf(post)
                return (
                  <li key={post.id} className={`card ${status}`}>
                    <div
                      className="avatar"
                      style={{ background: avatarColor(post.avatarSeed) }}
                      aria-hidden
                    >
                      {post.author.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="card-body">
                      <div className="card-head">
                        <span className="author">{post.author}</span>
                        <span className="npub">{post.pubkey}</span>
                        <span className="time">
                          {minutesAgoLabel(post.created_at, now)}
                        </span>
                        {status === 'current' && (
                          <span className="now-tag">◀ playing</span>
                        )}
                        {status === 'upcoming' && (
                          <span className="lock-tag">⟲ upcoming</span>
                        )}
                      </div>
                      <p className="content">{post.content}</p>
                    </div>
                  </li>
                )
              })}
          </ul>
        </section>
      </main>

      <section className="composer" aria-label="Composer (stub)">
        <div className="composer-head">
          <h2>Compose</h2>
          <span className="stub-tag">stub · demo only</span>
        </div>
        <textarea
          className="composer-input"
          placeholder="What's happening on nostr? (posting is disabled in this demo)"
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          rows={2}
        />
        <div className="composer-foot">
          <fieldset className="ts-mode">
            <legend>Timestamp</legend>
            <label>
              <input
                type="radio"
                name="ts-mode"
                checked={composerMode === 'now'}
                onChange={() => setComposerMode('now')}
              />
              NOW ({formatClock(now)})
            </label>
            <label>
              <input
                type="radio"
                name="ts-mode"
                checked={composerMode === 'playback'}
                onChange={() => setComposerMode('playback')}
              />
              Playback position ({formatClock(playheadAt)})
            </label>
          </fieldset>
          <button type="button" className="ctrl primary" onClick={onPost}>
            Post (stub)
          </button>
        </div>
      </section>

      <footer className="foot">
        nosplay-like — a demo Nostr-style live timeline playback dashboard. Sample
        data, no network, no real events.
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
