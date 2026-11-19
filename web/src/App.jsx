import { useState, useEffect, useCallback, useRef } from 'react'
import { MOCK_LEADERBOARD, MOCK_STATS } from './mockData'
import './index.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Helpers ───────────────────────────────────────────────────────────
function getGradeClass(grade) {
  if (grade?.startsWith('A')) return 'badge-a'
  if (grade === 'B') return 'badge-b'
  if (grade === 'C') return 'badge-c'
  return 'badge-d'
}

function getSoldTag(sold) {
  if (sold === 'YES') return { cls: 'sold-pill-yes', label: 'Sells Data' }
  if (sold === 'NO')  return { cls: 'sold-pill-no', label: 'Safe' }
  return { cls: 'sold-pill-unclear', label: 'Unclear' }
}

function getCrestInitials(domain) {
  const clean = domain.replace(/\.(com|org|net|so|io|edu|ac\.in)$/, '')
  const parts = clean.split(/[-_.]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

// ── Branded Logo Component ──────────────────────────────────────────
function PrivacyLensLogo({ size = 44 }) {
  return (
    <img
      src="/logo.png"
      alt="PrivacyLens Logo"
      className="brand-logo-img"
      style={{ width: size, height: 'auto', maxHeight: size }}
    />
  )
}

// ── SVG Icons ─────────────────────────────────────────────────────────
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Warning: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  Microscope: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
}

// ── Soft Per-Character Typed/Fade-in Title Component ──────────────────
function AnimatedHeadline({ line1, line2Accent }) {
  const combined = `${line1} ${line2Accent}`
  const words = combined.split(' ')
  let globalCharIdx = 0

  return (
    <h1 className="hero-headline">
      {words.map((word, wIdx) => {
        const isAccent = word === line2Accent || line2Accent.includes(word)
        return (
          <span key={wIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {isAccent ? (
              <em>
                {word.split('').map((char) => {
                  const delay = globalCharIdx++ * 36
                  return (
                    <span
                      key={`${wIdx}-${char}-${delay}`}
                      className="char"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      {char}
                    </span>
                  )
                })}
              </em>
            ) : (
              word.split('').map((char) => {
                const delay = globalCharIdx++ * 36
                return (
                  <span
                    key={`${wIdx}-${char}-${delay}`}
                    className="char"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {char}
                  </span>
                )
              })
            )}
            {wIdx < words.length - 1 && (
              <span className="char-space" style={{ animationDelay: `${globalCharIdx++ * 36}ms` }}>
                &nbsp;
              </span>
            )}
          </span>
        )
      })}
    </h1>
  )
}

// ── Accordion Policy Analyzer ─────────────────────────────────────────
function PolicyAnalyzerAccordion({ onResult }) {
  const [isOpen, setIsOpen] = useState(false)
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
      setError(`Failed to reach backend: ${e.message}. (FastAPI server offline or unreached)`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="analyzer-section" id="analyzer">
      <div className="container">
        <div className="analyzer-accordion-card">
          <button
            className="accordion-header-btn"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
          >
            <div className="accordion-title-group">
              <div className="accordion-icon-box">
                <Icons.Microscope />
              </div>
              <div className="accordion-title-text">
                <h3>Policy Analyzer</h3>
                <p>Run instant deterministic NLP + structured AI evaluation on any policy</p>
              </div>
            </div>
            <div className={`accordion-chevron-icon ${isOpen ? 'is-open' : ''}`}>
              <Icons.ChevronDown />
            </div>
          </button>

          <div className={`accordion-collapse ${isOpen ? 'is-open' : ''}`}>
            <div className="accordion-content-inner">
              <div className="accordion-body-padding">
                <div className="analyzer-grid-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="domain-input">Target Domain (optional)</label>
                    <input
                      id="domain-input"
                      className="input-light"
                      placeholder="e.g. notion.so, spotify.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn-teal-primary"
                      onClick={handleAnalyze}
                      disabled={loading}
                      style={{ height: '45px' }}
                    >
                      {loading ? 'Processing Evaluation...' : 'Run Analysis'}
                    </button>
                  </div>

                  <div className="form-group full-span">
                    <label className="form-label" htmlFor="policy-text-input">Privacy Policy Text Content</label>
                    <textarea
                      id="policy-text-input"
                      className="input-light textarea-light"
                      placeholder="Paste raw policy text here (minimum 100 characters)..."
                      value={policyText}
                      onChange={(e) => setPolicyText(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>

                {error && <div className="alert-box-error">{error}</div>}

                {result && (
                  <div className="analysis-result-json">
                    {JSON.stringify(result, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────
function PolicyDetailModal({ item, onClose }) {
  const ai = item.ai_structured_insights || {}
  const dm = item.deterministic_metrics || {}
  const sold = getSoldTag(ai.data_sold)
  const gradeClass = getGradeClass(item.grade)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header-bar">
          <div>
            <h2 className="modal-domain-heading">{item.domain}</h2>
            <div className="modal-tags-row">
              <span className={`sold-pill ${sold.cls}`}>
                <span className="sold-dot" />
                {sold.label}
              </span>
              {item.cached && (
                <span className="sold-pill" style={{ background: 'var(--mint-100)', color: 'var(--teal-800)' }}>
                  Cached Result
                </span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <Icons.Close />
          </button>
        </div>

        <div className="modal-body-content">
          <div className="modal-score-highlight">
            <div className="modal-score-digit">{item.final_trust_score}</div>
            <div className={`modal-grade-pill ${gradeClass}`}>{item.grade}</div>
            <div className="modal-score-info">
              <div className="modal-score-legend">Overall Trust Score (PTS)</div>
              {item.score_deductions?.length > 0 ? (
                <div>
                  {item.score_deductions.map((d, i) => (
                    <div key={i} className="deduction-pill">{d}</div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--status-green)', fontWeight: 600 }}>
                  High Transparency · No Major Deductions
                </div>
              )}
            </div>
          </div>

          <div className="modal-detail-section">
            <div className="modal-section-h4">Deterministic NLP Metrics</div>
            <div className="metrics-3col">
              <div className="metric-card-lite">
                <div className="metric-card-digit">{dm.transparency_score ?? '—'}</div>
                <div className="metric-card-lbl">Transparency</div>
              </div>
              <div className="metric-card-lite">
                <div className="metric-card-digit" style={{ color: dm.vague_phrases_count > 4 ? 'var(--status-red)' : 'var(--status-green)' }}>
                  {dm.vague_phrases_count ?? '—'}
                </div>
                <div className="metric-card-lbl">Vague Phrases</div>
              </div>
              <div className="metric-card-lite">
                <div className="metric-card-digit">{dm.word_count?.toLocaleString() ?? '—'}</div>
                <div className="metric-card-lbl">Word Count</div>
              </div>
            </div>
          </div>

          {ai.key_data_types?.length > 0 && (
            <div className="modal-detail-section">
              <div className="modal-section-h4">Data Collected</div>
              <div className="tag-cloud">
                {ai.key_data_types.map((t, idx) => (
                  <span key={idx} className="data-tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          {ai.third_party_sharing?.length > 0 && (
            <div className="modal-detail-section">
              <div className="modal-section-h4">Third-Party Sharing</div>
              <div className="tag-cloud">
                {ai.third_party_sharing.map((t, idx) => (
                  <span key={idx} className="data-tag" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ai.key_risks?.length > 0 && (
            <div className="modal-detail-section">
              <div className="modal-section-h4">Identified Risks</div>
              {ai.key_risks.map((r, idx) => (
                <div key={idx} className="risk-alert-box">
                  <Icons.Warning />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {ai.user_rights?.length > 0 && (
            <div className="modal-detail-section">
              <div className="modal-section-h4">User Rights</div>
              {ai.user_rights.map((r, idx) => (
                <div key={idx} className="right-alert-box">
                  <Icons.Check />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Super League Table Component (Kayachira Super League style) ──────
function SuperLeagueLeaderboard({
  displayed,
  loading,
  search,
  setSearch,
  filterSold,
  setFilterSold,
  sortBy,
  setSortBy,
  onSelectItem,
}) {
  // Group into Pool A (High Trust >= 70) and Pool B (Moderate & Risk < 70)
  // or when searching, display matching results in their respective pools
  const poolA = displayed.filter((item) => item.final_trust_score >= 70)
  const poolB = displayed.filter((item) => item.final_trust_score < 70)

  return (
    <section className="leaderboard-section" id="leaderboard">
      <div className="container">
        {/* Filter controls */}
        <div className="lb-filter-bar">
          <div className="search-input-wrap">
            <span className="search-icon"><Icons.Search /></span>
            <input
              type="text"
              className="search-field"
              placeholder="Search domains (e.g. github, spotify)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search domains"
            />
          </div>

          <div className="filter-pills-row">
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort table"
            >
              <option value="highest">PTS: High to Low</option>
              <option value="lowest">PTS: Low to High</option>
              <option value="recent">Recently Audited</option>
            </select>

            {[
              { id: 'all', label: 'All Domains' },
              { id: 'no', label: 'Safe Only' },
              { id: 'yes', label: 'Sells Data' },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`pill-filter-btn ${filterSold === id ? 'is-active' : ''}`}
                onClick={() => setFilterSold(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Kayachira Super League Styled Table Box */}
        <div className="super-league-card">
          {/* Left Vertical Spine with Rotated "POINT TABLE" */}
          <div className="league-vertical-spine">
            <div className="spine-teal-line" />
            <div className="spine-vertical-text">POINT TABLE</div>
          </div>

          {/* Right Tables Container */}
          <div className="league-tables-container">
            {/* Top tournament / benchmark header */}
            <div className="league-top-meta">
              <div className="league-meta-title">
                <h2>PrivacyLens League</h2>
                <p>2026 Season • Trustworthy AI Benchmark</p>
              </div>
              <div className="league-trophy-badge">
                <Icons.Trophy />
                <span>{displayed.length} Evaluated</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                Loading league point table...
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                No platform policies match the selected filter.
              </div>
            ) : (
              <>
                {/* POOL A: High Trust Tier */}
                {poolA.length > 0 && (
                  <div className="pool-block">
                    <div className="pool-header-row">
                      <div className="pool-name">POOL A • HIGH TRUST & TRANSPARENCY</div>
                      <div className="pool-stats-legend">WORDS · VAGUE · DATA · GRADE · PTS</div>
                    </div>
                    <table className="league-table-grid">
                      <thead>
                        <tr>
                          <th>Platform / Domain</th>
                          <th className="c">Words</th>
                          <th className="c">Vague</th>
                          <th className="c">Data Sold</th>
                          <th className="c">Grade</th>
                          <th className="th-pts">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poolA.map((item) => {
                          const sold = getSoldTag(item.ai_structured_insights?.data_sold)
                          const crest = getCrestInitials(item.domain)
                          return (
                            <tr key={item.domain} className="league-tr" onClick={() => onSelectItem(item)}>
                              <td>
                                <div className="crest-cell">
                                  <div className="crest-shield">{crest}</div>
                                  <div>
                                    <div className="team-domain-name">{item.domain}</div>
                                    <div className="team-domain-meta">
                                      <span>{item.sections_found?.length || 0} Sections</span>
                                      <span>•</span>
                                      <span>Verified</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="c num-metric">
                                {item.deterministic_metrics?.word_count?.toLocaleString() || '—'}
                              </td>
                              <td className="c num-metric">
                                {item.deterministic_metrics?.vague_phrases_count ?? '—'}
                              </td>
                              <td className="c">
                                <span className={`sold-pill ${sold.cls}`}>
                                  <span className="sold-dot" />
                                  {sold.label}
                                </span>
                              </td>
                              <td className="c">
                                <span className={`grade-badge-sm ${getGradeClass(item.grade)}`}>
                                  {item.grade}
                                </span>
                              </td>
                              <td className="td-pts">{item.final_trust_score}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* POOL B: Caution & High Risk Tier */}
                {poolB.length > 0 && (
                  <div className="pool-block">
                    <div className="pool-header-row" style={{ background: '#0f3d36' }}>
                      <div className="pool-name" style={{ color: '#99f6e4' }}>
                        POOL B • CAUTION & DATA MONETIZATION
                      </div>
                      <div className="pool-stats-legend">WORDS · VAGUE · DATA · GRADE · PTS</div>
                    </div>
                    <table className="league-table-grid">
                      <thead>
                        <tr>
                          <th>Platform / Domain</th>
                          <th className="c">Words</th>
                          <th className="c">Vague</th>
                          <th className="c">Data Sold</th>
                          <th className="c">Grade</th>
                          <th className="th-pts" style={{ background: '#0f766e' }}>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poolB.map((item) => {
                          const sold = getSoldTag(item.ai_structured_insights?.data_sold)
                          const crest = getCrestInitials(item.domain)
                          return (
                            <tr key={item.domain} className="league-tr" onClick={() => onSelectItem(item)}>
                              <td>
                                <div className="crest-cell">
                                  <div className="crest-shield" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }}>
                                    {crest}
                                  </div>
                                  <div>
                                    <div className="team-domain-name">{item.domain}</div>
                                    <div className="team-domain-meta">
                                      <span>{item.sections_found?.length || 0} Sections</span>
                                      <span>•</span>
                                      <span>Audit Flagged</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="c num-metric">
                                {item.deterministic_metrics?.word_count?.toLocaleString() || '—'}
                              </td>
                              <td className="c num-metric" style={{ color: 'var(--status-red)' }}>
                                {item.deterministic_metrics?.vague_phrases_count ?? '—'}
                              </td>
                              <td className="c">
                                <span className={`sold-pill ${sold.cls}`}>
                                  <span className="sold-dot" />
                                  {sold.label}
                                </span>
                              </td>
                              <td className="c">
                                <span className={`grade-badge-sm ${getGradeClass(item.grade)}`}>
                                  {item.grade}
                                </span>
                              </td>
                              <td className="td-pts" style={{ background: '#0f766e' }}>
                                {item.final_trust_score}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* League Footer Strip */}
                <div className="league-footer-strip">
                  <div className="league-footer-text">
                    Continuous AI Auditing • Trustworthy AI Research
                  </div>
                  <div className="league-footer-mark" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/logo.png" alt="PrivacyLens" style={{ height: '22px', width: 'auto' }} />
                    <span>PRIVACY LENS</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main Application Component ────────────────────────────────────────
export default function App() {
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  const [search, setSearch] = useState('')
  const [filterSold, setFilterSold] = useState('all')
  const [sortBy, setSortBy] = useState('highest')
  const [selectedItem, setSelectedItem] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [lbRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/leaderboard?sort_by=${sortBy}&filter_sold=${filterSold}&search=${search}&limit=200`),
        fetch(`${API_BASE}/api/v1/stats`),
      ])
      if (!lbRes.ok || !statsRes.ok) throw new Error('Backend unreached')
      const [lbData, statsData] = await Promise.all([lbRes.json(), statsRes.json()])
      setLeaderboard(lbData.results || [])
      setStats(statsData)
      setUsingMock(false)
    } catch {
      setLeaderboard(MOCK_LEADERBOARD)
      setStats(MOCK_STATS)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }, [sortBy, filterSold, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const displayed = usingMock
    ? MOCK_LEADERBOARD
        .filter((i) => !search || i.domain.toLowerCase().includes(search.toLowerCase()))
        .filter((i) =>
          filterSold === 'all' ||
          (filterSold === 'yes'
            ? i.ai_structured_insights?.data_sold === 'YES'
            : i.ai_structured_insights?.data_sold !== 'YES')
        )
        .sort((a, b) => {
          if (sortBy === 'lowest') return a.final_trust_score - b.final_trust_score
          if (sortBy === 'recent') return new Date(b.analyzed_at) - new Date(a.analyzed_at)
          return b.final_trust_score - a.final_trust_score
        })
    : leaderboard

  const handleAnalyzeResult = (result) => {
    setLeaderboard((prev) => {
      const filtered = prev.filter((i) => i.domain !== result.domain)
      return [result, ...filtered]
    })
    setStats((prev) =>
      prev
        ? {
            ...prev,
            total_analyzed: prev.total_analyzed + (leaderboard.find((i) => i.domain === result.domain) ? 0 : 1),
          }
        : prev
    )
  }

  return (
    <div className="app">
      {/* ── Sticky Navbar with Custom Logo ── */}
      <header className="navbar">
        <div className="container navbar-inner">
          <a href="/" className="brand-link" aria-label="PrivacyLens Home">
            <PrivacyLensLogo size={42} />
            <div className="brand-text-block">
              <div className="brand-title">
                Privacy<span>Lens</span>
              </div>
              <div className="brand-subtitle">AI Policy Intelligence</div>
            </div>
          </a>

          <ul className="nav-links">
            <li><a href="#analyzer">Analyzer</a></li>
            <li><a href="#leaderboard">Leaderboard</a></li>
            <li>
              <a href="https://github.com/pooja1932/PrivacyLens" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </li>
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="nav-badge-pill">BETA</span>
            {usingMock && <span className="nav-badge-pill" style={{ background: '#fef3c7', color: '#92400e' }}>DEMO DATA</span>}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Left Aligned Format following A-Space) ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-layout">
            <div className="hero-left">
              <div className="hero-tag">Deterministic NLP + Structured LLM</div>

              {/* Per-character typing text effect */}
              <AnimatedHeadline
                line1="Privacy Policy"
                line2Accent="Leaderboard"
              />

              <p className="hero-subtext">
                Explainable, empirical trust scores for everyday digital platforms.
                Evaluating data selling, clause ambiguity, and user consent through
                transparent artificial intelligence.
              </p>

              <div className="hero-actions">
                <a href="#analyzer" className="btn-teal-primary">
                  Analyze A Policy
                </a>
                <a href="#leaderboard" className="btn-teal-outline">
                  View Point Table
                </a>
              </div>
            </div>

            {/* Right KPI cards (following A-Space telemetry cards) */}
            <div className="hero-right">
              <div className="kpi-card">
                <div className="kpi-details">
                  <div className="kpi-number">{stats?.total_analyzed ?? 10}</div>
                  <div className="kpi-label">Policies Evaluated</div>
                </div>
                <div className="kpi-badge-icon">
                  <Icons.ShieldCheck />
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-details">
                  <div className="kpi-number">{stats?.average_trust_score ?? 66.9}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span></div>
                  <div className="kpi-label">Average Trust Rating</div>
                </div>
                <div className="kpi-badge-icon">
                  <Icons.Sparkles />
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-details">
                  <div className="kpi-number" style={{ color: 'var(--status-red)' }}>
                    {stats?.percent_selling_data ?? 30.0}%
                  </div>
                  <div className="kpi-label">Platforms Selling User Data</div>
                </div>
                <div className="kpi-badge-icon" style={{ background: '#fee2e2', color: 'var(--status-red)' }}>
                  <Icons.Warning />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Policy Analyzer Accordion ── */}
      <PolicyAnalyzerAccordion onResult={handleAnalyzeResult} />

      {/* ── Kayachira Super League Leaderboard ── */}
      <SuperLeagueLeaderboard
        displayed={displayed}
        loading={loading}
        search={search}
        setSearch={setSearch}
        filterSold={filterSold}
        setFilterSold={setFilterSold}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSelectItem={setSelectedItem}
      />

      {/* ── Detail Modal ── */}
      {selectedItem && (
        <PolicyDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {/* ── Footer ── */}
      <footer className="footer-bar">
        <div className="container footer-content">
          <div>
            PrivacyLens • Trustworthy AI Privacy Policy Evaluation Framework
          </div>
          <div>
            <a href="https://github.com/pooja1932/PrivacyLens" target="_blank" rel="noreferrer">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
