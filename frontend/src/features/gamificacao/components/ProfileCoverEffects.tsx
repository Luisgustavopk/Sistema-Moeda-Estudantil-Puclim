import type { RewardVisual } from '../profile-rewards'

const stars = [
  [4, 28],
  [12, 68],
  [19, 19],
  [27, 48],
  [35, 78],
  [42, 24],
  [49, 58],
  [57, 14],
  [63, 79],
  [69, 38],
  [76, 65],
  [83, 18],
  [90, 48],
  [96, 83],
]

export function ProfileCoverEffects({
  motion,
}: {
  motion: RewardVisual['bannerMotion']
}) {
  return (
    <span className="cover-scene" aria-hidden="true">
      {motion === 'AURORA' && (
        <>
          <span className="cover-aurora-band" />
          <span className="cover-aurora-band cover-aurora-band-far" />
          <span className="cover-aurora-horizon" />
        </>
      )}
      {motion === 'METEORS' && (
        <>
          <span className="cover-stars">
            {stars.map(([left, top]) => (
              <span
                key={`${left}-${top}`}
                className="cover-star"
                style={{ left: `${left}%`, top: `${top}%` }}
              />
            ))}
          </span>
          <span className="cover-meteor" />
          <span className="cover-meteor" />
          <span className="cover-meteor" />
        </>
      )}
      {motion === 'WAVES' &&
        [0, 1].map((layer) => (
          <span key={layer} className={`cover-wave cover-wave-${layer}`}>
            <svg
              viewBox="0 0 1200 160"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0 72C100 0 200 0 300 72S500 144 600 72S800 0 900 72S1100 144 1200 72V160H0Z" />
            </svg>
          </span>
        ))}
    </span>
  )
}
