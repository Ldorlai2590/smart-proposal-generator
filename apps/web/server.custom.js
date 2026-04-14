// Patch standalone server.js to also serve static files
// This script is loaded INSTEAD of server.js — it monkey-patches http.createServer
// to intercept _next/static requests before Next.js handles them.

const path = require('path')
const fs = require('fs')
const http = require('http')

const appDir = __dirname

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
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.map': 'application/json',
  '.txt': 'text/plain',
}

function serveStaticFile(filePath, res) {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return false
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    fs.createReadStream(filePath).pipe(res)
    return true
  } catch {
    return false
  }
}

// Monkey-patch http.createServer to intercept static file requests
const originalCreateServer = http.createServer
http.createServer = function patchedCreateServer(...args) {
  const server = originalCreateServer.apply(this, args)
  const originalListeners = server.listeners('request')

  // Remove existing request listeners
  server.removeAllListeners('request')

  // Add our interceptor
  server.on('request', (req, res) => {
    const url = req.url?.split('?')[0] || ''

    // Serve _next/static files
    if (url.startsWith('/_next/static/')) {
      const relativePath = url.slice('/_next/static/'.length)
      const filePath = path.join(appDir, '.next', 'static', relativePath)
      if (serveStaticFile(filePath, res)) return
    }

    // Serve public files
    if (!url.startsWith('/_next') && !url.startsWith('/api')) {
      const filePath = path.join(appDir, 'public', url)
      if (serveStaticFile(filePath, res)) return
    }

    // Delegate to Next.js
    for (const listener of originalListeners) {
      listener.call(server, req, res)
    }
  })

  // Restore createServer for any subsequent calls
  http.createServer = originalCreateServer

  return server
}

// Now load the original standalone server.js — it will use our patched createServer
require('./server.js')
