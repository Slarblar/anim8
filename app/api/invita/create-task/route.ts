import { NextResponse } from 'next/server'
import {
  FIELD_LOCATION,
  LOCATION_OPTIONS,
  NEW_REQUEST_SECTION,
  PIPELINE_GID,
} from '@/lib/invita-asana-config'

const ASANA = 'https://app.asana.com/api/1.0'

type CfRow = {
  custom_field: {
    gid: string
    name: string
    enum_options?: Array<{ gid: string; name: string }>
  }
}

/** Cached Stage field + “Requested” option GIDs (resolved from Asana once per process). */
let cachedStage: { fieldGid: string; requestedOptionGid: string } | null = null

/**
 * Resolves the pipeline’s “Stage” status-flow enum and the “Requested” option.
 * Optional overrides: INVITA_FIELD_STAGE_GID + INVITA_STAGE_REQUESTED_OPTION_GID in .env.local
 */
async function resolveRequestedStage(
  token: string
): Promise<{ fieldGid: string; requestedOptionGid: string } | null> {
  const envF = process.env.INVITA_FIELD_STAGE_GID
  const envO = process.env.INVITA_STAGE_REQUESTED_OPTION_GID
  if (envF && envO) {
    return { fieldGid: envF, requestedOptionGid: envO }
  }

  if (cachedStage) return cachedStage

  const optFields =
    'custom_field.gid,custom_field.name,custom_field.enum_options.gid,custom_field.enum_options.name'
  const url = `${ASANA}/projects/${PIPELINE_GID}/custom_field_settings?opt_fields=${encodeURIComponent(optFields)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.errors?.length) return null

  const rows = (json.data || []) as CfRow[]
  for (const row of rows) {
    const cf = row.custom_field
    if (!cf?.name || cf.name.trim().toLowerCase() !== 'stage') continue
    const opts = cf.enum_options || []
    const norm = (s: string) => s.trim().toLowerCase()
    const match =
      opts.find((o) => norm(o.name) === 'requested') ||
      opts.find((o) => norm(o.name) === 'new request')
    if (match) {
      cachedStage = { fieldGid: cf.gid, requestedOptionGid: match.gid }
      return cachedStage
    }
  }
  return null
}

export async function POST(request: Request) {
  const token = process.env.INVITA_ASANA_PAT
  if (!token) {
    return NextResponse.json(
      { errors: [{ message: 'Invita Asana is not configured' }] },
      { status: 503 }
    )
  }

  let body: { name?: string; notes?: string; due_on?: string; location?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ errors: [{ message: 'Invalid JSON' }] }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ errors: [{ message: 'Title required' }] }, { status: 400 })
  }

  const customFields: Record<string, string> = {}

  const stage = await resolveRequestedStage(token)
  if (stage) {
    customFields[stage.fieldGid] = stage.requestedOptionGid
  }

  const locName = typeof body.location === 'string' ? body.location.trim() : ''
  if (locName && LOCATION_OPTIONS[locName]) {
    customFields[FIELD_LOCATION] = LOCATION_OPTIONS[locName]
  }

  const notes =
    typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined
  const due_on =
    typeof body.due_on === 'string' && body.due_on.trim() ? body.due_on.trim() : undefined

  const payload: Record<string, unknown> = {
    name,
    projects: [PIPELINE_GID],
    memberships: [{ project: PIPELINE_GID, section: NEW_REQUEST_SECTION }],
    notes,
    due_on,
    custom_fields: Object.keys(customFields).length ? customFields : undefined,
  }

  const res = await fetch(`${ASANA}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ data: payload }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
