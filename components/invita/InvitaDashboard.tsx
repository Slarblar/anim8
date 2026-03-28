'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'
import styles from '@/components/invita/invita.module.css'
import {
  ARCHIVE_SECTIONS,
  ARCHIVES_GID,
  ASANA_ARCHIVES_URL,
  ASANA_PIPELINE_URL,
  FIELD_LOCATION,
  FIELD_QUALITY,
  PIPELINE_GID,
  PIPELINE_SECTIONS,
} from '@/lib/invita-asana-config'

type AsanaSection = { gid: string; name: string }
type Membership = { section?: AsanaSection }
type CustomField = {
  gid: string
  enum_value?: { name?: string; gid?: string } | null
  number_value?: number | null
}
type AsanaTask = {
  gid: string
  name: string
  due_on?: string | null
  completed?: boolean
  completed_at?: string | null
  memberships?: Membership[]
  custom_fields?: CustomField[]
}

type QOpt = { gid: string; name: string }

async function asanaGet(path: string) {
  const r = await fetch('/api/invita/asana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'GET', path }),
  })
  const d = await r.json()
  if (!r.ok || d.errors?.length) {
    throw new Error(d.errors?.[0]?.message || 'Asana error')
  }
  return d.data
}

async function asanaPut(path: string, body: Record<string, unknown>) {
  const r = await fetch('/api/invita/asana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'PUT', path, body }),
  })
  const d = await r.json()
  if (!r.ok || d.errors?.length) {
    throw new Error(d.errors?.[0]?.message || 'Asana error')
  }
  return d.data
}

function getSection(t: AsanaTask): AsanaSection | null {
  const m = t.memberships?.find((x) => x.section)
  return m?.section ? { gid: m.section.gid, name: m.section.name } : null
}

function getCF(t: AsanaTask, gid: string): CustomField | undefined {
  return t.custom_fields?.find((f) => f.gid === gid)
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function locPillStyle(n: string): CSSProperties {
  const map: Record<string, CSSProperties> = {
    'San Diego': {
      background: '#EAF4EF',
      color: '#2D7A63',
      border: '1px solid #C5E0D6',
    },
    'Las Vegas': {
      background: '#EEF2FB',
      color: '#3A4FA6',
      border: '1px solid #C8D2F2',
    },
    'Fort Lauderdale': {
      background: '#FBF2E4',
      color: '#C17F35',
      border: '1px solid #EDD5A8',
    },
    'Costa Mesa': {
      background: '#F3EEFB',
      color: '#6B3FA6',
      border: '1px solid #D9C8F2',
    },
    'Crown Point': {
      background: '#FEF0F0',
      color: '#A63A3A',
      border: '1px solid #F2C8C8',
    },
  }
  return map[n] || { background: '#E8E2D9', color: '#5C4F42' }
}

const TABS = ['pipeline', 'kpis', 'rate', 'request'] as const
type TabId = (typeof TABS)[number]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function InvitaDashboard() {
  const [tab, setTab] = useState<TabId>('pipeline')

  const [plLoading, setPlLoading] = useState(true)
  const [plError, setPlError] = useState<string | null>(null)
  const [plState, setPlState] = useState<{
    active: number
    overdue: number
    week: number
    live: number
    stages: { gid: string; name: string; count: number; overdueInStage: boolean }[]
    upcoming: AsanaTask[]
  } | null>(null)

  const [kpiMonth, setKpiMonth] = useState(MONTHS[new Date().getMonth()])
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiError, setKpiError] = useState<string | null>(null)
  const [kpiState, setKpiState] = useState<{
    pub: number
    otPct: number | null
    avgQ: string | null
    unrated: number
    locRows: { loc: string; count: number; avg: string }[]
    taskRows: AsanaTask[]
  } | null>(null)

  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [rateTasks, setRateTasks] = useState<AsanaTask[]>([])
  const [rateDone, setRateDone] = useState<Record<string, string>>({})
  const [rateDisabled, setRateDisabled] = useState<Record<string, boolean>>({})

  const [qOpts, setQOpts] = useState<QOpt[] | null>(null)

  const [fTitle, setFTitle] = useState('')
  const [fPlatform, setFPlatform] = useState('')
  const [fType, setFType] = useState('')
  const [fLoc, setFLoc] = useState('')
  const [fDate, setFDate] = useState('')
  const [fBrief, setFBrief] = useState('')
  const [fSubmitting, setFSubmitting] = useState(false)
  const [bOk, setBOk] = useState(false)
  const [bErr, setBErr] = useState<string | null>(null)

  const getQOptsCached = useCallback(async () => {
    if (qOpts) return qOpts
    try {
      const f = await asanaGet(`/custom_fields/${FIELD_QUALITY}`)
      const opts = (f.enum_options || []) as QOpt[]
      setQOpts(opts)
      return opts
    } catch {
      setQOpts([])
      return []
    }
  }, [qOpts])

  const loadPipeline = useCallback(async () => {
    setPlLoading(true)
    setPlError(null)
    try {
      const f =
        'name,due_on,completed,completed_at,memberships.section.gid,memberships.section.name,custom_fields.gid,custom_fields.enum_value.name'
      const tasks = (await asanaGet(
        `/projects/${PIPELINE_GID}/tasks?opt_fields=${f}&limit=100`
      )) as AsanaTask[]
      const now = new Date()
      const weekOut = new Date(now.getTime() + 7 * 86400000)
      const ms = new Date(now.getFullYear(), now.getMonth(), 1)
      const active = tasks.filter((t) => !t.completed)
      const overdue = active.filter((t) => t.due_on && new Date(t.due_on) < now)
      const dw = active.filter(
        (t) =>
          t.due_on &&
          new Date(t.due_on) >= now &&
          new Date(t.due_on) <= weekOut
      )
      const live = tasks.filter(
        (t) => t.completed && t.completed_at && new Date(t.completed_at) >= ms
      )
      const counts: Record<string, number> = {}
      const od: Record<string, number> = {}
      active.forEach((t) => {
        const s = getSection(t)
        if (s) {
          counts[s.gid] = (counts[s.gid] || 0) + 1
          if (t.due_on && new Date(t.due_on) < now) {
            od[s.gid] = (od[s.gid] || 0) + 1
          }
        }
      })
      const stages = Object.entries(PIPELINE_SECTIONS).map(([gid, name]) => ({
        gid,
        name,
        count: counts[gid] || 0,
        overdueInStage: !!od[gid],
      }))
      const upcoming = active
        .filter((t) => t.due_on)
        .sort((a, b) => new Date(a.due_on!).getTime() - new Date(b.due_on!).getTime())
        .slice(0, 10)
      setPlState({
        active: active.length,
        overdue: overdue.length,
        week: dw.length,
        live: live.length,
        stages,
        upcoming,
      })
    } catch (e) {
      setPlError(e instanceof Error ? e.message : 'Failed')
      setPlState(null)
    } finally {
      setPlLoading(false)
    }
  }, [])

  const loadKPIs = useCallback(async () => {
    setKpiLoading(true)
    setKpiError(null)
    try {
      const f =
        'name,completed,completed_at,due_on,memberships.section.gid,memberships.section.name,custom_fields.gid,custom_fields.enum_value.name,custom_fields.number_value'
      const tasks = (await asanaGet(
        `/projects/${ARCHIVES_GID}/tasks?opt_fields=${f}&limit=100`
      )) as AsanaTask[]
      const secGid = Object.entries(ARCHIVE_SECTIONS).find(([, v]) => v === kpiMonth)?.[0]
      const mt = secGid
        ? tasks.filter((t) => getSection(t)?.gid === secGid)
        : tasks
      const rated = mt.filter((t) => getCF(t, FIELD_QUALITY)?.enum_value)
      const unrated = mt.filter((t) => !getCF(t, FIELD_QUALITY)?.enum_value)
      const onTime = mt.filter(
        (t) =>
          !t.due_on ||
          !t.completed_at ||
          new Date(t.completed_at) <= new Date(t.due_on)
      )
      const otPct = mt.length > 0 ? Math.round((onTime.length / mt.length) * 100) : null
      let avgQ: string | null = null
      if (rated.length > 0) {
        const sum = rated.reduce(
          (s, t) => s + parseFloat(getCF(t, FIELD_QUALITY)?.enum_value?.name || '0'),
          0
        )
        avgQ = (sum / rated.length).toFixed(1)
      }
      const locMap: Record<string, { count: number; pts: number[] }> = {}
      mt.forEach((t) => {
        const loc = getCF(t, FIELD_LOCATION)?.enum_value?.name || 'Unknown'
        if (!locMap[loc]) locMap[loc] = { count: 0, pts: [] }
        locMap[loc].count++
        const q = getCF(t, FIELD_QUALITY)?.enum_value
        if (q) locMap[loc].pts.push(parseFloat(q.name || '0'))
      })
      const locRows = Object.entries(locMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([loc, d]) => ({
          loc,
          count: d.count,
          avg: d.pts.length
            ? (d.pts.reduce((s, v) => s + v, 0) / d.pts.length).toFixed(1)
            : '—',
        }))
      setKpiState({
        pub: mt.length,
        otPct,
        avgQ,
        unrated: unrated.length,
        locRows,
        taskRows: mt,
      })
    } catch (e) {
      setKpiError(e instanceof Error ? e.message : 'Failed')
      setKpiState(null)
    } finally {
      setKpiLoading(false)
    }
  }, [kpiMonth])

  const loadRate = useCallback(async () => {
    setRateLoading(true)
    setRateError(null)
    try {
      const f =
        'name,memberships.section.gid,memberships.section.name,custom_fields.gid,custom_fields.enum_value.name'
      const [tasks] = await Promise.all([
        asanaGet(`/projects/${ARCHIVES_GID}/tasks?opt_fields=${f}&limit=100`) as Promise<
          AsanaTask[]
        >,
        getQOptsCached(),
      ])
      const unrated = tasks.filter((t) => !getCF(t, FIELD_QUALITY)?.enum_value)
      setRateTasks(unrated)
    } catch (e) {
      setRateError(e instanceof Error ? e.message : 'Failed')
      setRateTasks([])
    } finally {
      setRateLoading(false)
    }
  }, [getQOptsCached])

  useEffect(() => {
    loadPipeline()
  }, [loadPipeline])

  function switchTab(next: TabId) {
    setTab(next)
    if (next === 'pipeline') loadPipeline()
    if (next === 'rate') loadRate()
  }

  function selMonth(m: string) {
    setKpiMonth(m)
  }

  useEffect(() => {
    if (tab === 'kpis') loadKPIs()
  }, [kpiMonth, tab, loadKPIs])

  async function rateTask(taskGid: string, optGid: string, label: string) {
    setRateDisabled((d) => ({ ...d, [taskGid]: true }))
    try {
      await asanaPut(`/tasks/${taskGid}`, {
        custom_fields: { [FIELD_QUALITY]: optGid },
      })
      setRateDone((d) => ({ ...d, [taskGid]: label }))
    } catch (e) {
      setRateDisabled((d) => ({ ...d, [taskGid]: false }))
      alert('Failed to save: ' + (e instanceof Error ? e.message : 'error'))
    }
  }

  async function submitRequest() {
    const title = fTitle.trim()
    if (!title) {
      alert('Please enter a content title.')
      return
    }
    setFSubmitting(true)
    setBOk(false)
    setBErr(null)
    const notes = [
      fPlatform && `Platform: ${fPlatform}`,
      fType && `Type: ${fType}`,
      fBrief && `\nBrief:\n${fBrief}`,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const r = await fetch('/api/invita/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title,
          notes: notes || undefined,
          due_on: fDate || undefined,
          location: fLoc || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok || d.errors?.length) {
        throw new Error(d.errors?.[0]?.message || 'Asana error')
      }
      setBOk(true)
      clearForm()
    } catch (e) {
      setBErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setFSubmitting(false)
    }
  }

  function clearForm() {
    setFTitle('')
    setFPlatform('')
    setFType('')
    setFLoc('')
    setFDate('')
    setFBrief('')
  }

  const now = new Date()
  const weekOut = new Date(now.getTime() + 7 * 86400000)

  const scoreOpts: QOpt[] =
    qOpts && qOpts.length
      ? qOpts
      : ['1', '2', '3', '4', '5'].map((n) => ({ gid: n, name: n }))

  const otPct = kpiState?.otPct
  const otClass =
    otPct === null || otPct === undefined
      ? ''
      : otPct >= 80
        ? styles.green
        : otPct >= 60
          ? styles.amber
          : styles.red

  return (
    <div className={styles.invitaRoot}>
      <header>
        <div className={styles.hdr}>
          <div>
            <div className={styles.wm}>Invita</div>
            <div className={styles.ws}>Content Portal</div>
          </div>
          <div className={styles.pills}>
            <span className={`${styles.pill} ${styles.pillSd}`}>San Diego</span>
            <span className={`${styles.pill} ${styles.pillLv}`}>Las Vegas</span>
            <span className={`${styles.pill} ${styles.pillFtl}`}>Fort Lauderdale</span>
            <span className={`${styles.pill} ${styles.pillCm}`}>Costa Mesa</span>
            <span className={`${styles.pill} ${styles.pillCp}`}>Crown Point</span>
          </div>
        </div>
      </header>

      <nav>
        <div className={styles.navI}>
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.ntab} ${tab === id ? styles.active : ''}`}
              onClick={() => switchTab(id)}
            >
              {id === 'pipeline'
                ? 'Pipeline'
                : id === 'kpis'
                  ? 'KPIs'
                  : id === 'rate'
                    ? 'Rate'
                    : 'New Request'}
            </button>
          ))}
        </div>
      </nav>

      <div className={styles.main}>
        {tab === 'pipeline' && (
          <div>
            <div className={styles.ph}>
              <h2 className={styles.st}>Active Pipeline</h2>
              <div className={styles.ar}>
                <button type="button" className={styles.gbtn} onClick={loadPipeline}>
                  Refresh
                </button>
                <a
                  href={ASANA_PIPELINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.alink}
                >
                  Open Asana ↗
                </a>
              </div>
            </div>
            {plLoading && <div className={styles.ls}>Loading pipeline...</div>}
            {plError && (
              <div className={styles.ls} style={{ color: 'var(--red)' }}>
                Failed: {plError}
              </div>
            )}
            {!plLoading && !plError && plState && (
              <div>
                <div className={styles.kr}>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Active</div>
                    <div className={styles.kv}>{plState.active}</div>
                    <div className={styles.ks}>in pipeline</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Overdue</div>
                    <div
                      className={`${styles.kv} ${plState.overdue > 0 ? styles.red : styles.green}`}
                    >
                      {plState.overdue}
                    </div>
                    <div className={styles.ks}>past due date</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Due this week</div>
                    <div className={styles.kv}>{plState.week}</div>
                    <div className={styles.ks}>next 7 days</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Live this month</div>
                    <div className={`${styles.kv} ${styles.green}`}>{plState.live}</div>
                    <div className={styles.ks}>published</div>
                  </div>
                </div>
                <div className={styles.gl}>By stage</div>
                <div className={styles.sg}>
                  {plState.stages.map(({ gid, name, count, overdueInStage }) => {
                    const cls = overdueInStage ? styles.ho : count > 0 ? styles.hw : ''
                    return (
                      <div key={gid} className={`${styles.sc} ${cls}`}>
                        <div className={styles.sn}>{name}</div>
                        <div className={styles.sv}>{count}</div>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.gl}>Upcoming deadlines</div>
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Stage</th>
                      <th>Location</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plState.upcoming.length === 0 ? (
                      <tr className={styles.er}>
                        <td colSpan={4}>Pipeline is clear — no upcoming deadlines.</td>
                      </tr>
                    ) : (
                      plState.upcoming.map((t) => {
                        const due = new Date(t.due_on!)
                        const isLate = due < now
                        const isSoon = !isLate && due <= weekOut
                        const dc = isLate ? styles.dl : isSoon ? styles.ds : styles.dn
                        const sec = getSection(t)
                        const loc =
                          getCF(t, FIELD_LOCATION)?.enum_value?.name || '—'
                        return (
                          <tr key={t.gid}>
                            <td className={styles.tn}>{t.name}</td>
                            <td>
                              {sec ? (
                                <span className={styles.sb}>{sec.name}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              <span className={styles.lb} style={locPillStyle(loc)}>
                                {loc}
                              </span>
                            </td>
                            <td className={dc}>
                              {isLate ? '⚠ ' : ''}
                              {fmtDate(t.due_on)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'kpis' && (
          <div>
            <div className={styles.ph}>
              <h2 className={styles.st}>Performance</h2>
              <div className={styles.ar}>
                <button type="button" className={styles.gbtn} onClick={loadKPIs}>
                  Refresh
                </button>
                <a
                  href={ASANA_ARCHIVES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.alink}
                >
                  Open Archives ↗
                </a>
              </div>
            </div>
            <div className={styles.mf}>
              {MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.mb} ${m === kpiMonth ? styles.active : ''}`}
                  onClick={() => selMonth(m)}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            {kpiLoading && <div className={styles.ls}>Loading performance data...</div>}
            {kpiError && (
              <div className={styles.ls} style={{ color: 'var(--red)' }}>
                Failed: {kpiError}
              </div>
            )}
            {!kpiLoading && !kpiError && kpiState && (
              <div>
                <div className={styles.kr}>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Published</div>
                    <div className={`${styles.kv} ${styles.green}`}>{kpiState.pub}</div>
                    <div className={styles.ks}>pieces this month</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>On-time rate</div>
                    <div className={`${styles.kv} ${otClass}`}>
                      {kpiState.otPct !== null ? `${kpiState.otPct}%` : '—'}
                    </div>
                    <div className={styles.ks}>delivered by deadline</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Avg quality</div>
                    <div className={styles.kv}>{kpiState.avgQ || '—'}</div>
                    <div className={styles.ks}>out of 5</div>
                  </div>
                  <div className={styles.kc}>
                    <div className={styles.kl}>Unrated</div>
                    <div className={`${styles.kv} ${styles.amber}`}>{kpiState.unrated}</div>
                    <div className={styles.ks}>need scoring</div>
                  </div>
                </div>
                <div className={styles.gl}>By location</div>
                <table className={styles.kpiTableSpaced}>
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Pieces</th>
                      <th>Avg Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiState.locRows.length === 0 ? (
                      <tr className={styles.er}>
                        <td colSpan={3}>No archived pieces for this month.</td>
                      </tr>
                    ) : (
                      kpiState.locRows.map((row) => (
                        <tr key={row.loc}>
                          <td>
                            <span className={styles.lb} style={locPillStyle(row.loc)}>
                              {row.loc}
                            </span>
                          </td>
                          <td>{row.count}</td>
                          <td>{row.avg}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className={styles.gl}>All archived pieces</div>
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Location</th>
                      <th>Completed</th>
                      <th>On Time</th>
                      <th>Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiState.taskRows.length === 0 ? (
                      <tr className={styles.er}>
                        <td colSpan={5}>No archived pieces for this month.</td>
                      </tr>
                    ) : (
                      kpiState.taskRows.map((t) => {
                        const loc =
                          getCF(t, FIELD_LOCATION)?.enum_value?.name || '—'
                        const qv = getCF(t, FIELD_QUALITY)?.enum_value?.name
                        const isOT =
                          !t.due_on ||
                          !t.completed_at ||
                          new Date(t.completed_at) <= new Date(t.due_on)
                        return (
                          <tr key={t.gid}>
                            <td className={styles.tn}>{t.name}</td>
                            <td>
                              <span className={styles.lb} style={locPillStyle(loc)}>
                                {loc}
                              </span>
                            </td>
                            <td className={styles.dn}>{fmtDate(t.completed_at)}</td>
                            <td style={{ color: isOT ? 'var(--teal)' : 'var(--red)' }}>
                              {isOT ? 'Yes' : 'No'}
                            </td>
                            <td
                              style={{
                                fontWeight: 500,
                                color: qv ? 'var(--deep)' : 'var(--bark)',
                              }}
                            >
                              {qv ? `${qv} / 5` : 'Unrated'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'rate' && (
          <div>
            <div className={styles.ph}>
              <h2 className={styles.st}>Rate Content</h2>
              <button type="button" className={styles.gbtn} onClick={loadRate}>
                Refresh
              </button>
            </div>
            <p className={styles.rateIntro}>
              Archived pieces waiting for a quality score. Rate 1–5. Scores stay in Archives — the
              team won&apos;t see them.
            </p>
            {rateLoading && <div className={styles.ls}>Loading unrated pieces...</div>}
            {rateError && (
              <div className={styles.ls} style={{ color: 'var(--red)' }}>
                Failed: {rateError}
              </div>
            )}
            {!rateLoading && !rateError && rateTasks.length === 0 && (
              <div className={styles.ls}>All pieces are rated — nothing to review.</div>
            )}
            {!rateLoading && !rateError && rateTasks.length > 0 && (
              <div>
                {rateTasks.map((t) => {
                  const sec = getSection(t)
                  const loc = getCF(t, FIELD_LOCATION)?.enum_value?.name
                  const meta = [sec?.name, loc].filter(Boolean).join(' · ')
                  const doneLabel = rateDone[t.gid]
                  return (
                    <div
                      key={t.gid}
                      className={styles.rc}
                      style={{ opacity: doneLabel ? 0.45 : 1 }}
                    >
                      <div className={styles.rci}>
                        <div className={styles.rcn}>{t.name}</div>
                        <div className={styles.rcm}>{meta || 'No location set'}</div>
                      </div>
                      <div className={styles.rs}>
                        {doneLabel ? (
                          <span className={styles.rdone}>Rated {doneLabel} / 5</span>
                        ) : (
                          scoreOpts.map((o) => (
                            <button
                              key={o.gid}
                              type="button"
                              className={styles.rb}
                              disabled={!!rateDisabled[t.gid]}
                              onClick={() => rateTask(t.gid, o.gid, o.name)}
                            >
                              {o.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'request' && (
          <div>
            <div className={styles.ph}>
              <h2 className={styles.st}>New Content Request</h2>
            </div>
            <div className={styles.fw}>
              <p className={styles.fi}>
                Submit a content request and it&apos;ll go straight into the pipeline. Tyson picks
                it up from there.
              </p>
              <div className={`${styles.bn} ${styles.bnOk} ${bOk ? styles.bnVisible : ''}`}>
                Request submitted — task created in Asana.
              </div>
              <div className={`${styles.bn} ${styles.bnErr} ${bErr ? styles.bnVisible : ''}`}>
                {bErr ? `Error: ${bErr}` : null}
              </div>
              <div className={styles.fg}>
                <label className={styles.fl} htmlFor="invita-f-title">
                  Content title *
                </label>
                <input
                  id="invita-f-title"
                  type="text"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="e.g. Scalp treatment ASMR — Fort Lauderdale launch"
                />
              </div>
              <div className={styles.frow}>
                <div className={styles.fg}>
                  <label className={styles.fl} htmlFor="invita-f-platform">
                    Platform
                  </label>
                  <select
                    id="invita-f-platform"
                    value={fPlatform}
                    onChange={(e) => setFPlatform(e.target.value)}
                  >
                    <option value="">Select platform</option>
                    <option>Instagram Reels</option>
                    <option>Instagram Stories</option>
                    <option>Instagram Static</option>
                    <option>TikTok</option>
                    <option>Multi-platform</option>
                  </select>
                </div>
                <div className={styles.fg}>
                  <label className={styles.fl} htmlFor="invita-f-type">
                    Content type
                  </label>
                  <select
                    id="invita-f-type"
                    value={fType}
                    onChange={(e) => setFType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option>ASMR / Sensory</option>
                    <option>Service Highlight</option>
                    <option>Behind the Scenes</option>
                    <option>Promotional</option>
                    <option>UGC / Testimonial</option>
                    <option>Event / Launch</option>
                  </select>
                </div>
              </div>
              <div className={styles.frow}>
                <div className={styles.fg}>
                  <label className={styles.fl} htmlFor="invita-f-loc">
                    Location
                  </label>
                  <select id="invita-f-loc" value={fLoc} onChange={(e) => setFLoc(e.target.value)}>
                    <option value="">Select location</option>
                    <option>San Diego</option>
                    <option>Las Vegas</option>
                    <option>Fort Lauderdale</option>
                    <option>Costa Mesa</option>
                    <option>Crown Point</option>
                  </select>
                </div>
                <div className={styles.fg}>
                  <label className={styles.fl} htmlFor="invita-f-date">
                    Publish deadline
                  </label>
                  <input
                    id="invita-f-date"
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.fg}>
                <label className={styles.fl} htmlFor="invita-f-brief">
                  Brief & notes
                </label>
                <textarea
                  id="invita-f-brief"
                  value={fBrief}
                  onChange={(e) => setFBrief(e.target.value)}
                  placeholder="Describe the content — key moments, mood, service being featured, any direction..."
                />
              </div>
              <div className={styles.fdiv} />
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.bsp}
                  id="invita-f-submit"
                  disabled={fSubmitting}
                  onClick={submitRequest}
                >
                  {fSubmitting ? (
                    <>
                      <span className={styles.sp} />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
                <button type="button" className={styles.bsc} onClick={clearForm}>
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className={styles.invitaFooter}>
        <span className={styles.ft}>invita head spa — internal use only</span>
        <a
          href={ASANA_PIPELINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.alink}
        >
          open asana ↗
        </a>
      </footer>
    </div>
  )
}
