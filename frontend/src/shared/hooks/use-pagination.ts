import { useState } from 'react'

export function usePagination<T>(items: T[], size: number) {
  const [requested, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const page = Math.min(requested, pages)
  return {
    page,
    pages,
    setPage,
    items: items.slice((page - 1) * size, page * size),
  }
}
