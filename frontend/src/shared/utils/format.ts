export const number = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value)
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(value),
  )
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
export const digits = (value: string) => value.replace(/\D/g, '')
export function validCpf(value: string) {
  const cpf = digits(value)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false
  for (let length = 9; length < 11; length++) {
    const sum = [...cpf.slice(0, length)].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    )
    const check = ((sum * 10) % 11) % 10
    if (check !== Number(cpf[length])) return false
  }
  return true
}
export function validCnpj(value: string) {
  const cnpj = digits(value)
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false
  for (let length = 12; length <= 13; length++) {
    let weight = length - 7
    const sum = [...cnpj.slice(0, length)].reduce((total, digit) => {
      const part = Number(digit) * weight
      weight = weight === 2 ? 9 : weight - 1
      return total + part
    }, 0)
    const remainder = sum % 11
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(cnpj[length]))
      return false
  }
  return true
}
export function downloadText(
  filename: string,
  content: string,
  type = 'text/csv;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
