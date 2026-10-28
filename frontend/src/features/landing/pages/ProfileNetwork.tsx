import { Brand } from '@/shared/components/ui/Brand'

export function ProfileNetwork({ active }: { active: number }) {
  return (
    <div className="lp-profile-network" aria-hidden="true" data-story>
      <svg
        viewBox="0 0 600 380"
        preserveAspectRatio="none"
        className="lp-network-paths"
      >
        {[
          'M110 70 Q300 70 300 190',
          'M490 70 Q300 70 300 190',
          'M110 310 Q300 310 300 190',
          'M490 310 Q300 310 300 190',
        ].map((path, index) => (
          <g key={path} data-active={active === index}>
            <path d={path} />
          </g>
        ))}
      </svg>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className="lp-network-packet" />
      ))}
      <div className="lp-network-core">
        <Brand />
        <span>Reconhecimento que circula.</span>
      </div>
    </div>
  )
}
