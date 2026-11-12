import { useId } from 'react'
import type { RewardVisual } from '../profile-rewards'
import { LightningFrameArtwork } from './LightningFrameArtwork'

function point(angle: number, radius: number) {
  return `${(80 + Math.cos(angle) * radius).toFixed(2)} ${(80 + Math.sin(angle) * radius).toFixed(2)}`
}

const accretionStreams = Array.from({ length: 6 }, (_, band) =>
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 39
    return `${i ? 'L' : 'M'} ${point((band * Math.PI) / 3 + t * Math.PI * 1.25, 72 - t * 19)}`
  }).join(' '),
)

export function ProfileFrameEffects({
  motion,
}: {
  motion: RewardVisual['motion']
}) {
  const id = useId().replaceAll(':', '')
  if (motion === 'ORBIT')
    return (
      <span className="frame-orbit" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none">
          <circle
            cx="50"
            cy="50"
            r="47"
            stroke="currentColor"
            strokeOpacity=".24"
            strokeWidth=".8"
          />
          <path
            d="M 50 3 A 47 47 0 0 1 96 41 M 50 97 A 47 47 0 0 1 4 59"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            stroke="currentColor"
            strokeWidth=".6"
            strokeDasharray="1 11"
          />
          <circle cx="50" cy="3" r="5" fill="currentColor" fillOpacity=".18" />
          <circle cx="50" cy="3" r="2.4" fill="currentColor" />
          <circle
            cx="50"
            cy="97"
            r="3.5"
            fill="currentColor"
            fillOpacity=".18"
          />
          <circle cx="50" cy="97" r="1.6" fill="currentColor" />
          <path
            d="m 96 45 1.2 3.8 3.8 1.2-3.8 1.2L 96 55l-1.2-3.8L 91 50l3.8-1.2Z"
            fill="currentColor"
          />
        </svg>
      </span>
    )
  if (motion === 'CROWN')
    return (
      <span className="frame-crown" aria-hidden="true">
        <svg viewBox="0 0 64 48" fill="none">
          <defs>
            <linearGradient
              id={`${id}-crown`}
              x1="12"
              y1="8"
              x2="52"
              y2="42"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff2c2" />
              <stop offset=".32" stopColor="currentColor" />
              <stop offset=".58" stopColor="#fff0b7" />
              <stop offset="1" stopColor="currentColor" />
            </linearGradient>
          </defs>
          <path
            d="m 9 16 12 9L 32 7l11 18 12-9-6 22H 15Z"
            fill={`url(#${id}-crown)`}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m 16 34 33 0M 21 25l2 8m20-8-2 8"
            stroke="#835725"
            strokeOpacity=".5"
            strokeWidth="1.5"
          />
          <path
            d="M 16 39h32l-2 5H 18Z"
            fill={`url(#${id}-crown)`}
            stroke="currentColor"
          />
          <path d="m 32 24 3 5-3 5-3-5Z" fill="#0f4c5c" stroke="#fff2c2" />
          <g fill="#fff2c2" stroke="currentColor" strokeWidth="1.2">
            <circle cx="9" cy="14" r="2.5" />
            <circle cx="32" cy="5" r="3" />
            <circle cx="55" cy="14" r="2.5" />
          </g>
          <path
            className="frame-crown-glint frame-motion-layer"
            d="m 51 2 1.2 3.8L 56 7l-3.8 1.2L 51 12l-1.2-3.8L 46 7l3.8-1.2Z"
            fill="#fff2c2"
          />
        </svg>
      </span>
    )
  if (motion === 'SHIMMER')
    return (
      <span className="frame-shimmer" aria-hidden="true">
        <span />
      </span>
    )
  if (motion === 'LIGHTNING') return <LightningFrameArtwork id={id} />
  if (motion === 'BLACK_HOLE')
    return (
      <span className="frame-elemental frame-black-hole" aria-hidden="true">
        <svg viewBox="0 0 160 160" fill="none">
          <defs>
            <linearGradient
              id={`${id}-disk`}
              x1="18"
              y1="112"
              x2="142"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ffb33b" />
              <stop offset=".3" stopColor="#ff572b" />
              <stop offset=".62" stopColor="#bd4df2" />
              <stop offset="1" stopColor="#52d7ff" />
            </linearGradient>
            <linearGradient
              id={`${id}-horizon`}
              x1="50"
              y1="28"
              x2="115"
              y2="133"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ffedd0" />
              <stop offset=".24" stopColor="#ffbc42" />
              <stop offset=".6" stopColor="#ff6637" />
              <stop offset="1" stopColor="#dc64ff" />
            </linearGradient>
            <mask
              id={`${id}-aperture`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="160"
              height="160"
            >
              <rect width="160" height="160" fill="white" />
              <circle cx="80" cy="80" r="48" fill="black" />
            </mask>
          </defs>
          <g mask={`url(#${id}-aperture)`}>
            <circle cx="80" cy="80" r="51" stroke="#090c23" strokeWidth="15" />
            <circle
              cx="80"
              cy="80"
              r="55"
              stroke={`url(#${id}-disk)`}
              strokeWidth="12"
              strokeOpacity=".12"
            />
            <g
              className="frame-accretion-flow frame-motion-layer"
              stroke={`url(#${id}-disk)`}
            >
              {accretionStreams.map((path, i) => (
                <g key={i}>
                  <path d={path} strokeWidth="7" strokeOpacity=".08" />
                  <path
                    d={path}
                    strokeWidth={i % 2 ? 1 : 2.4}
                    strokeOpacity=".65"
                    strokeLinecap="round"
                  />
                </g>
              ))}
              <circle
                cx="80"
                cy="80"
                r="59"
                strokeWidth="4"
                strokeDasharray="75 32 24 18"
                strokeOpacity=".55"
              />
              <circle
                cx="80"
                cy="80"
                r="64"
                strokeWidth=".9"
                strokeDasharray="35 18 2 27"
                strokeOpacity=".7"
              />
              <path
                d="M 14 80c0-42 36-64 66-64m66 64c0 42-36 64-66 64"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
            <g transform="rotate(-22 80 80)" stroke={`url(#${id}-disk)`}>
              <ellipse
                cx="80"
                cy="80"
                rx="76"
                ry="22"
                strokeWidth="9"
                strokeOpacity=".12"
              />
              <ellipse cx="80" cy="80" rx="76" ry="22" strokeWidth="2.4" />
              <ellipse
                cx="80"
                cy="80"
                rx="70"
                ry="17"
                strokeWidth=".8"
                strokeOpacity=".8"
              />
            </g>
            <circle
              cx="80"
              cy="80"
              r="50"
              stroke={`url(#${id}-horizon)`}
              strokeWidth="7"
              strokeOpacity=".3"
            />
            <circle
              cx="80"
              cy="80"
              r="50"
              stroke={`url(#${id}-horizon)`}
              strokeWidth="3.6"
            />
            <circle
              cx="80"
              cy="80"
              r="48.4"
              stroke="#fff0d5"
              strokeWidth=".7"
              strokeOpacity=".8"
            />
            <g
              className="frame-accretion-dust frame-motion-layer"
              fill="#ecdcff"
            >
              <circle cx="35" cy="30" r="1" />
              <circle cx="135" cy="108" r="1.4" />
              <circle cx="117" cy="26" r="1.2" />
              <circle cx="40" cy="132" r="1.2" />
              <circle cx="20" cy="103" r=".7" />
              <circle cx="140" cy="54" r=".7" />
            </g>
          </g>
        </svg>
      </span>
    )
  return null
}
