type Props = {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  badge?: string
  checkbox?: boolean
}

export default function OptionCard({ label, selected, onClick, disabled, badge, checkbox }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left px-5 py-4 rounded-xl border transition-all duration-200
        flex items-center gap-3 group
        ${disabled
          ? 'opacity-40 cursor-not-allowed border-border bg-bg2'
          : selected
            ? 'border-accent bg-accent/10 text-white'
            : 'border-border bg-bg2 hover:border-muted text-white/80 hover:text-white'
        }
      `}
    >
      {checkbox ? (
        <div
          className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${selected ? 'border-accent bg-accent' : 'border-muted/50 group-hover:border-muted'}
          `}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      ) : (
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${selected ? 'border-accent' : 'border-muted/50 group-hover:border-muted'}
          `}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
        </div>
      )}
      <span className="text-base">{label}</span>
      {badge && (
        <span className="ml-auto text-xs text-muted bg-bg3 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}
