type Point = readonly [number, number]

// Uneven, authored leaders and finer forks avoid the regular sawtooth outline
// of a noisy circle. Each leader narrows to a point at both ends.
function discharge(points: readonly Point[], width: number, branches: string) {
  const outline = (side: number) =>
    points.map(([x, y], i) => {
      const previous = points[Math.max(0, i - 1)]
      const next = points[Math.min(points.length - 1, i + 1)]
      const dx = next[0] - previous[0]
      const dy = next[1] - previous[1]
      const length = Math.hypot(dx, dy)
      const taper = Math.sin((i / (points.length - 1)) * Math.PI) ** 0.65
      const half = (width * taper) / 2
      return `${(x - (dy / length) * half * side).toFixed(2)} ${(y + (dx / length) * half * side).toFixed(2)}`
    })
  const left = outline(1)
  const right = outline(-1).reverse()
  return {
    line: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '),
    ribbon: `M${left.join(' L')} L${right.join(' L')}Z`,
    branches,
  }
}

const bolts = [
  discharge(
    [
      [18, 72],
      [22, 62],
      [20, 58],
      [29, 51],
      [31, 42],
      [39, 39],
      [43, 29],
      [52, 27],
      [57, 22],
      [68, 23],
      [73, 19],
    ],
    1.5,
    'M29 51 24 44 28 38 26 33M43 29 42 22 48 18 50 13M57 22 58 16 64 14',
  ),
  discharge(
    [
      [91, 16],
      [102, 21],
      [110, 20],
      [116, 29],
      [125, 31],
      [128, 40],
      [136, 45],
      [134, 54],
      [142, 64],
      [141, 70],
    ],
    1.25,
    'M116 29 119 23 128 24 133 20M128 40 136 36 140 39 147 37M134 54 143 51 148 57',
  ),
  discharge(
    [
      [145, 84],
      [146, 94],
      [140, 99],
      [141, 108],
      [131, 113],
      [130, 123],
      [120, 126],
      [116, 133],
      [105, 135],
      [99, 142],
    ],
    1.6,
    'M141 108 148 111 150 120M130 123 134 131 130 137 133 142M116 133 117 142 110 147',
  ),
  discharge(
    [
      [81, 145],
      [70, 140],
      [64, 143],
      [56, 135],
      [48, 136],
      [44, 127],
      [34, 125],
      [32, 115],
      [23, 108],
      [24, 99],
      [17, 91],
    ],
    1.35,
    'M56 135 51 143 45 142 40 148M34 125 26 127 22 122 16 123M24 99 16 101 12 96',
  ),
  discharge(
    [
      [31, 65],
      [25, 72],
      [27, 77],
      [21, 84],
      [24, 89],
    ],
    0.7,
    'M25 72 17 75 15 81',
  ),
  discharge(
    [
      [101, 33],
      [110, 35],
      [113, 42],
      [120, 45],
      [123, 52],
    ],
    0.7,
    'M113 42 117 37 123 38',
  ),
]

export function LightningFrameArtwork({ id }: { id: string }) {
  return (
    <span className="frame-elemental frame-lightning" aria-hidden="true">
      <svg viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient
            id={`${id}-steel`}
            x1="26"
            y1="12"
            x2="134"
            y2="148"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#07285f" />
            <stop offset=".18" stopColor="#1175cf" />
            <stop offset=".26" stopColor="#b0f4ff" />
            <stop offset=".32" stopColor="#0865bf" />
            <stop offset=".48" stopColor="#03163e" />
            <stop offset=".65" stopColor="#1468c0" />
            <stop offset=".74" stopColor="#74dfff" />
            <stop offset=".82" stopColor="#124da0" />
            <stop offset="1" stopColor="#020e2d" />
          </linearGradient>
          <linearGradient
            id={`${id}-edge`}
            x1="22"
            y1="32"
            x2="134"
            y2="126"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#defcff" />
            <stop offset=".28" stopColor="#158de8" />
            <stop offset=".48" stopColor="#063979" />
            <stop offset=".68" stopColor="#bcf7ff" />
            <stop offset="1" stopColor="#088bdf" />
          </linearGradient>
          <linearGradient
            id={`${id}-crystal`}
            x1="73"
            y1="10"
            x2="86"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#edffff" />
            <stop offset=".46" stopColor="#4af9ff" />
            <stop offset="1" stopColor="#0098ff" />
          </linearGradient>
          <radialGradient id={`${id}-aura`}>
            <stop offset=".59" stopColor="#007bff" stopOpacity="0" />
            <stop offset=".79" stopColor="#008bff" stopOpacity=".22" />
            <stop offset="1" stopColor="#009dff" stopOpacity="0" />
          </radialGradient>
          <filter
            id={`${id}-energy-glow`}
            x="0"
            y="0"
            width="160"
            height="160"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation=".65" />
          </filter>
          <mask
            id={`${id}-photo`}
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
        <g mask={`url(#${id}-photo)`}>
          <circle cx="80" cy="80" r="79" fill={`url(#${id}-aura)`} />
          <circle cx="80" cy="80" r="57" stroke="#052454" strokeWidth="16" />
          <circle
            cx="80"
            cy="80"
            r="57"
            stroke={`url(#${id}-steel)`}
            strokeWidth="13"
          />
          <circle
            cx="80"
            cy="80"
            r="63.2"
            stroke={`url(#${id}-edge)`}
            strokeWidth=".9"
          />
          <circle cx="80" cy="80" r="59.5" stroke="#031b51" strokeWidth="1.4" />
          <circle
            cx="80"
            cy="80"
            r="58.2"
            stroke={`url(#${id}-edge)`}
            strokeWidth=".8"
          />
          <circle cx="80" cy="80" r="53.4" stroke="#082566" strokeWidth="1.6" />
          <circle cx="80" cy="80" r="51" stroke="#009fff" strokeWidth="3.6" />
          <circle cx="80" cy="80" r="49.5" stroke="#8cfaff" strokeWidth="1.6" />
          <circle cx="80" cy="80" r="49.1" stroke="#f0ffff" strokeWidth=".55" />
          <g
            className="frame-electric-ring frame-motion-layer"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g className="frame-electric-charge frame-motion-layer">
              {bolts.map((bolt, i) => (
                <g key={i}>
                  <path
                    d={bolt.line}
                    stroke="#04cfff"
                    strokeWidth="3"
                    strokeOpacity=".55"
                    filter={`url(#${id}-energy-glow)`}
                  />
                  <path
                    d={bolt.branches}
                    stroke="#36deff"
                    strokeWidth=".9"
                    strokeOpacity=".45"
                  />
                  <path
                    d={bolt.branches}
                    stroke="#d3ffff"
                    strokeWidth=".35"
                    strokeOpacity=".8"
                  />
                  <path d={bolt.ribbon} fill="#3af5ff" />
                  <path d={bolt.line} stroke="#f1ffff" strokeWidth=".4" />
                </g>
              ))}
            </g>
          </g>
          <g className="frame-lightning-mounts">
            {[0, 90, 180, 270].map((rotation) => (
              <g
                key={rotation}
                className="frame-lightning-crystal"
                transform={`rotate(${rotation} 80 80)`}
              >
                <path
                  d="M80 4C73 23 68 29 43 33C62 35 72 32 80 46C88 32 98 35 117 33C92 29 87 23 80 4Z"
                  fill={`url(#${id}-steel)`}
                  stroke={`url(#${id}-edge)`}
                  strokeWidth=".8"
                />
                <path
                  d="M80 5C75 24 68 32 50 33M80 5C85 24 92 32 110 33"
                  stroke="#8beaff"
                  strokeWidth=".65"
                />
                <path
                  d="m80 11-12 14 12 16 12-16Z"
                  fill="#032366"
                  stroke="#198cff"
                  strokeWidth="1.1"
                />
                <path
                  d="m80 9-8 15 8 10 8-10Z"
                  fill={`url(#${id}-crystal)`}
                  stroke="#d7ffff"
                  strokeWidth=".7"
                />
                <path d="m80 10-3 14 3 9Z" fill="#e9ffff" />
                <path d="m80 10 8 14-8 1Z" fill="#80ffff" />
                <path d="m80 25 8-1-8 9Z" fill="#0098ea" />
                <path d="m72 24 8 1 8-1" stroke="#f0ffff" strokeWidth=".65" />
              </g>
            ))}
          </g>
          <g
            className="frame-electric-sparks frame-motion-layer"
            fill="#b7ffff"
          >
            <circle cx="28" cy="34" r=".8" />
            <circle cx="121" cy="17" r=".9" />
            <circle cx="146" cy="106" r=".8" />
            <circle cx="37" cy="140" r=".9" />
            <circle cx="14" cy="63" r=".6" />
            <circle cx="104" cy="149" r=".6" />
          </g>
        </g>
      </svg>
    </span>
  )
}
