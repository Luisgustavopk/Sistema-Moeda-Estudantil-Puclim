export function OrbitField({ className = '' }: { className?: string }) {
  return (
    <div
      className={`lp-orbit-field ${className}`}
      aria-hidden="true"
      data-story
    >
      <div className="lp-orbit-plane">
        <i className="lp-orbit-ring" />
        <i className="lp-orbit-ring lp-orbit-ring-inner" />
        <span className="lp-orbit-rotor">
          <i />
        </span>
        <span className="lp-orbit-rotor lp-orbit-rotor-second">
          <i />
        </span>
      </div>
    </div>
  )
}
