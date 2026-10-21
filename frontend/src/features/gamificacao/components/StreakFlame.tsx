export function StreakFlame({
  size = 22,
  active = true,
}: {
  size?: number
  active?: boolean
}) {
  return (
    <span
      className={`streak-flame ${active ? 'is-burning' : ''}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 48" fill="none">
        <path
          className="flame-outer"
          d="M22 3c2 12 13 16 13 28a15 15 0 0 1-30 0c0-6 3-12 7-16-1 6 1 8 3 10C21 19 15 12 22 3Z"
        />
        <path
          className="flame-core"
          d="M22 23c0 7 6 9 6 14a8 8 0 0 1-16 0c0-4 4-7 5-11 0 4 1 6 2 7 3-3 1-6 3-10Z"
        />
      </svg>
      <i />
      <i />
    </span>
  )
}
