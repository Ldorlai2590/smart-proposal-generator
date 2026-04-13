const { createServer } = require('http')
const { parse } = require('url')
const path = require('path')
const fs = require('fs')
const next = require('next')

const dir = path.join(__dirname)
const port = parseInt(process.env.PORT, 10) || 7860
const hostname = process.env.HOSTNAME || '0.0.0.0'

process.env.NODE_ENV = 'production'

const app = next({ dev: false, dir, hostname, port })
const handle = app.getRequestHandler()

const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    const { pathname } = parsedUrl

    // Serve _next/static files directly
    if (pathname.startsWith('/_next/static')) {
      const filePath = path.join(dir, '.next', 'static', pathname.replace('/_next/static', ''))
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath)
        const contentType = MIME_TYPES[ext] || 'application/octet-stream'
        res.setHeader('Content-Type', contentType)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }

    // Serve public files directly
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      const publicPath = path.join(dir, 'public', pathname)
      if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        const ext = path.extname(publicPath)
        const contentType = MIME_TYPES[ext] || 'application/octet-stream'
        res.setHeader('Content-Type', contentType)
        fs.createReadStream(publicPath).pipe(res)
        return
      }
    }

    // Let Next.js handle everything else
    handle(req, res, parsedUrl)
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
