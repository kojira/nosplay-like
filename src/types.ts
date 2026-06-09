// Core domain types for the nosplay-like demo timeline playback dashboard.

/** A simulated Nostr-style post / note. DEMO data only. */
export interface DemoPost {
  /** Stable unique id (hex-ish, demo). */
  id: string
  /** Author's public key (npub-ish display handle, demo). */
  pubkey: string
  /** Human-friendly author display name. */
  author: string
  /** A seed used to derive a deterministic avatar color. */
  avatarSeed: string
  /** Note text content. */
  content: string
  /** Unix timestamp in milliseconds when the note was created. */
  created_at: number
}

/** Position of a post relative to the current playback head. */
export type PostStatus = 'played' | 'current' | 'upcoming'

/** Timestamp mode for the composer stub. */
export type ComposerMode = 'now' | 'playback'

/** Available playback speeds (real-time multipliers). */
export type PlaybackSpeed = 1 | 1.2 | 1.5 | 2

/** Persisted playback state (versioned in localStorage). */
export interface PlaybackState {
  /** Seconds the playhead is behind "now" (0 === live edge). */
  secondsBehindNow: number
  /** Playback speed multiplier. */
  speed: PlaybackSpeed
  /** Whether the playhead follows the live edge. */
  follow: boolean
  /** Whether playback is currently running. */
  playing: boolean
  /** Visible window size in minutes (zoom). */
  rangeMinutes: number
}
