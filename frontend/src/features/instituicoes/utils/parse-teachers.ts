import type { ImportRow } from '@/shared/types/domain'
import { digits } from '@/shared/utils/format'
import { teacherImportSchema } from '../schemas/professor.schema'

export function parseTeachersCsv(source: string): ImportRow[] {
  const content = source.replace(/^\uFEFF/, '')
  const header = content.split(/\r?\n/, 1)[0] || ''
  const delimiter = header.includes(';') ? ';' : ','
  const rows: { cells: string[]; line: number }[] = []
  let cells: string[] = [],
    field = '',
    quoted = false,
    line = 1,
    startLine = 1
  const finishRow = () => {
    cells.push(field.trim())
    if (cells.some(Boolean)) rows.push({ cells, line: startLine })
    cells = []
    field = ''
    startLine = line + 1
  }
  for (let index = 0; index < content.length; index++) {
    const char = content[index]
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"'
        index++
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(field.trim())
      field = ''
    } else if (char === '\n') {
      if (quoted) field += '\n'
      else finishRow()
      line++
    } else if (char !== '\r') field += char
  }
  if (quoted)
    throw new Error(
      'O CSV contém aspas não fechadas. Confira o arquivo e tente novamente.',
    )
  if (field || cells.length) finishRow()
  if (rows.length < 2)
    throw new Error(
      'Adicione o cabeçalho e pelo menos um professor ao arquivo.',
    )
  if (rows.length > 501)
    throw new Error('Importe até 500 professores por arquivo.')
  const headings = rows[0].cells.map((value) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  )
  const required = ['nome', 'cpf', 'departamento', 'email', 'login']
  if (!required.every((value) => headings.includes(value)))
    throw new Error(
      'O cabeçalho precisa conter: nome, cpf, departamento, email e login.',
    )
  const seenCpf = new Set<string>(),
    seenEmail = new Set<string>(),
    seenLogin = new Set<string>()
  return rows.slice(1).map((row) => {
    const get = (column: string) => row.cells[headings.indexOf(column)] || ''
    const value = {
      line: row.line,
      name: get('nome'),
      cpf: digits(get('cpf')),
      department: get('departamento'),
      email: get('email').toLowerCase(),
      login: get('login').toLowerCase(),
    }
    const parsed = teacherImportSchema.safeParse(value)
    let error = parsed.success
      ? undefined
      : parsed.error.issues.map((issue) => issue.message).join(' ')
    if (row.cells.length !== headings.length)
      error = 'Número de colunas diferente do cabeçalho.'
    if (
      !error &&
      (seenCpf.has(value.cpf) ||
        seenEmail.has(value.email) ||
        seenLogin.has(value.login))
    )
      error = 'CPF, e-mail ou login repetido neste arquivo.'
    if (!error) {
      seenCpf.add(value.cpf)
      seenEmail.add(value.email)
      seenLogin.add(value.login)
    }
    return { ...value, error }
  })
}
