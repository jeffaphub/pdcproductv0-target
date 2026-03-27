import { cn } from "@/lib/utils"

type SparklineProps = {
  data: { value: number }[]
  className?: string
  color?: string
}

export function Sparkline({ data, className, color = "#1D4ED8" }: SparklineProps) {
  if (data.length === 0) return null

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d.value - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg className={cn("w-full h-full", className)} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
