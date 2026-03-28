import { NextResponse } from 'next/server'

const ASANA_BASE = 'https://app.asana.com/api/1.0'

export async function POST(request: Request) {
  const token = process.env.INVITA_ASANA_PAT
  if (!token) {
    return NextResponse.json({ errors: [{ message: 'Invita Asana is not configured' }] }, { status: 503 })
  }

  let payload: { method?: string; path?: string; body?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ errors: [{ message: 'Invalid JSON' }] }, { status: 400 })
  }

  const method = String(payload.method || 'GET').toUpperCase()
  if (!['GET', 'POST', 'PUT'].includes(method)) {
    return NextResponse.json({ errors: [{ message: 'Invalid method' }] }, { status: 400 })
  }

  const path = payload.path
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..')) {
    return NextResponse.json({ errors: [{ message: 'Invalid path' }] }, { status: 400 })
  }

  const url = `${ASANA_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  const init: RequestInit = { method, headers }

  if (method !== 'GET' && payload.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify({ data: payload.body })
  }

  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))

  return NextResponse.json(data, { status: res.status })
}
