import { Download, FileSpreadsheet, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { instituicoesApi } from '../api/instituicoes.api'
import { parseTeachersCsv } from '../utils/parse-teachers'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import {
  ErrorNotice,
  QueryState,
  EmptyState,
} from '@/shared/components/ui/Feedback'
import { useAction } from '@/shared/hooks/use-action'
import { downloadText } from '@/shared/utils/format'
import type { ImportResult, ImportRow } from '@/shared/types/domain'
import { DATA_MODE } from '@/shared/lib/http'
const csvCell = (value: string) =>
  `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
export function TeachersPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const query = useQuery({
    queryKey: ['teachers', user?.id],
    queryFn: instituicoesApi.teachers,
  })
  const action = useAction(instituicoesApi.importTeachers)
  const validCount = rows.filter((row) => !row.error).length
  const report = () => {
    if (result)
      downloadText(
        'relatorio-importacao.csv',
        [
          'Linha;Resultado',
          ...result.errors.map(
            (error) => `${error.line};${csvCell(error.message)}`,
          ),
          ...result.access.map(
            (value) =>
              `;${csvCell(`Importado: ${value.name} · login ${value.login}`)}`,
          ),
        ].join('\r\n'),
      )
  }
  return (
    <>
      <PageHeading
        eyebrow="Quem reconhece também faz parte"
        title="Professores da instituição"
        description="Importe a lista de professores e prepare seus primeiros acessos."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              downloadText(
                'modelo-professores.csv',
                'nome;cpf;departamento;email;login\r\nProfessor Exemplo;39053344705;Engenharia de Software;professor.exemplo@exemplo.com;professor.exemplo\r\n',
              )
            }
          >
            <Download size={17} /> Baixar modelo CSV
          </Button>
        }
      />
      <section className="card">
        <div className="section-heading">
          <h2>Importar professores</h2>
          <FileSpreadsheet size={22} className="muted" />
        </div>
        <div className="upload-area">
          <Upload size={29} className="muted" />
          <strong>Selecione a lista da sua instituição.</strong>
          <p className="small muted">
            CSV com nome, CPF, departamento, e-mail e login · até 1 MB e 500
            professores.
          </p>
          <label className="sr-only" htmlFor="teacher-csv">
            Arquivo CSV de professores
          </label>
          <input
            id="teacher-csv"
            type="file"
            accept=".csv,text/csv"
            disabled={action.isPending}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              setResult(null)
              setRows([])
              setFileError('')
              action.reset()
              if (!file) return
              if (
                !file.name.toLowerCase().endsWith('.csv') ||
                file.size > 1024 * 1024
              ) {
                setFileError('Selecione um arquivo CSV de até 1 MB.')
                return
              }
              try {
                setRows(parseTeachersCsv(await file.text()))
                setFileName(file.name)
              } catch (error) {
                setFileError(
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível ler o arquivo.',
                )
              }
            }}
          />
        </div>
        <ErrorNotice error={fileError ? new Error(fileError) : null} />
        {rows.length > 0 && !result && (
          <>
            <div className="section-heading" style={{ marginTop: 25 }}>
              <div>
                <h3>Confira antes de importar</h3>
                <p className="small muted">
                  {fileName} · {validCount} linhas válidas,{' '}
                  {rows.length - validCount} com erros
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Professor</th>
                    <th>Departamento</th>
                    <th>Validação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.line}>
                      <td>{row.line}</td>
                      <td>
                        {row.name || 'Sem nome'}
                        <p className="small muted">{row.email}</p>
                      </td>
                      <td>{row.department}</td>
                      <td>
                        {row.error ? (
                          <span className="field-error">{row.error}</span>
                        ) : (
                          <span className="badge badge-success">
                            Pronto para importar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ErrorNotice error={action.error} />
            <div className="form-actions">
              <Button
                loading={action.isPending}
                disabled={!validCount}
                onClick={async () => {
                  try {
                    setResult(await action.mutateAsync(rows))
                  } catch {
                    /* O erro é exibido acima. */
                  }
                }}
              >
                <Upload size={17} /> Importar {validCount} professores válidos
              </Button>
            </div>
          </>
        )}
        {result && (
          <>
            <div className="notice notice-success" style={{ marginTop: 22 }}>
              <Users size={19} />
              <span>
                {result.created} professores importados. {result.errors.length}{' '}
                linhas não foram importadas.
              </span>
            </div>
            {result.access.length > 0 && (
              <>
                <h3 style={{ marginTop: 23 }}>Primeiros acessos</h3>
                <p className="small muted" style={{ margin: '7px 0 13px' }}>
                  {DATA_MODE === 'demo'
                    ? 'Entregue a credencial temporária ao professor. A troca de senha será exigida no primeiro acesso. As senhas abaixo não voltam a aparecer após sair desta página.'
                    : 'As instruções de primeiro acesso serão processadas pelo sistema para os professores.'}
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Professor</th>
                        <th>Login</th>
                        <th>Acesso inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.access.map((value) => (
                        <tr key={value.login}>
                          <td>{value.name}</td>
                          <td>{value.login}</td>
                          <td>
                            {value.temporaryPassword ? (
                              <code>{value.temporaryPassword}</code>
                            ) : (
                              'Instruções de acesso registradas'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {result.errors.length > 0 && (
              <div className="table-scroll" style={{ marginTop: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((error) => (
                      <tr key={error.line}>
                        <td>{error.line}</td>
                        <td className="field-error">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={report}>
                <Download size={17} /> Baixar relatório
              </Button>
            </div>
          </>
        )}
      </section>
      <section className="card" style={{ marginTop: 25 }}>
        <div className="section-heading">
          <h2>Equipe cadastrada</h2>
          <span className="badge">{query.data?.length || 0} professores</span>
        </div>
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={query.refetch}
        />
        {query.data?.length === 0 && (
          <EmptyState
            title="Sua equipe começa por aqui"
            description="Importe os professores para que eles possam acessar o Puclim."
          />
        )}
        {query.data?.map((teacher) => (
          <div className="row" key={teacher.id}>
            <Avatar name={teacher.name} />
            <div className="row-text">
              <strong>{teacher.name}</strong>
              <p>
                {teacher.department} · {teacher.email}
              </p>
            </div>
            <span className="badge">{teacher.login}</span>
          </div>
        ))}
      </section>
    </>
  )
}
