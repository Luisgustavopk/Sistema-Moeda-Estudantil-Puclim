import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
export function Button({
  children,
  className,
  variant = 'primary',
  loading,
  disabled,
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={cn('button', `button-${variant}`, className)}
      aria-busy={loading || undefined}
    >
      {loading && <LoaderCircle size={18} className="spin" />}
      {children}
    </button>
  )
}
