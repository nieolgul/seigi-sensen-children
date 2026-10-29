
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
  const radius = 110

  const point = (index, value) => {
    const angle = (-90 + index * 60) * Math.PI / 180
    const distance = radius * (value / 30)

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

  return (
    <svg
      className="status-radar"
      viewBox="0 0 320 320"
      role="img"
      aria-label="마법소녀 스테이터스 육각형 그래프"
    >
      {[6, 12, 18, 24, 30].map((value) => (
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
        const p = point(index, 30)

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

      <polygon points={polygonPoints(stats)} className="radar-value" />

      {STAT_LIST.map((stat, index) => {
        const p = point(index, stats[stat.key])

        return (
          <circle
            key={stat.key}
            cx={p.x}
            cy={p.y}
            r="3"
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
  const [savedStats] = useState(() => ({
    ...INITIAL_STATS,
    ...initialStats,
  }))

  const [savedPoints] = useState(initialPoints)

  const [stats, setStats] = useState(() => ({
    ...INITIAL_STATS,
    ...initialStats,
  }))

  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const spent = useMemo(
    () =>
      STAT_LIST.reduce(
        (sum, stat) => sum + stats[stat.key],
        0
      ),
    [stats]
  )

  const availableToSpend = savedPoints -
    STAT_LIST.reduce(
      (sum, stat) =>
        sum + Math.max(
          0,
          stats[stat.key] - savedStats[stat.key]
        ),
      0
    )

  const changeStat = (key, value) => {
    if (value === '') {
      setStats((previous) => ({
        ...previous,
        [key]: '',
      }))
      setMessage('')
      return
    }

    const nextValue = Number(value)

    if (
      !Number.isFinite(nextValue) ||
      !Number.isInteger(nextValue) ||
      nextValue < 0 ||
      nextValue > 30
    ) {
      return
    }

    const nextStats = {
      ...stats,
      [key]: nextValue,
    }

    const additionalSpent = STAT_LIST.reduce(
      (sum, stat) =>
        sum + Math.max(
          0,
          nextStats[stat.key] - savedStats[stat.key]
        ),
      0
    )

    if (additionalSpent > savedPoints) return

    setStats(nextStats)
    setMessage('')
  }

  const handleReset = () => {
    setStats({ ...savedStats })
    setMessage('')
  }

  const handleApply = async () => {
    if (!onApply) {
      setMessage('저장 기능을 아직 연결하지 않았어요.')
      return
    }

    // 빈 숫자 칸은 0으로 처리하고 저장
    const finalStats = Object.fromEntries(
      STAT_LIST.map((stat) => [
        stat.key,
        Number(stats[stat.key]) || 0,
      ])
    )

    const additionalSpent = STAT_LIST.reduce(
      (sum, stat) =>
        sum + Math.max(
          0,
          finalStats[stat.key] - savedStats[stat.key]
        ),
      0
    )

    if (additionalSpent > savedPoints) {
      setMessage('사용 가능한 포인트가 부족해요.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      await onApply({
        stats: finalStats,
        points: savedPoints - additionalSpent,
      })

      setMessage('적용이 완료되었습니다.')
    } catch (error) {
      setMessage(error.message || '적용에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="status-manager">
      <header className="status-heading">
        <p className="status-eyebrow">
          MAGICAL GIRL STATUS
        </p>

        <h1>스테이터스 관리</h1>

        <p>
          {girl?.name_ko || girl?.name || '담당 마법소녀'}
          의 능력치를 관리합니다.
        </p>
      </header>

      <section className="status-layout">
        <article className="status-chart-panel">
          <RadarChart stats={Object.fromEntries(
            STAT_LIST.map((stat) => [
              stat.key,
              Number(stats[stat.key]) || 0,
            ])
          )} />

          <div className="status-total">
            <span>총 능력치</span>
            <strong>{spent} / 180</strong>
          </div>
        </article>

        <article className="status-control-panel">
          <div className="status-point-card">
            <span>사용 가능 포인트</span>
            <strong>
              {availableToSpend} <small>P</small>
            </strong>
          </div>

    

          {STAT_LIST.map((stat) => {
            const currentValue =
              Number(stats[stat.key]) || 0

            return (
              <div
                className="status-slider-row"
                key={stat.key}
              >
                <div className="status-slider-heading">
                  <label htmlFor={`stat-${stat.key}`}>
                    {stat.label}
                  </label>

                  <div className="status-number-wrap">
                    <input
                      className="status-number-input"
                      type="number"
                      min="0"
                      max="30"
                      step="1"
                      value={stats[stat.key]}
                      disabled={saving}
                      aria-label={`${stat.label} 능력치 숫자`}
                      onChange={(event) =>
                        changeStat(
                          stat.key,
                          event.target.value
                        )
                      }
                      onBlur={() => {
                        if (stats[stat.key] === '') {
                          changeStat(stat.key, 0)
                        }
                      }}
                    />

                    <span className="status-number-max">
                      / 30
                    </span>
                  </div>
                </div>

                <input
                  id={`stat-${stat.key}`}
                  className="status-range"
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={currentValue}
                  disabled={saving}
                  style={{
                    '--range-progress':
                      `${(currentValue / 30) * 100}%`,
                  }}
                  onChange={(event) =>
                    changeStat(
                      stat.key,
                      event.target.value
                    )
                  }
                />
              </div>
            )
          })}

          <p className="status-help">
            적용 전까지 자유롭게 능력치를 조정할 수 있습니다.<br/>
            적용을 누르면 변경 내용이 저장됩니다.
          </p>

          <button
            type="button"
            className="status-apply-button"
            disabled={saving}
            onClick={handleApply}
          >
            {saving ? '적용 중...' : '적용하기'}
          </button>

                    <div className="status-bottom-row">
            <button
              type="button"
              className="back-button"
              disabled={saving}
              onClick={handleReset}
                      >
            <span className="back-button-label">변경 취소</span>
          </button>

            {message && (
              <p className="status-message" role="status">
                {message}
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  )
}
