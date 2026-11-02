import { useState, useEffect, useCallback } from 'react'
import { MOCK_LEADERBOARD, MOCK_STATS } from './mockData'
import './index.css'

// ── Config ──────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Helpers ─────────────────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 80) return 'score-green'
  if (score >= 65) return 'score-yellow'
  if (score >= 50) return 'score-orange'
  return 'score-red'
}

function getScoreBg(score) {
  if (score >= 80) return 'bg-green'
  if (score >= 65) return 'bg-yellow'
  if (score >= 50) return 'bg-orange'
  return 'bg-red'
}

function getGradeBadgeClass(grade) {
  if (grade?.startsWith('A')) return 'badge-green'
  if (grade === 'B') return 'badge-yellow'
  if (grade === 'C') return 'badge-orange'
  return 'badge-red'
}

function getSoldTag(sold) {
  if (sold === 'YES') return { cls: 'sold-yes', icon: '💸', label: 'Sells Data' }
  if (sold === 'NO')  return { cls: 'sold-no',  icon: '✅', label: 'Safe' }
  return { cls: 'sold-unclear', icon: '❓', label: 'Unclear' }
}

function getFaviconEmoji(domain) {
  const map = {
    'github.com': '🐙', 'stackoverflow.com': '📚', 'notion.so': '📝',
    'discord.com': '💬', 'spotify.com': '🎵', 'chegg.com': '📖',
    'quizlet.com': '🃏', 'duolingo.com': '🦜', 'coursera.org': '🎓',
    'instructure.com': '🏫',
  }
  return map[domain] || '🌐'
}

function scoreToGrade(score) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

// ── Stats Card ───────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ── Leaderboard Row ──────────────────────────────────────────────
function LbRow({ item, rank, onClick }) {
  const sold = getSoldTag(item.ai_structured_insights?.data_sold)
  const scoreColor = getScoreColor(item.final_trust_score)
  const scoreBg = getScoreBg(item.final_trust_score)
  const gradeClass = getGradeBadgeClass(item.grade)
  const cssColor = item.final_trust_score >= 80 ? 'var(--green)'
                 : item.final_trust_score >= 65 ? 'var(--yellow)'
                 : item.final_trust_score >= 50 ? 'var(--orange)'
                 : 'var(--red)'

  return (
    <div
      className="lb-row"
      style={{ '--score-color': cssColor }}
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(item)}
      aria-label={`View full report for ${item.domain}`}
    >
      {/* Rank */}
      <div className={`rank ${rank <= 3 ? 'top-3' : ''}`}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </div>

      {/* Domain */}
      <div className="domain-info">
        <div className="domain-favicon">{getFaviconEmoji(item.domain)}</div>
        <div>
          <div className="domain-name">{item.domain}</div>
          <div className="domain-meta">
            <span>{item.deterministic_metrics?.word_count?.toLocaleString()} words</span>
            <span>·</span>
            <span>{item.sections_found?.length || 0} sections</span>
          </div>
        </div>
      </div>

      {/* Trust Score */}
      <div className="score-cell">
        <div className={`score-number ${scoreColor}`}>{item.final_trust_score}</div>
        <div className="score-bar">
          <div className={`score-bar-fill ${scoreBg}`} style={{ width: `${item.final_trust_score}%` }} />
        </div>
      </div>

      {/* Grade */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className={`grade-badge ${gradeClass}`}>{item.grade}</div>
      </div>

      {/* Data Sold */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className={`sold-tag ${sold.cls}`}>
          {sold.icon} {sold.label}
        </span>
      </div>

      {/* Vague Count */}
      <div className="vague-count">
        {item.deterministic_metrics?.vague_phrases_count ?? '—'}<br/>
        <span style={{ fontSize: '0.68rem' }}>vague</span>
      </div>
    </div>
  )
}

// ── Detail Modal ─────────────────────────────────────────────────
function DetailModal({ item, onClose }) {
  const ai = item.ai_structured_insights || {}
  const dm = item.deterministic_metrics || {}
  const sold = getSoldTag(ai.data_sold)
  const scoreColor = getScoreColor(item.final_trust_score)
  const gradeClass = getGradeBadgeClass(item.grade)

  // Close on Escape
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: '1.8rem' }}>{getFaviconEmoji(item.domain)}</span>
              <h2 className="modal-domain" id="modal-title">{item.domain}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`sold-tag ${sold.cls}`}>{sold.icon} {sold.label}</span>
              {item.cached && (
                <span className="sold-tag" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent-light)' }}>
                  ⚡ Cached Result
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Score Row */}
          <div className="modal-score-row">
            <div className={`modal-score-number ${scoreColor}`}>{item.final_trust_score}</div>
            <div className={`modal-grade ${gradeClass}`}>{item.grade}</div>
            <div className="modal-score-meta">
              <div className="modal-score-label">Overall Trust Score</div>
              {item.score_deductions?.length > 0 && (
                <div className="deduction-list">
                  {item.score_deductions.map((d, i) => (
                    <div key={i} className="deduction-item">{d}</div>
                  ))}
                </div>
              )}
              {!item.score_deductions?.length && (
                <div style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ No major deductions</div>
              )}
            </div>
          </div>

          {/* 1. Deterministic NLP metrics */}
          <div className="modal-section">
            <div className="modal-section-title">🔬 Deterministic NLP Analysis</div>
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-box-value">{dm.transparency_score ?? '—'}</div>
                <div className="metric-box-label">Transparency Score</div>
              </div>
              <div className="metric-box">
                <div className="metric-box-value" style={{ color: dm.vague_phrases_count > 5 ? 'var(--red)' : 'var(--green)' }}>
                  {dm.vague_phrases_count ?? '—'}
                </div>
                <div className="metric-box-label">Vague Phrases</div>
              </div>
              <div className="metric-box">
                <div className="metric-box-value">{dm.word_count?.toLocaleString() ?? '—'}</div>
                <div className="metric-box-label">Word Count</div>
              </div>
            </div>
          </div>

          {/* 2. Data types collected */}
          {ai.key_data_types?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">🗂️ Data Types Collected</div>
              <div className="tag-list">
                {ai.key_data_types.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
            </div>
          )}

          {/* 3. Third-party sharing */}
          {ai.third_party_sharing?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">🤝 Third-Party Sharing</div>
              <div className="tag-list">
                {ai.third_party_sharing.map((t, i) => (
                  <span key={i} className="tag" style={{ borderColor: 'rgba(249,115,22,0.3)', color: 'var(--orange)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Retention */}
          <div className="modal-section">
            <div className="modal-section-title">🕐 Data Retention Period</div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '0.9rem',
              color: ai.retention_period === 'Not Specified' ? 'var(--red)' : 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {ai.retention_period || 'Not Specified'}
            </div>
          </div>

          {/* 5. Key risks */}
          {ai.key_risks?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">⚠️ Key Privacy Risks</div>
              <div className="risk-list">
                {ai.key_risks.map((r, i) => (
                  <div key={i} className="risk-item">
                    <span className="risk-icon">⚠</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. User rights */}
          {ai.user_rights?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">🛡️ Your Rights</div>
              <div className="rights-list">
                {ai.user_rights.map((r, i) => (
                  <div key={i} className="right-item">
                    <span className="right-icon">✓</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Trustworthy AI pillars */}
          <div className="modal-section">
            <div className="modal-section-title">🤖 Trustworthy AI Transparency</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '🔎', label: 'Explainability', desc: 'Score backed by deterministic regex + spaCy NLP — not a black-box LLM decision.' },
                { icon: '🔒', label: 'Privacy-by-Design', desc: 'Zero personal user data collected. Only public policy text is sent to the backend.' },
                { icon: '💪', label: 'Robustness', desc: 'Section-based chunking + 30-day MongoDB cache prevents hallucinations and redundant API calls.' },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Analyze Tool ─────────────────────────────────────────────────
function AnalyzeTool({ onResult }) {
  const [domain, setDomain] = useState('')
  const [policyText, setPolicyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!policyText.trim() || policyText.trim().length < 100) {
      setError('Please paste at least 100 characters of a privacy policy.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain || 'custom', policy_text: policyText }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      setResult(data)
      onResult(data)
    } catch (e) {
      setError(`Failed to reach backend: ${e.message}. Make sure the FastAPI server is running.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="analyze-section">
      <h2>🔍 Analyze Any Privacy Policy</h2>
      <p>Paste any privacy policy text below and get an instant Trust Score powered by our Hybrid NLP + AI pipeline.</p>
      <div className="analyze-form">
        <input
          id="domain-input"
          className="domain-input"
          placeholder="Domain (e.g. notion.so) — optional"
          value={domain}
          onChange={e => setDomain(e.target.value)}
        />
        <textarea
          id="policy-text-input"
          className="policy-textarea"
          placeholder="Paste privacy policy text here (minimum 100 characters)..."
          value={policyText}
          onChange={e => setPolicyText(e.target.value)}
          rows={6}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: '0.82rem', textAlign: 'left' }}>{error}</div>}
        <button id="analyze-btn" className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? '⏳ Analyzing…' : '⚡ Analyze Policy'}
        </button>
      </div>
      {result && (
        <div className="analyze-result">
          {JSON.stringify(result, null, 2)}
        </div>
      )}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  const [search, setSearch] = useState('')
  const [filterSold, setFilterSold] = useState('all')
  const [sortBy, setSortBy] = useState('highest')
  const [selectedItem, setSelectedItem] = useState(null)

  // Fetch from backend, fall back to mock data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [lbRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/leaderboard?sort_by=${sortBy}&filter_sold=${filterSold}&search=${search}&limit=200`),
        fetch(`${API_BASE}/api/v1/stats`),
      ])
      if (!lbRes.ok || !statsRes.ok) throw new Error('Non-OK response')
      const [lbData, statsData] = await Promise.all([lbRes.json(), statsRes.json()])
      setLeaderboard(lbData.results || [])
      setStats(statsData)
      setUsingMock(false)
    } catch {
      // Backend not running — show mock data
      setLeaderboard(MOCK_LEADERBOARD)
      setStats(MOCK_STATS)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }, [sortBy, filterSold, search])

  useEffect(() => { fetchData() }, [fetchData])

  // Client-side filter/sort for mock mode (backend handles it natively)
  const displayed = usingMock
    ? MOCK_LEADERBOARD
        .filter(i => !search || i.domain.includes(search.toLowerCase()))
        .filter(i => filterSold === 'all' || (filterSold === 'yes' ? i.ai_structured_insights?.data_sold === 'YES' : i.ai_structured_insights?.data_sold !== 'YES'))
        .sort((a, b) => {
          if (sortBy === 'lowest') return a.final_trust_score - b.final_trust_score
          if (sortBy === 'recent') return new Date(b.analyzed_at) - new Date(a.analyzed_at)
          return b.final_trust_score - a.final_trust_score
        })
    : leaderboard

  const handleAnalyzeResult = (result) => {
    // Prepend fresh result to leaderboard display
    setLeaderboard(prev => {
      const filtered = prev.filter(i => i.domain !== result.domain)
      return [result, ...filtered]
    })
    setStats(prev => prev ? {
      ...prev,
      total_analyzed: prev.total_analyzed + (leaderboard.find(i => i.domain === result.domain) ? 0 : 1),
    } : prev)
  }

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar" role="navigation">
        <div className="container navbar-inner">
          <a href="/" className="logo" aria-label="PrivacyLens Home">
            <div className="logo-icon">🛡️</div>
            PrivacyLens
          </a>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="nav-badge">BETA</span>
            {usingMock && (
              <span className="nav-badge" style={{ background: 'var(--yellow-dim)', borderColor: 'rgba(234,179,8,0.3)', color: 'var(--yellow)' }}>
                📦 Demo Mode
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-tag">⚡ Hybrid NLP + Structured AI</div>
          <h1>Privacy Policy Leaderboard</h1>
          <p>
            Transparent, explainable trust scores for the apps students use every day.
            Powered by deterministic NLP + Gemini AI — never a blind LLM guess.
          </p>
          {stats && (
            <div className="stats-row">
              <StatCard value={stats.total_analyzed} label="Policies Analyzed" />
              <StatCard value={`${stats.average_trust_score}/100`} label="Avg Trust Score" />
              <StatCard value={`${stats.percent_selling_data}%`} label="Sites Selling Data" />
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="container">
          {/* Analyze Tool */}
          <AnalyzeTool onResult={handleAnalyzeResult} />

          {/* Leaderboard */}
          <section className="leaderboard-section" aria-label="Privacy Policy Leaderboard">
            {/* Controls */}
            <div className="controls">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  id="leaderboard-search"
                  type="text"
                  className="search-input"
                  placeholder="Search domains…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search domains"
                />
              </div>
              <div className="filter-group">
                <select
                  id="sort-select"
                  className="filter-btn"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  aria-label="Sort leaderboard"
                >
                  <option value="highest">↑ Highest Score</option>
                  <option value="lowest">↓ Lowest Score</option>
                  <option value="recent">🕐 Most Recent</option>
                </select>
                {['all', 'no', 'yes'].map(f => (
                  <button
                    key={f}
                    id={`filter-sold-${f}`}
                    className={`filter-btn ${filterSold === f ? 'active' : ''}`}
                    onClick={() => setFilterSold(f)}
                    aria-pressed={filterSold === f}
                  >
                    {f === 'all' ? '🌐 All' : f === 'no' ? '✅ Safe Only' : '💸 Sells Data'}
                  </button>
                ))}
              </div>
            </div>

            {/* Header row */}
            <div className="section-header">
              <span className="section-title">🏆 Domain Rankings</span>
              <span className="count-badge">{displayed.length} domains</span>
            </div>

            {/* Column labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 110px 90px 90px 80px',
              gap: 16,
              padding: '0 20px 10px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}>
              <span>#</span><span>Domain</span><span style={{textAlign:'center'}}>Score</span>
              <span style={{textAlign:'center'}}>Grade</span>
              <span style={{textAlign:'center'}}>Data Sold</span>
              <span style={{textAlign:'center'}}>Vague</span>
            </div>

            {/* Body */}
            {loading ? (
              <>
                <div className="spinner" />
                <div className="loading-text">Loading leaderboard data…</div>
              </>
            ) : displayed.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-text">No domains match your filters.</div>
              </div>
            ) : (
              <div className="leaderboard-grid">
                {displayed.map((item, i) => (
                  <LbRow
                    key={item.domain}
                    item={item}
                    rank={i + 1}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>
            PrivacyLens • Hybrid NLP + AI Policy Analyzer •{' '}
            <a href="https://github.com/pooja1932/PrivacyLens" target="_blank" rel="noreferrer">GitHub</a>
            {' '}• Built for Trustworthy AI Course Submission
          </p>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}
