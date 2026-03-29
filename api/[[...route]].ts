import { app } from './app.js'

// Vercel pre-parses req.body for application/json, so we can't use
// @hono/node-server/vercel (it re-reads the already-consumed stream and hangs).
// Instead, we manually build a Web API Request and call app.fetch().
export default async function handler(req: any, res: any) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  const url = `${proto}://${host}${req.url}`

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers as Record<string, string | string[]>)) {
    if (Array.isArray(val)) {
      val.forEach((v) => headers.append(key, v))
    } else if (val) {
      headers.set(key, val)
    }
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  const request = new Request(url, { method: req.method, headers, body })
  const response = await app.fetch(request)

  res.status(response.status)
  response.headers.forEach((val: string, key: string) => res.setHeader(key, val))
  res.send(await response.text())
}
