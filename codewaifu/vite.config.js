import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const TOKEN_URL = 'https://github.com/login/oauth/access_token'

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function githubOAuthDevServer(env) {
  return {
    name: 'github-oauth-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/github/oauth', async (req, res) => {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method not allowed' })
          return
        }

        const body = await readJsonBody(req)
        const clientId = env.GITHUB_CLIENT_ID || body.client_id
        const clientSecret = env.GITHUB_CLIENT_SECRET
        const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = body

        if (!clientId || !clientSecret) {
          sendJson(res, 500, { error: 'GitHub OAuth server env не налаштований у .env.' })
          return
        }
        if (!code || !codeVerifier || !redirectUri) {
          sendJson(res, 400, { error: 'Некоректний OAuth callback.' })
          return
        }

        const response = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
        })

        let data
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (!response.ok) {
          sendJson(res, 502, { error: `GitHub OAuth token: ${response.status}` })
          return
        }
        if (data?.error) {
          sendJson(res, 400, { error: data.error_description || data.error })
          return
        }
        if (!data?.access_token) {
          sendJson(res, 502, { error: 'GitHub не повернув access token.' })
          return
        }

        sendJson(res, 200, {
          access_token: data.access_token,
          token_type: data.token_type,
          scope: data.scope,
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), githubOAuthDevServer(env)],
  }
})
