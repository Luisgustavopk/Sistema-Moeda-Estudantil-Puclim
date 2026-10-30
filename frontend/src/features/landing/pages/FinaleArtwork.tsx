import { Award, GraduationCap, Users } from 'lucide-react'
import { Wave } from '@/shared/components/ui/Brand'
import './finale-artwork.css'

const milestones = [
  {
    name: 'Aprender',
    detail: 'Novos conhecimentos',
    className: 'learn',
    Icon: GraduationCap,
  },
  {
    name: 'Conquistar',
    detail: 'Reconhecimento real',
    className: 'achieve',
    Icon: Award,
  },
  {
    name: 'Compartilhar',
    detail: 'Mais oportunidades',
    className: 'share',
    Icon: Users,
  },
] as const

/** A closing illustration, rather than another product control or hero mark. */
export function FinaleArtwork() {
  return (
    <div
      className="lp-final-emblem lp-finale"
      data-story
      role="img"
      aria-label="Aprender. Conquistar. Compartilhar. O reconhecimento conecta conhecimentos e novas oportunidades."
    >
      <div className="lp-finale-scene" aria-hidden="true">
        <svg
          className="lp-finale-routes"
          viewBox="0 0 520 440"
          preserveAspectRatio="none"
        >
          <ellipse
            className="lp-finale-horizon"
            cx="260"
            cy="220"
            rx="250"
            ry="176"
            transform="rotate(-26 260 220)"
          />
          <path
            className="lp-finale-connection"
            d="M 100 102 C 245 30 490 75 484 226 S 406 405 340 384"
          />
          <g transform="translate(260 228) rotate(-23) scale(1 .46)">
            <circle className="lp-finale-route" r="238" />
            <g className="lp-finale-tracer">
              <g transform="translate(238 0)">
                <g className="lp-finale-countertracer">
                  <ellipse className="lp-finale-light" rx="3.5" ry="7.5" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(260 228) rotate(-49) scale(1 .64)">
            <circle
              className="lp-finale-route lp-finale-route-secondary"
              r="190"
            />
            <g className="lp-finale-tracer lp-finale-tracer-secondary">
              <g transform="translate(190 0)">
                <g className="lp-finale-countertracer lp-finale-countertracer-secondary">
                  <ellipse className="lp-finale-light" rx="2.5" ry="3.9" />
                </g>
              </g>
            </g>
          </g>
          <circle className="lp-finale-junction" cx="100" cy="102" r="4" />
          <circle className="lp-finale-junction" cx="458" cy="178" r="4" />
          <circle className="lp-finale-junction" cx="340" cy="384" r="4" />
        </svg>

        <div className="lp-finale-medallion" data-reveal>
          <div className="lp-finale-coin-hover">
            <div className="lp-finale-coin-drift">
              <div className="lp-finale-coin">
                <div className="lp-finale-coin-face">
                  <svg width="80" height="64" viewBox="0 0 40 32">
                    <g
                      className="lp-finale-engraving-edge"
                      transform="translate(0 .4)"
                    >
                      <Wave />
                    </g>
                    <Wave />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {milestones.map(({ name, detail, className, Icon }) => (
          <div
            className={`lp-finale-milestone lp-finale-${className}`}
            key={name}
            data-reveal
          >
            <div className="lp-finale-plate">
              <Icon size={28} strokeWidth={1.5} />
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
