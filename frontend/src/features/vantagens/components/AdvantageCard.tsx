import type { Advantage } from '@/shared/types/domain'
import { Coin } from '@/shared/components/ui/Brand'
import { Button } from '@/shared/components/ui/Button'
import { number } from '@/shared/utils/format'
export function AdvantagePhoto({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith('/images/fallback.svg'))
          event.currentTarget.src = '/images/fallback.svg'
      }}
    />
  )
}
export function AdvantageCard({
  advantage,
  balance,
  onSelect,
}: {
  advantage: Advantage
  balance: number
  onSelect: (advantage: Advantage) => void
}) {
  return (
    <article className="card offer-card">
      <div className="offer-image">
        <AdvantagePhoto src={advantage.photo} alt={advantage.name} />
      </div>
      <div className="offer-body">
        <span className="badge">{advantage.category}</span>
        <h3>{advantage.name}</h3>
        <span className="company-name">{advantage.companyName}</span>
        <p>{advantage.description}</p>
        <div className="offer-bottom">
          <span className="price">
            <Coin size={21} />
            {number(advantage.cost)} <span className="sr-only">Pucoins</span>
          </span>
          <Button onClick={() => onSelect(advantage)}>Ver detalhes</Button>
        </div>
        {balance < advantage.cost && (
          <span className="small muted" style={{ marginTop: 12 }}>
            Faltam {number(advantage.cost - balance)} Pucoins para resgatar.
          </span>
        )}
      </div>
    </article>
  )
}
