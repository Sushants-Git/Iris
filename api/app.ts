import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, sql } from 'drizzle-orm'
import { load } from 'cheerio'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { createHmac, randomBytes } from 'crypto'
import * as schema from '../src/lib/schema.js'

function signNonce(nonce: string): string {
  const secret = process.env.APP_SECRET ?? 'fallback-secret'
  return createHmac('sha256', secret).update(nonce).digest('hex')
}

function makeToken(): string {
  const nonce = randomBytes(32).toString('hex')
  return `${nonce}.${signNonce(nonce)}`
}

function validateToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [nonce, sig] = parts
  return sig === signNonce(nonce)
}

function getDb() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  return drizzle(sql, { schema })
}

export const app = new Hono().basePath('/api')

// ─── CORS middleware ───────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
})

app.options('*', () => new Response(null, { status: 204 }))

// ─── AUTH ─────────────────────────────────────────────────────────────────────

app.post(
  '/auth',
  zValidator('json', z.object({ password: z.string() })),
  async (c) => {
    const { password } = c.req.valid('json')
    const expected = process.env.APP_PASSWORD
    if (!expected) return c.json({ ok: false, error: 'Not configured' }, 500)
    if (password !== expected) return c.json({ ok: false, error: 'Wrong password' }, 401)
    return c.json({ ok: true, token: makeToken() })
  },
)

// ─── AUTH MIDDLEWARE (all routes below this) ──────────────────────────────────

app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || !validateToken(token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// ─── BOARDS ───────────────────────────────────────────────────────────────────

app.get('/boards', async (c) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.boards)
    .orderBy(desc(schema.boards.createdAt))
  return c.json(rows)
})

app.post(
  '/boards',
  zValidator('json', z.object({ name: z.string().min(1).max(100) })),
  async (c) => {
    const db = getDb()
    const { name } = c.req.valid('json')
    const [board] = await db.insert(schema.boards).values({ name }).returning()
    return c.json(board, 201)
  },
)

app.patch(
  '/boards/:id',
  zValidator('json', z.object({ name: z.string().min(1).max(100) })),
  async (c) => {
    const db = getDb()
    const { name } = c.req.valid('json')
    const [board] = await db
      .update(schema.boards)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.boards.id, c.req.param('id')))
      .returning()
    if (!board) return c.json({ error: 'Not found' }, 404)
    return c.json(board)
  },
)

app.delete('/boards/:id', async (c) => {
  const db = getDb()
  await db.delete(schema.boards).where(eq(schema.boards.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── ITEMS ────────────────────────────────────────────────────────────────────

app.get('/boards/:boardId/items', async (c) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.boardId, c.req.param('boardId')))
    .orderBy(desc(schema.items.createdAt))
  return c.json(rows)
})

const createItemSchema = z.object({
  type: z.enum(['link', 'note', 'subcategory']),
  url: z.string().url().optional(),
  scrapedTitle: z.string().optional(),
  scrapedDescription: z.string().optional(),
  scrapedThumbnail: z.string().optional(),
  customTitle: z.string().optional(),
  noteContent: z.string().optional(),
  subcategory: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

app.post(
  '/boards/:boardId/items',
  zValidator('json', createItemSchema),
  async (c) => {
    const db = getDb()
    const body = c.req.valid('json')
    const [item] = await db
      .insert(schema.items)
      .values({
        boardId: c.req.param('boardId'),
        type: body.type,
        url: body.url ?? null,
        scrapedTitle: body.scrapedTitle ?? null,
        scrapedDescription: body.scrapedDescription ?? null,
        scrapedThumbnail: body.scrapedThumbnail ?? null,
        customTitle: body.customTitle ?? null,
        noteContent: body.noteContent ?? null,
        subcategory: body.subcategory ?? null,
        x: body.x ?? 100,
        y: body.y ?? 100,
        width: body.width ?? 320,
        height: body.height ?? 200,
      })
      .returning()
    return c.json(item, 201)
  },
)

const updateItemSchema = z.object({
  customTitle: z.string().nullable().optional(),
  customDescription: z.string().nullable().optional(),
  customThumbnail: z.string().nullable().optional(),
  noteContent: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
})

app.patch(
  '/items/:id',
  zValidator('json', updateItemSchema),
  async (c) => {
    const db = getDb()
    const body = c.req.valid('json')
    const [item] = await db
      .update(schema.items)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.items.id, c.req.param('id')))
      .returning()
    if (!item) return c.json({ error: 'Not found' }, 404)
    return c.json(item)
  },
)

app.delete('/items/:id', async (c) => {
  const db = getDb()
  await db.delete(schema.items).where(eq(schema.items.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── WORK LOG ─────────────────────────────────────────────────────────────────

const workEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tag: z.enum(['work', 'personal']),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  totalPausedMs: z.number().int().min(0),
  notes: z.string().optional(),
})

app.get('/work-log', async (c) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.workEntries)
    .orderBy(desc(schema.workEntries.startedAt))
  return c.json(rows)
})

app.post(
  '/work-log',
  zValidator('json', workEntrySchema),
  async (c) => {
    const db = getDb()
    const body = c.req.valid('json')
    await db
      .insert(schema.workEntries)
      .values({
        id: body.id,
        title: body.title,
        tag: body.tag,
        startedAt: new Date(body.startedAt),
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
        totalPausedMs: body.totalPausedMs,
        notes: body.notes ?? null,
      })
      .onConflictDoUpdate({
        target: schema.workEntries.id,
        set: {
          endedAt: sql`excluded.ended_at`,
          totalPausedMs: sql`excluded.total_paused_ms`,
          notes: sql`COALESCE(excluded.notes, work_entries.notes)`,
        },
      })
    return c.json({ ok: true }, 201)
  },
)

app.patch(
  '/work-log/:id/notes',
  zValidator('json', z.object({ notes: z.string() })),
  async (c) => {
    const db = getDb()
    await db
      .update(schema.workEntries)
      .set({ notes: c.req.valid('json').notes })
      .where(eq(schema.workEntries.id, c.req.param('id')))
    return c.json({ ok: true })
  },
)

app.delete('/work-log/:id', async (c) => {
  const db = getDb()
  await db.delete(schema.workEntries).where(eq(schema.workEntries.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── TASKS ────────────────────────────────────────────────────────────────────

app.get('/tasks', async (c) => {
  const db = getDb()
  const rows = await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt))
  return c.json(rows)
})

app.post(
  '/tasks',
  zValidator('json', z.object({ id: z.string().min(1), title: z.string().min(1), url: z.string().optional() })),
  async (c) => {
    const db = getDb()
    const body = c.req.valid('json')
    await db.insert(schema.tasks).values({
      id: body.id,
      title: body.title,
      url: body.url ?? null,
    }).onConflictDoNothing()
    return c.json({ ok: true }, 201)
  },
)

app.delete('/tasks/:id', async (c) => {
  const db = getDb()
  await db.delete(schema.tasks).where(eq(schema.tasks.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── PREVIEW ──────────────────────────────────────────────────────────────────

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/,
  /youtu\.be\/([a-zA-Z0-9_-]+)/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
]

const TWITTER_DOMAINS = ['twitter.com', 'x.com', 't.co']

function isTwitterUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return TWITTER_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

function getYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

app.post(
  '/preview',
  zValidator('json', z.object({ url: z.string().url() })),
  async (c) => {
    const { url } = c.req.valid('json')

    // Twitter/X: client renders via react-tweet, just return the URL as title
    if (isTwitterUrl(url)) {
      return c.json({ ok: true, title: url, description: null, thumbnail: null })
    }

    const ytId = getYouTubeId(url)
    if (ytId) {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        )
        if (res.ok) {
          const data = (await res.json()) as {
            title?: string
            author_name?: string
          }
          return c.json({
            ok: true,
            title: data.title ?? null,
            description: data.author_name ? `by ${data.author_name}` : null,
            thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          })
        }
      } catch {
        // fall through to OG scrape
      }
    }

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Irisbot/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) return c.json({ ok: false, fallback: true })

      const html = await res.text()
      const $ = load(html)

      const getMeta = (selectors: string[]): string | null => {
        for (const sel of selectors) {
          const val = $(sel).attr('content') ?? $(sel).attr('href') ?? null
          if (val?.trim()) return val.trim()
        }
        return null
      }

      const title =
        getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ??
        $('title').text().trim() ??
        null

      const description =
        getMeta([
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]',
        ]) ?? null

      let thumbnail =
        getMeta([
          'meta[property="og:image"]',
          'meta[name="twitter:image"]',
          'meta[name="twitter:image:src"]',
        ]) ?? null

      if (thumbnail && !thumbnail.startsWith('http')) {
        try {
          thumbnail = new URL(thumbnail, url).toString()
        } catch {
          thumbnail = null
        }
      }

      return c.json({ ok: true, title, description, thumbnail })
    } catch {
      return c.json({ ok: false, fallback: true })
    }
  },
)
