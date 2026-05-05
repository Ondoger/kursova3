const TOKEN_URL = 'https://github.com/login/oauth/access_token';

function parseBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        }
        catch {
            return {};
        }
    }
    return req.body;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseBody(req);
    const clientId = process.env.GITHUB_CLIENT_ID || body.client_id;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = body;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'GitHub OAuth server env не налаштований.' });
    }
    if (!code || !codeVerifier || !redirectUri) {
        return res.status(400).json({ error: 'Некоректний OAuth callback.' });
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
    });

    let data;
    try {
        data = await response.json();
    }
    catch {
        data = null;
    }

    if (!response.ok) {
        return res.status(502).json({ error: `GitHub OAuth token: ${response.status}` });
    }
    if (data?.error) {
        return res.status(400).json({ error: data.error_description || data.error });
    }
    if (!data?.access_token) {
        return res.status(502).json({ error: 'GitHub не повернув access token.' });
    }

    return res.status(200).json({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
    });
}
