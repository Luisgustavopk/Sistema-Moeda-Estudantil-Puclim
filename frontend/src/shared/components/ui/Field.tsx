import { Eye, EyeOff } from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className = '',
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const isControl =
    isValidElement(children) &&
    (children.type === PasswordInput ||
      (typeof children.type === 'string' &&
        ['input', 'select', 'textarea'].includes(children.type)))
  const control = isControl
    ? cloneElement(
        children as ReactElement<{
          'aria-describedby'?: string
          'aria-invalid'?: boolean
        }>,
        { 'aria-describedby': descriptionId, 'aria-invalid': !!error },
      )
    : children
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="field-hint">
            {hint}
          </span>
        )
      )}
    </div>
  )
}
export function PasswordInput(props: ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
