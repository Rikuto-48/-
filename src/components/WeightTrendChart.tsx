interface WeightPoint {
  date: string
  weight: number
}

interface WeightTrendChartProps {
  points: WeightPoint[]
}

const WIDTH = 320
const HEIGHT = 120
const PADDING_X = 12
const PADDING_Y = 16

function formatDateLabel(isoDate: string) {
  const [, month, day] = isoDate.split('-')
  return `${Number(month)}/${Number(day)}`
}

function WeightTrendChart({ points }: WeightTrendChartProps) {
  if (points.length === 0) {
    return <p className="weight-chart-empty">体重の記録がありません</p>
  }

  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const innerWidth = WIDTH - PADDING_X * 2
  const innerHeight = HEIGHT - PADDING_Y * 2

  function xFor(index: number) {
    if (points.length === 1) return PADDING_X + innerWidth / 2
    return PADDING_X + (innerWidth * index) / (points.length - 1)
  }

  function yFor(weight: number) {
    return PADDING_Y + innerHeight - ((weight - min) / range) * innerHeight
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.weight).toFixed(1)}`)
    .join(' ')

  const maxIndex = weights.indexOf(max)
  const minIndex = weights.indexOf(min)

  return (
    <svg
      className="weight-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="体重の推移グラフ"
    >
      <line
        x1={PADDING_X}
        y1={HEIGHT - PADDING_Y}
        x2={WIDTH - PADDING_X}
        y2={HEIGHT - PADDING_Y}
        className="weight-chart-baseline"
      />
      <path d={linePath} className="weight-chart-line" fill="none" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={xFor(i)} cy={yFor(p.weight)} r={4} className="weight-chart-dot">
            <title>
              {formatDateLabel(p.date)}: {p.weight}kg
            </title>
          </circle>
          {(i === maxIndex || i === minIndex || i === points.length - 1) && (
            <text x={xFor(i)} y={yFor(p.weight) - 8} className="weight-chart-label" textAnchor="middle">
              {p.weight}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default WeightTrendChart
