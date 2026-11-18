import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { bgKey, markReady, watchBg } from './bgwork'
import type { ChatReply } from './BlockChat'
import type { BlockScope } from './context'

/**
 * A live dashboard's block chat message as a job of the server's own (BlockAskJobs.cs; owner, 2026-11-03: "own small
 * sessions for every card, kept in the database"): POST …/blockjob starts it, the page asks every 1.5 s how it goes (a
 * small read), and the block's chat takes the answer once (…/blockjob/take). A reload, a closed tab or another device
 * finds it on the server: the dashboard's list (…/blockjobs) brings the signs back, the block's chat its answer.
 */
const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const POLL_MS = 1500

/**
 * Where a dashboard's per-card things live on the server: a live dashboard's "live/{slug}", a catalog design's
 * "demo/{id}" (kept per signed-in Studio user there — Core's DemoSpace; owner's review 2026-11-04: the demo's card chat
 * survives a closed tab too). Used by the block chat (chatlog.ts), its unsent words (chatdraft.ts) and Nova's jobs here.
 */
export const spaceOf = (scope: BlockScope): string =>
  scope.kind === 'live' ? `live/${encodeURIComponent(scope.slug)}` : `demo/${encodeURIComponent(scope.id)}`

const jobUrl = (space: string, block: string, take = false) => `${BASE}/${space}/blockjob${take ? '/take' : ''}?block=${encodeURIComponent(block)}`

/** the answer was taken by another tab or device meanwhile: the chat reads the stored one again */
export class TakenElsewhere extends Error {}

interface Job {
  state?: 'running' | 'done' | 'failed'
  reply?: ChatReply
  status?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function read(space: string, block: string): Promise<Job | null> {
  try {
    const res = await fetch(jobUrl(space, block), { headers: { Accept: 'application/json' } })
    return res.ok ? ((await res.json()) as Job) : null
  } catch {
    return null
  }
}

/** waits while the job runs (a network blip just waits on), then takes its answer */
async function finish(space: string, block: string, first: Job | null): Promise<ChatReply> {
  let job = first
  while (!job || job.state === 'running') {
    await sleep(POLL_MS)
    job = await read(space, block)
  }
  if (!job.state) throw new TakenElsewhere()
  const res = await fetch(jobUrl(space, block, true), { method: 'POST', headers: { Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE } })
  if (!res.ok) throw new Error(String(res.status))
  const taken = (await res.json()) as Job
  if (!taken.state) throw new TakenElsewhere()
  if (taken.state === 'failed' || !taken.reply) throw new Error(String(taken.status ?? 500))
  return taken.reply
}

/** sends the message as a server job and resolves with Nova's answer */
export async function askAsJob(space: string, block: string, body: unknown): Promise<ChatReply> {
  const res = await fetch(jobUrl(space, block), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(String(res.status))
  return finish(space, block, (await res.json()) as Job)
}

/** the block's job begun before (a reload, another device): its answer when there is one, null when there is none */
export async function resumeJob(space: string, block: string): Promise<ChatReply | null> {
  const job = await read(space, block)
  if (!job?.state) return null
  return finish(space, block, job)
}

/** is there a job on this block on the server now (the block's chat checks before it takes one over) */
export async function hasJob(space: string, block: string): Promise<boolean> {
  return !!(await read(space, block))?.state
}

/** at the dashboard's load: a sign on every block with a job running or an answer waiting */
export async function watchJobs(scope: BlockScope, signal: AbortSignal): Promise<void> {
  const space = spaceOf(scope)
  const res = await fetch(`${BASE}/${space}/blockjobs`, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return
  const list = (await res.json()) as { block: string; state: string }[]
  for (const { block, state } of list) {
    const key = bgKey('chat', scope, block)
    if (state !== 'running') markReady(key)
    else
      void watchBg(key, async () => {
        const job = await read(space, block)
        return !job ? 'running' : !job.state ? 'gone' : job.state === 'running' ? 'running' : 'ready'
      })
  }
}

/** one prewarm per mode at most every 5 minutes (the server keeps a warm process 10 minutes) */
let lastWarm = { mode: '', at: 0 }

/**
 * The block editor opened (owner, 2026-11-09: "Nova is sluggish"): POST /api/blocks/prewarm {mode} lets the server start
 * a Claude process for this chat before the first message, so the answer starts at once. Best effort: a viewer who is not
 * signed in, an older server or any error is simply no warm process.
 */
export function prewarmBlockChat(mode: string, now = Date.now()): void {
  if (lastWarm.mode === mode && now - lastWarm.at < 5 * 60_000) return
  lastWarm = { mode, at: now }
  void fetch(`${BASE}/blocks/prewarm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify({ mode }),
  }).catch(() => undefined)
}
