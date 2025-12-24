import { useState, useEffect } from 'react'
import './index.css'

const API = import.meta.env.DEV ? 'http://localhost:6348' : ''

function Chart({ data, times }: { data: number[], times: string[] }) {
  if (data.length < 2) return null

  const w = 320, h = 100, px = 30, py = 20
  const cw = w - px, ch = h - py - 10
  const max = Math.max(...data) || 1

  const pts = data.map((v, i) => ({
    x: px + (i / (data.length - 1)) * cw,
    y: py + ch - (v / max) * ch
  }))

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${pts[pts.length - 1].x} ${h - 10} L ${px} ${h - 10} Z`

  const labels = times.length >= 3
    ? [times[0], times[Math.floor(times.length / 2)], times[times.length - 1]]
    : times

  const fmt = (t: string) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="response-chart">
      <div className="chart-header">
        <span className="chart-title">Response time</span>
        <span className="chart-subtitle">Last 24 hours</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0, Math.round(max / 2), Math.round(max)].map((l, i) => (
          <text key={i} x="2" y={py + ch - (i / 2) * ch + 3} className="chart-label">{l}ms</text>
        ))}
        <path d={area} fill="url(#chartGrad)" />
        <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="chart-x-labels">
        {labels.map((t, i) => <span key={i}>{fmt(t)}</span>)}
      </div>
    </div>
  )
}

function Card({ svc }: { svc: any }) {
  const [hist, setHist] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API}/api/history/${svc.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setHist(d.checks.slice(-50)))
      .catch(() => { })
  }, [svc.id])

  return (
    <div className={`card ${svc.online ? 'online' : 'offline'}`}>
      <div className="card-header">
        <h3 className="card-title">{svc.name}</h3>
        <div className={`card-indicator ${svc.online ? 'online' : 'offline'}`} />
      </div>
      {svc.description && <p className="card-description">{svc.description}</p>}
      <Chart data={hist.map(h => h.latency)} times={hist.map(h => h.createdAt)} />
      <div className="card-stats">
        <div className="stat">
          <span className="stat-label">Status</span>
          <span className={`stat-value ${svc.online ? 'good' : 'bad'}`}>
            {svc.online ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Uptime</span>
          <span className={`stat-value ${svc.uptime >= 99 ? 'good' : ''}`}>
            {svc.uptime.toFixed(1)}%
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Latency</span>
          <span className="stat-value">{svc.latency}ms</span>
        </div>
      </div>
      {svc.error && <div className="card-error">{svc.error}</div>}
    </div>
  )
}

function App() {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(300)
  const [interval, setInterval_] = useState(300)
  const [updated, setUpdated] = useState<Date | null>(null)

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/status`)
      if (!r.ok) throw new Error('shit broke')
      setData(await r.json())
      setUpdated(new Date())
      setErr(null)
      setTick(interval)
    } catch (e: any) {
      setErr(e.message || 'something went wrong')
    }
  }

  useEffect(() => {
    fetch(`${API}/api/config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.checkInterval) {
          setInterval_(d.checkInterval)
          setTick(d.checkInterval)
        }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const badges: Record<string, string> = {
    operational: 'vibin at full capacity',
    degraded: 'uhm.. kinda struggling',
    outage: 'oh.. oh? we fucked guys'
  }

  if (!data && !err) return (
    <div className="app">
      <div className="loading">
        <div className="spinner" />
        <span>hold on...</span>
      </div>
    </div>
  )

  if (err) return (
    <div className="app">
      <div className="error-state">
        <h2>welp, that didnt work</h2>
        <p>{err}</p>
      </div>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <div className={`status-badge ${data.overall}`}>
          <span className="dot" />
          {badges[data.overall]}
        </div>
      </header>
      <section className="services">
        {data.services.map((s: any) => <Card key={s.id} svc={s} />)}
      </section>
      <footer className="footer">
        {updated && <p>Last updated: {updated.toLocaleTimeString()}</p>}
        <p className="countdown">Next check in: {fmt(tick)}</p>
      </footer>
    </div>
  )
}

export default App
