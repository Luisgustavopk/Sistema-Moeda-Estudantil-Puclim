import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import './date-input.css'

type Props = Omit<ComponentProps<'input'>, 'type'> & {
  type?: 'date' | 'datetime-local'
  label: string
}
const keyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Native input and validation, with a themed calendar in the browser's top layer. */
export const DateInput = forwardRef<HTMLInputElement, Props>(function DateInput(
  { type = 'date', label, disabled, min, max, ...props },
  ref,
) {
  const input = useRef<HTMLInputElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date())
  const [today, setToday] = useState(() => keyOf(new Date()))
  const [selected, setSelected] = useState('')
  const [cursor, setCursor] = useState('')
  useImperativeHandle(ref, () => input.current!, [])
  useEffect(() => {
    if (!open) return
    const position = () => {
      const bounds = trigger.current!.getBoundingClientRect()
      const node = popup.current!
      const width = Math.min(336, innerWidth - 32)
      node.style.width = `${width}px`
      node.style.left = `${Math.max(16, Math.min(bounds.right - width, innerWidth - width - 16))}px`
      const height = node.getBoundingClientRect().height
      node.style.top = `${Math.max(12, bounds.bottom + height + 8 <= innerHeight ? bounds.bottom + 8 : bounds.top - height - 8)}px`
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, month])
  useEffect(() => {
    if (open && cursor)
      popup.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)
        ?.focus()
  }, [cursor, open])
  const select = (day: string) => {
    const node = input.current!
    const value =
      type === 'datetime-local'
        ? `${day}T${node.value.split('T')[1] || '12:00'}`
        : day
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(node, value)
    node.dispatchEvent(new Event('input', { bubbles: true }))
    node.dispatchEvent(new Event('change', { bubbles: true }))
    popup.current?.hidePopover()
    input.current?.focus()
  }
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset =
    (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const allowed = (key: string) =>
    (!min || key >= String(min).slice(0, 10)) &&
    (!max || key <= String(max).slice(0, 10))
  const cursorInMonth = cursor.startsWith(
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`,
  )
  const firstEnabled = Array.from(
    { length: count },
    (_, index) => index + 1,
  ).find((day) =>
    allowed(keyOf(new Date(month.getFullYear(), month.getMonth(), day))),
  )
  const moveMonth = (amount: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1))
  return (
    <div className="date-input">
      <input
        {...props}
        ref={input}
        type={type}
        min={min}
        max={max}
        disabled={disabled}
      />
      <button
        ref={trigger}
        type="button"
        className="date-trigger"
        disabled={disabled}
        aria-label={`Abrir calendário: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        popoverTarget={id}
        onClick={() => {
          if (open) return
          setToday(keyOf(new Date()))
          const value = input.current?.value.slice(0, 10) || ''
          const date = value ? new Date(`${value}T12:00:00`) : new Date()
          setSelected(value)
          setMonth(date)
          setCursor(allowed(keyOf(date)) ? keyOf(date) : '')
        }}
      >
        <CalendarDays size={19} aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`Calendário: ${label}`}
        className="date-calendar"
        onToggle={(event) => {
          const next = event.newState === 'open'
          setOpen(next)
          if (!next && popup.current?.contains(document.activeElement))
            trigger.current?.focus()
        }}
      >
        <div className="calendar-heading">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <strong aria-live="polite">
            {month.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </strong>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => moveMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <table
          className="calendar-grid"
          aria-label={month.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
          })}
        >
          <thead>
            <tr>
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <th scope="col" key={day}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(
              { length: Math.ceil((count + offset) / 7) },
              (_, week) => (
                <tr key={week}>
                  {Array.from({ length: 7 }, (_, weekday) => {
                    const number = week * 7 + weekday - offset + 1
                    if (number < 1 || number > count)
                      return <td key={weekday} />
                    const date = new Date(
                      month.getFullYear(),
                      month.getMonth(),
                      number,
                    )
                    const key = keyOf(date)
                    return (
                      <td key={weekday}>
                        <button
                          type="button"
                          data-day={key}
                          aria-label={date.toLocaleDateString('pt-BR', {
                            dateStyle: 'full',
                          })}
                          aria-pressed={selected === key}
                          aria-current={today === key ? 'date' : undefined}
                          disabled={!allowed(key)}
                          tabIndex={
                            key === cursor ||
                            (!cursorInMonth && number === firstEnabled)
                              ? 0
                              : -1
                          }
                          onClick={() => select(key)}
                          onKeyDown={(event) => {
                            const shifts: Record<string, number> = {
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                              Home: -weekday,
                              End: 6 - weekday,
                            }
                            if (
                              !(event.key in shifts) &&
                              !['PageUp', 'PageDown'].includes(event.key)
                            )
                              return
                            event.preventDefault()
                            const next = new Date(date)
                            if (
                              event.key === 'PageUp' ||
                              event.key === 'PageDown'
                            ) {
                              next.setDate(1)
                              next.setMonth(
                                next.getMonth() +
                                  (event.key === 'PageUp' ? -1 : 1),
                              )
                              next.setDate(
                                Math.min(
                                  number,
                                  new Date(
                                    next.getFullYear(),
                                    next.getMonth() + 1,
                                    0,
                                  ).getDate(),
                                ),
                              )
                            } else next.setDate(number + shifts[event.key])
                            if (allowed(keyOf(next))) {
                              setMonth(next)
                              setCursor(keyOf(next))
                            }
                          }}
                        >
                          {number}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
        <div className="calendar-footer">
          <button
            type="button"
            disabled={!allowed(today)}
            onClick={() => select(today)}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => {
              popup.current?.hidePopover()
              trigger.current?.focus()
            }}
          >
            Fechar
          </button>
        </div>
        {type === 'datetime-local' && (
          <p className="calendar-hint">
            Ajuste o horário no campo após escolher a data.
          </p>
        )}
      </div>
    </div>
  )
})
