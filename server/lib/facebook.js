const GRAPH_VER = process.env.FB_GRAPH_VER || 'v19.0'
const graphUrl = (path) => `https://graph.facebook.com/${GRAPH_VER}${path}`

export async function fbFetchJson(url, options = {}) {
  const r = await fetch(url, options)
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j?.error) {
    const msg = j?.error?.message || `FB error (${r.status})`
    const code = j?.error?.code
    const subcode = j?.error?.error_subcode
    const e = new Error(msg)
    e.fb = { code, subcode, raw: j }
    throw e
  }
  return j
}

export async function fetchPages(userToken) {
  return fbFetchJson(graphUrl(`/me/accounts?limit=1000&fields=name,id,picture{url},access_token,followers_count&access_token=${encodeURIComponent(userToken)}`))
}

export async function fetchScheduled(pageId, pageToken) {
  return fbFetchJson(graphUrl(`/${pageId}/scheduled_posts?limit=100&fields=scheduled_publish_time&access_token=${encodeURIComponent(pageToken)}`))
}

export async function scheduleText({ pageId, pageToken, message, scheduledAt }) {
  const unix = Math.floor(new Date(scheduledAt).getTime() / 1000)
  return fbFetchJson(graphUrl(`/${pageId}/feed`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      published: false,
      scheduled_publish_time: unix,
      access_token: pageToken
    })
  })
}
