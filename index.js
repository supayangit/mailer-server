import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { auth, authHandler } from './lib/auth.js'
import { db, client } from './lib/db.js'
import { sendWelcomeEmail } from './emailService.js'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const app = express()
const PORT = process.env.PORT || 5000

// ==================== EMAIL TRANSPORTER ====================
// already exists in the emailservice

// ==================== EMAIL ROUTES ====================

// Send Welcome Email Route (accepts GET with query params: ?name=...&email=...)
app.get('/api/send-welcome-mail', async (req, res) => {
  try {
    const { email, name } = req.query || {}

    console.log('Received send-welcome-mail request:', { name, email })

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    await sendWelcomeEmail(email, name || 'User')
    return res.json({ message: 'Welcome email sent successfully' })
  } catch (err) {
    console.error('Send welcome email error:', err)
    return res.status(500).json({ error: 'Failed to send welcome email' })
  }
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Mount BetterAuth under /api/auth
app.use('/api/auth', (req, res, next) => {
  authHandler(req, res).catch(next)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Root route for browser sanity checks
app.get('/', (req, res) => {
  res.json({
    status: 'Mailer server is running',
    message: 'Use /health or the API endpoints under /api/auth and /api/user',
    routes: [
      '/health (GET)',
      '/api/auth/* (BetterAuth routes - sign-in/email, sign-up/email, signout, etc)',
      '/api/user/profile (GET)',
      '/api/send-welcome-mail (GET)',
    ],
  })
})



// ==================== USER ROUTES ====================

// Get profile by bearer token
app.get('/api/user/profile', async (req, res) => {
  try {
    const user = await tryGetSession(req, res)
    if (!user) {
      return res.status(401).json({ error: 'Failed to fetch profile' })
    }
    return res.json(user)
  } catch (err) {
    console.error('Fetch profile error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper: construct proper Request and get session
async function tryGetSession(req, res) {
  try {
    console.log('tryGetSession: req has headers?', !!req.headers, 'method:', req.method, 'url:', req.url)
    console.log('tryGetSession: cookies present?', !!req.cookies, Object.keys(req.cookies || {}).length)
    console.log('tryGetSession: cookie name hints:', Object.keys(req.cookies || {}).slice(0, 3).join(', '))
    
      // Log request header details to diagnose failures
      console.log('tryGetSession: method:', req.method, 'url:', req.url)
      console.log('tryGetSession: headers keys:', Object.keys(req.headers || {}).slice(0, 20))
      console.log('tryGetSession: host header:', req.headers?.host)
      console.log('tryGetSession: cookie header present:', !!req.headers?.cookie)

      // 1) Try direct express req/res (works in many integrations)
      try {
        const session = await auth.api.getSession(req, res)
        console.log('getSession(req,res) succeeded')
        return session
      } catch (err) {
        console.warn('getSession(req,res) failed:', err?.message || String(err))
      }

      // 2) Try passing a Headers instance
      try {
        const hdrs = new Headers(req.headers || {})
        console.log('Retrying with Headers instance; host:', hdrs.get('host'))
        const session = await auth.api.getSession({ headers: hdrs })
        console.log('getSession({headers}) succeeded')
        return session
      } catch (err) {
        console.warn('getSession({headers}) failed:', err?.message || String(err))
      }

      // 3) Try using a web Request object with explicit URL and Headers
      try {
        const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:5000'
        const url = baseURL + (req.url || '/')
        const hdrs = new Headers(req.headers || {})
        const request = new Request(url, { method: req.method || 'GET', headers: hdrs })
        console.log('Retrying with Request object; url:', url)
        const session = await auth.api.getSession(request)
        console.log('getSession(Request) succeeded')
        return session
      } catch (err) {
        console.warn('getSession(Request) failed:', err?.message || String(err))
      }

      // 4) As a last resort, attempt to extract a session cookie (read-only check)
      try {
        const cookieHeader = req.headers?.cookie || ''
        console.log('Cookie header:', cookieHeader ? cookieHeader.slice(0, 200) : '(none)')
        // Look for known cookie names
        const m = cookieHeader.match(/(?:^|; )(?:(better-auth\.session_token|auth\.session_token|session_token)=)([^;]+)/)
        if (m) {
          console.log('Found session cookie name:', m[1])
          // We can't decrypt/jwt-verify without BetterAuth internals here; return placeholder
          return { info: 'session_cookie_present' }
        }
      } catch (err) {
        console.error('Session cookie fallback error:', err)
      }

      return null
  } catch (err) {
    console.error('getSession(req,res) failed:', err?.message || String(err))
    console.error('Error code/status:', err?.status || err?.statusCode || 'no status')
    console.error('Error body:', err?.body || 'no body')
    
    // Attempt: construct a proper web Request if Express req doesn't work
    try {
      const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:5000'
      const url = baseURL + (req.url || '/api/auth/get-session')
      
      // Build a web Request object that BetterAuth might accept
      const request = new Request(url, {
        method: req.method || 'GET',
        headers: req.headers,
      })
      
      console.log('Retrying with web Request object...')
      const session = await auth.api.getSession(request)
      console.log('getSession with Request succeeded:', !!session)
      return session
    } catch (err2) {
      console.error('getSession with web Request also failed:', err2?.message || String(err2))
    }
    
    return null
  }
}



// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Check the URL path and use the correct HTTP method (GET vs POST)',
  })
})

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📧 Frontend URL: ${process.env.FRONTEND_URL}`)

  ;(async () => {
    try {
      // Ping MongoDB to confirm connectivity
      try {
        const pingResult = await client.db().command({ ping: 1 })
        if (pingResult?.ok) {
          console.log('MongoDB ping successful')
        } else {
          console.warn('MongoDB ping returned unexpected result:', pingResult)
        }
      } catch (pingErr) {
        console.error('MongoDB ping failed on startup:', pingErr.message || pingErr)
      }

      const collections = await db.listCollections().toArray()
      const userCollections = collections.filter(c => /user/i.test(c.name))

      if (userCollections.length === 0) {
        console.log('No user-like collections found. All collections:', collections.map(c => c.name))
      } else {
        for (const coll of userCollections) {
          try {
            const count = await db.collection(coll.name).countDocuments()
            const sample = await db.collection(coll.name).find({}).limit(5).toArray()
            console.log(`MongoDB collection '${coll.name}' — documents: ${count}`)
            console.log('Sample documents:', sample)
          } catch (e) {
            console.warn(`Failed to read from collection ${coll.name}:`, e.message)
          }
        }
      }
    } catch (err) {
      console.error('Error inspecting MongoDB on startup:', err)
    }
  })()
})
