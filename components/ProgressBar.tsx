type Props = {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs text-muted mb-2">
        <span>Шаг {current} из {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
