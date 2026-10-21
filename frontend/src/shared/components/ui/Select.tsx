import {
  Children,
  isValidElement,
  useCallback,
  useState,
  type ReactNode,
  type Ref,
  type ButtonHTMLAttributes,
} from 'react'
import * as Primitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

type SelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'type'
> & {
  required?: boolean
  value?: string | number
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}
const EMPTY = '__puclim_empty_option__'
export function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  id,
  name,
  disabled,
  className = '',
  ref,
  onBlur,
  required,
  ...attributes
}: SelectProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()
  const attach = useCallback(
    (node: HTMLButtonElement | null) => {
      if (node) setPortalContainer(node.closest('dialog') ?? undefined)
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const [local, setLocal] = useState(defaultValue ?? '')
  const options = Children.toArray(children).filter(
    isValidElement<{
      value?: string | number
      disabled?: boolean
      children: ReactNode
    }>,
  )
  const selected = String(value ?? local)
  return (
    <Primitive.Root
      value={selected || EMPTY}
      disabled={disabled}
      required={required}
      onValueChange={(next) => {
        const result = next === EMPTY ? '' : next
        setLocal(result)
        onValueChange?.(result)
      }}
    >
      <Primitive.Trigger
        {...attributes}
        id={id}
        className={`styled-select ${className}`}
        onBlur={onBlur}
        ref={attach}
      >
        <Primitive.Value />
        <Primitive.Icon>
          <ChevronDown size={18} />
        </Primitive.Icon>
      </Primitive.Trigger>
      {name && (
        <input type="hidden" name={name} value={selected} disabled={disabled} />
      )}
      <Primitive.Portal container={portalContainer}>
        <Primitive.Content
          className="select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Primitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={16} />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className="select-viewport">
            {options.map((option, index) => (
              <Primitive.Item
                className="select-option"
                value={String(option.props.value ?? '') || EMPTY}
                disabled={option.props.disabled}
                data-value={String(option.props.value ?? '')}
                key={String(option.props.value ?? index)}
              >
                <Primitive.ItemText>{option.props.children}</Primitive.ItemText>
                <Primitive.ItemIndicator>
                  <Check size={17} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={16} />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
export function FormSelect<T extends FieldValues>({
  control,
  name,
  ...props
}: Omit<SelectProps, 'name' | 'value' | 'onValueChange' | 'ref'> & {
  control: Control<T>
  name: FieldPath<T>
}) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Select
      {...props}
      name={field.name}
      value={field.value ?? ''}
      ref={(node) => field.ref(node)}
      onBlur={field.onBlur}
      onValueChange={(value) =>
        field.onChange(typeof field.value === 'number' ? Number(value) : value)
      }
      aria-invalid={fieldState.invalid || undefined}
    />
  )
}
