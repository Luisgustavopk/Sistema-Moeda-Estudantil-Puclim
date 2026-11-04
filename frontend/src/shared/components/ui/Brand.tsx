import { useId } from 'react'
import { Crown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function Wave() {
  return (
    <g fill="currentColor">
      <rect x="2" y="12" width="5" height="12" rx="2.5" />
      <rect x="10" y="4" width="5" height="26" rx="2.5" />
      <rect x="18" y="9" width="5" height="16" rx="2.5" />
      <rect x="26" y="1" width="5" height="30" rx="2.5" />
      <rect x="34" y="10" width="4" height="14" rx="2" />
    </g>
  )
}
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={cn('brand', light && 'brand-light')}>
      <svg width="38" height="30" viewBox="0 0 40 32" aria-hidden="true">
        <Wave />
      </svg>
      <span>puclim</span>
    </span>
  )
}
export function Coin({
  size = 24,
  face = 'logo',
}: {
  size?: number
  face?: 'logo' | 'crown'
}) {
  const gradient = useId()
  const rim = useId()
  const compact = size <= 20
  const presentation = size >= 96
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      data-coin-face={face}
      data-coin-detail={
        compact ? 'compact' : size >= 96 ? 'presentation' : 'standard'
      }
    >
      <defs>
        <radialGradient id={gradient} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#F7DF91" />
          <stop offset=".65" stopColor="#DDB83D" />
          <stop offset="1" stopColor="#B88A1B" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFF0B2" />
          <stop offset=".45" stopColor="#D9AC31" />
          <stop offset="1" stopColor="#8E6513" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy={presentation ? 20 : 20.5}
        r={presentation ? 20 : 19}
        fill="#896211"
      />
      <circle
        cx="20"
        cy={presentation ? 20 : 19.5}
        r={presentation ? 20 : 18.5}
        fill={`url(#${rim})`}
      />
      <circle
        cx="20"
        cy={presentation ? 20 : 19.3}
        r={presentation ? 18.9 : compact ? 17 : 15.8}
        fill={`url(#${gradient})`}
        stroke="#986B16"
        strokeOpacity={presentation ? '.35' : compact ? '.65' : '.8'}
        strokeWidth={compact ? '.8' : '.7'}
      />
      {!compact && !presentation && (
        <path
          d="M5 20a15 15 0 0 1 25-11"
          fill="none"
          stroke="#FFF0AF"
          strokeWidth=".7"
          strokeLinecap="round"
          opacity=".8"
        />
      )}
      {face === 'logo' ? (
        <g transform="translate(9.5 10) scale(.52)" color="#674907">
          <Wave />
        </g>
      ) : (
        <Crown
          x={9}
          y={9}
          width={22}
          height={22}
          color="#6B4E08"
          fill="#6B4E08"
          strokeWidth={1.4}
        />
      )}
    </svg>
  )
}
