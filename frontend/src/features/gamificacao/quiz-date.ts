export function quizDate(
  day: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' },
) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR', {
    ...options,
    timeZone: 'UTC',
  })
}
