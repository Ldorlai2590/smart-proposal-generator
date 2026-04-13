// Thin wrapper around Next.js standalone server.js
// Serves _next/static and public files that standalone doesn't handle
const { createServer } = require('http')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const PORT = parseInt(process.env.PORT, 10) || 7860
const INTERNAL_PORT = PORT + 1
const dir = __dirname

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
  '.txt': 'text/plain',
  '.webp': 'image/webp',
}

function tryServeStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  // _next/static → .next/static
  if (pathname.startsWith('/_next/static/')) {
    const filePath = path.join(dir, '.next', 'static', pathname.slice('/_next/static/'.length))
    return serveFile(filePath, res)
  }

  // public files (favicon, images, etc.) — skip API and _next routes
  if (!pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
    const publicPath = path.join(dir, 'public', pathname)
    return serveFile(publicPath, res)
  }

  return false
}

function serveFile(filePath, res) {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const immutable = filePath.includes('.next/static')
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    })
    fs.createReadStream(filePath).pipe(res)
    return true
  } catch {
    return false
  }
}

// Proxy non-static requests to the standalone Next.js server
function proxyToNext(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: INTERNAL_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  }

  const proxyReq = require('http').request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', (err) => {
    console.error('[proxy] Error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end('Bad Gateway')
    }
  })

  req.pipe(proxyReq, { end: true })
}

// Start the standalone Next.js server on the internal port
const nextServer = spawn('node', ['server.js'], {
  cwd: dir,
  env: { ...process.env, PORT: String(INTERNAL_PORT), HOSTNAME: '127.0.0.1' },
  stdio: 'inherit',
})

nextServer.on('exit', (code) => {
  console.error(`Next.js server exited with code ${code}`)
  process.exit(code || 1)
})

// Wait a moment for the Next.js server to start, then start our proxy
setTimeout(() => {
  createServer((req, res) => {
    if (!tryServeStatic(req, res)) {
      proxyToNext(req, res)
    }
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`> Static proxy ready on http://0.0.0.0:${PORT}`)
    console.log(`> Next.js running on http://127.0.0.1:${INTERNAL_PORT}`)
  })
}, 3000)
