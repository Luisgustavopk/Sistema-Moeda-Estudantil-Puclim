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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      data-coin-face={face}
    >
      <defs>
        <radialGradient id={gradient} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#F3D77A" />
          <stop offset=".6" stopColor="#D1A21C" />
          <stop offset="1" stopColor="#9A7410" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${gradient})`} />
      <circle
        cx="20"
        cy="20"
        r="15.5"
        fill="none"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="1"
        strokeDasharray={face === 'logo' ? '2 2' : '0.5 1.5'}
      />
      {face === 'logo' ? (
        <g transform="translate(9.5 10.5) scale(.52)" color="#6B4E08">
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
