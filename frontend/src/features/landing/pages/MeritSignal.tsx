// Puclim's five-bar signature. Decorative motion stays separate from readable UI.
export function MeritSignal({ className = '' }: { className?: string }) {
  return (
    <span
      className={`lp-merit-signal ${className}`}
      aria-hidden="true"
      data-story
    >
      <span className="lp-signal-bars">
        {[40, 86, 56, 100, 48].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }}>
            <i />
          </span>
        ))}
      </span>
    </span>
  )
}
