// Deterministic DEMO / SAMPLE dataset generator.
//
// Produces simulated Nostr-ish posts spread over roughly the last ~90 minutes
// with deliberately VARIED density (busy clusters separated by quiet gaps),
// so the timeline looks like a real live feed. Everything here is fake.

import type { DemoPost } from './types'

const MINUTE = 60_000

/** Small deterministic PRNG (mulberry32) so the dataset is stable per seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const AUTHORS: { name: string; npub: string; seed: string }[] = [
  { name: 'satoshi_dev', npub: 'npub1q9x7…k2lf', seed: 'a' },
  { name: 'moonlight', npub: 'npub1m0on…7h3a', seed: 'b' },
  { name: 'relay_runner', npub: 'npub1r3la…yy0p', seed: 'c' },
  { name: 'zap_queen', npub: 'npub1zapq…e8tu', seed: 'd' },
  { name: 'nostrich', npub: 'npub1bird…q4mn', seed: 'e' },
  { name: 'orange_pill', npub: 'npub1pill…v2cw', seed: 'f' },
  { name: 'lina.dev', npub: 'npub1lina…s9kx', seed: 'g' },
  { name: 'nodeoperator', npub: 'npub1node…3rtd', seed: 'h' },
  { name: 'purpleフォトン', npub: 'npub1phot…6ja2', seed: 'i' },
  { name: 'cypher_kat', npub: 'npub1kat0…wm1l', seed: 'j' },
]

const SNIPPETS: string[] = [
  'gm nostr ☀️ another block, another day of freedom tech',
  'just zapped my favorite dev 2100 sats. value for value works.',
  'the timeline playback feature is wild — scrubbing through a live feed feels like rewinding time',
  'relay decentralization is the whole point. run your own.',
  'hot take: the protocol wins because it is boring and reliable',
  'watching this dashboard replay the last 90 minutes. demo data but the UX is clean',
  'PV: signed my first event from a hardware signer today 🔐',
  'anyone else seeing relay lag on the big public ones tonight?',
  'building in public > building in stealth. always.',
  'nostr is just notes and other stuff transmitted by relays. simple.',
  'zap-powered live streams are the killer app, change my mind',
  'reposting this because more people need to see it',
  'the live edge indicator turning green at NOW is a nice touch',
  'sats stream in while you sleep. magic internet money does work.',
  'follow mode keeps me pinned to the live edge — exactly what i wanted',
  'open protocols, open mind. ship it.',
  '90 minutes of feed, varied density, deterministic seed. very tidy demo.',
  'gn all, see you on the other side of the playhead 🌙',
]

/**
 * Generate a deterministic DEMO timeline anchored to `now` (epoch ms).
 *
 * The window spans ~90 minutes ending at `now`. Posts are emitted in a few
 * dense clusters with quiet gaps in between to create realistic, uneven
 * density. Re-calling with the same `now` yields the same dataset.
 */
export function generateDemoPosts(now: number): DemoPost[] {
  // Seed off a coarse (per-minute) bucket so the data is stable across the
  // many `now` ticks within a session but still anchored to "now".
  const rand = mulberry32(Math.floor(now / MINUTE) ^ 0x9e3779b9)

  // Cluster centers expressed as "minutes ago", with a weight (post count).
  const clusters: { minutesAgo: number; spreadMin: number; count: number }[] = [
    { minutesAgo: 88, spreadMin: 4, count: 5 },
    { minutesAgo: 74, spreadMin: 3, count: 3 },
    // gap
    { minutesAgo: 58, spreadMin: 5, count: 7 },
    // gap
    { minutesAgo: 38, spreadMin: 3, count: 4 },
    { minutesAgo: 27, spreadMin: 6, count: 9 },
    // gap
    { minutesAgo: 11, spreadMin: 4, count: 6 },
    { minutesAgo: 3, spreadMin: 2.5, count: 5 },
    { minutesAgo: 0.4, spreadMin: 0.4, count: 2 },
  ]

  const posts: DemoPost[] = []
  let n = 0

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      // Jitter within the cluster spread.
      const jitter = (rand() - 0.5) * 2 * cluster.spreadMin
      const minutesAgo = Math.max(0, cluster.minutesAgo + jitter)
      const created_at = Math.round(now - minutesAgo * MINUTE)

      const author = AUTHORS[Math.floor(rand() * AUTHORS.length)]
      const content = SNIPPETS[Math.floor(rand() * SNIPPETS.length)]

      posts.push({
        id: `demo-${(n + 1).toString(36).padStart(4, '0')}-${Math.floor(
          rand() * 0xffff,
        )
          .toString(16)
          .padStart(4, '0')}`,
        pubkey: author.npub,
        author: author.name,
        avatarSeed: author.seed,
        content,
        created_at,
      })
      n++
    }
  }

  // Sort oldest → newest so the feed reads naturally.
  posts.sort((a, b) => a.created_at - b.created_at)
  return posts
}
