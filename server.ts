import { app } from './api/app'

const port = 3001

Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`API running at http://localhost:${port}`)
