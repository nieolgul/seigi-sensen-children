
import { useMemo, useState } from 'react'
import './StatusManager.css'

const STAT_LIST = [
  { key: 'luck', label: '행운' },
  { key: 'power', label: '무력' },
  { key: 'health', label: '건강' },
  { key: 'defense', label: '방어' },
  { key: 'agility', label: '민첩' },
  { key: 'skill', label: '숙련' },
]

const INITIAL_STATS = {
  luck: 0,
  power: 0,
  health: 0,
  defense: 0,
  agility: 0,
  skill: 0,
}

function RadarChart({ stats }) {
  const center = 160
  const radius = 100

  const point = (index, value) => {
    const angle = (-90 + index * 60) * Math.PI / 180
    const distance = radius * (value / 50)

    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    }
  }

  const polygonPoints = (values) =>
    STAT_LIST.map((stat, index) => {
      const p = point(index, values[stat.key])
      return `${p.x},${p.y}`
    }).join(' ')

  const grid = [10, 20, 30, 40, 50]

  return (
    <svg
      className="status-radar"
      viewBox="0 0 320 320"
      role="img"
      aria-label="마법소녀 스테이터스 육각형 그래프"
    >
      {grid.map((value) => (
        <polygon
          key={value}
          points={polygonPoints(
            Object.fromEntries(
              STAT_LIST.map((stat) => [stat.key, value])
            )
          )}
          className="radar-grid"
        />
      ))}

      {STAT_LIST.map((stat, index) => {
        const p = point(index, 50)
        return (
          <g key={stat.key}>
            <line
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              className="radar-axis"
            />
            <text
              x={center + (p.x - center) * 1.2}
              y={center + (p.y - center) * 1.2}
              className="radar-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {stat.label}
            </text>
          </g>
        )
      })}

      <polygon
        points={polygonPoints(stats)}
        className="radar-value"
      />

      {STAT_LIST.map((stat, index) => {
        const p = point(index, stats[stat.key])
        return (
          <circle
            key={stat.key}
            cx={p.x}
            cy={p.y}
            r="4"
            className="radar-dot"
          />
        )
      })}
    </svg>
  )
}

export default function StatusManager({
  girl,
  initialStats = INITIAL_STATS,
  initialPoints = 10,
  onApply,
}) {
  const [stats, setStats] = useState(() => ({
    ...INITIAL_STATS,
    ...initialStats,
  }))
  const [points, setPoints] = useState(initialPoints)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const spent = useMemo(
    () => STAT_LIST.reduce((sum, stat) => sum + stats[stat.key], 0),
    [stats]
  )

  const changeStat = (key, value) => {
    const nextValue = Number(value)
    const difference = nextValue - stats[key]

    if (nextValue < 0 || nextValue > 50) return
    if (difference > points) return

    setStats((current) => ({
      ...current,
      [key]: nextValue,
    }))
    setPoints((current) => current - difference)
    setMessage('')
  }

  const handleApply = async () => {
    if (!onApply) {
      setMessage('저장 기능을 아직 연결하지 않았어요.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      await onApply({ stats, points })
      setMessage('적용 요청이 완료됐어요.')
    } catch (error) {
      setMessage(error.message || '적용에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="status-manager">
      <header className="status-heading">
        <p className="status-eyebrow">MAGICAL GIRL STATUS</p>
        <h1>스테이터스 관리</h1>
        <p>
          {girl?.name_ko || girl?.name || '담당 마법소녀'}
          의 능력치를 관리합니다.
        </p>
      </header>

      <section className="status-layout">
        <article className="status-chart-panel">
          <h2>STATUS CHART</h2>
          <RadarChart stats={stats} />

          <div className="status-total">
            <span>총 능력치</span>
            <strong>{spent} / 300</strong>
          </div>
        </article>

        <article className="status-control-panel">
          <div className="status-point-card">
            <span>사용 가능 포인트</span>
            <strong>{points} <small>P</small></strong>
          </div>

          <h2>능력치 분배</h2>

          {STAT_LIST.map((stat) => (
            <div className="status-slider-row" key={stat.key}>
              <div className="status-slider-heading">
                <label htmlFor={`stat-${stat.key}`}>
                  {stat.label}
                </label>
                <strong>{stats[stat.key]} / 50</strong>
              </div>

              <input
                id={`stat-${stat.key}`}
                type="range"
                min="0"
                max={Math.min(50, stats[stat.key] + points)}
                step="1"
                value={stats[stat.key]}
                onChange={(event) =>
                  changeStat(stat.key, event.target.value)
                }
                style={{
                  '--range-progress': `${stats[stat.key] * 2}%`,
                }}
              />
            </div>
          ))}

          <p className="status-help">
            포인트를 사용해 능력치를 올릴 수 있어요.
            적용 후에는 사용한 포인트가 환급되지 않습니다.
          </p>

          <button
            type="button"
            className="status-apply-button"
            disabled={saving}
            onClick={handleApply}
          >
            {saving ? '적용 중...' : '적용하기'}
          </button>

          {message && (
            <p className="status-message" role="status">
              {message}
            </p>
          )}
        </article>
      </section>
    </main>
  )
}
