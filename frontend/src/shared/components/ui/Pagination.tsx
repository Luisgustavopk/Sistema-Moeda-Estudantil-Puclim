import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  total,
  size,
  onChange,
  label = 'Paginação',
}: {
  page: number
  total: number
  size: number
  onChange: (page: number) => void
  label?: string
}) {
  const pages = Math.ceil(total / size)
  if (pages < 2) return null
  const numbers = [
    ...new Set([
      1,
      ...[page - 1, page, page + 1].filter((n) => n > 1 && n < pages),
      pages,
    ]),
  ].sort((a, b) => a - b)
  return (
    <nav className="numbered-pagination" aria-label={label}>
      <p className="small muted" aria-live="polite">
        {(page - 1) * size + 1}–{Math.min(page * size, total)} de {total}
      </p>
      <div>
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        {numbers.map((n, i) => (
          <span className="pagination-slot" key={n}>
            {i > 0 && n - numbers[i - 1] > 1 && (
              <span className="pagination-gap" aria-hidden="true">
                …
              </span>
            )}
            <button
              type="button"
              aria-label={`Página ${n}`}
              aria-current={page === n ? 'page' : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="Próxima página"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  )
}
