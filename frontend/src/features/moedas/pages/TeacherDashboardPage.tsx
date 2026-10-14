import { ArrowRight, Send, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { moedasApi } from '../api/moedas.api'
import { TransactionList } from '../components/TransactionList'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Coin } from '@/shared/components/ui/Brand'
import { QueryState } from '@/shared/components/ui/Feedback'
import { number } from '@/shared/utils/format'

export function TeacherDashboardPage() {
  const { user } = useAuth()
  const transactions = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: moedasApi.transactions,
  })
  const sent =
    transactions.data?.filter((value) => value.kind === 'ENVIO') || []
  const total = sent.reduce((sum, value) => sum - value.amount, 0)
  const recipients = new Set(sent.map((value) => value.counterpart)).size
  return (
    <>
      <PageHeading
        title={`Olá, ${user?.name.split(' ')[0]}!`}
        description={`${user?.name} · ${user?.department || 'Professor'}`}
        action={
          <Link to="/professor/enviar" className="button button-primary">
            <Send size={20} /> Enviar moedas
          </Link>
        }
      />
      <div className="stat-grid">
        <section
          className="card teacher-stat-card"
          aria-label="Saldo de moedas"
        >
          <p className="muted">Saldo disponível</p>
          <div className="stat-value teacher-balance">
            <Coin size={30} />
            {number(user?.balance || 0)}
          </div>
        </section>
        <section className="card teacher-stat-card">
          <p className="muted">Pucoins distribuídos</p>
          <div className="stat-value">{number(total)}</div>
        </section>
        <section className="card teacher-stat-card">
          <p className="muted">Alunos reconhecidos</p>
          <div className="stat-value">{recipients}</div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <h2>Atividade recente</h2>
            <Link to="/professor/extrato" className="text-link">
              Ver extrato <ArrowRight size={15} />
            </Link>
          </div>
          <QueryState
            loading={transactions.isLoading}
            error={transactions.error}
            retry={transactions.refetch}
          />
          {transactions.data && (
            <TransactionList transactions={sent.slice(0, 5)} compact />
          )}
        </section>
        <div className="dashboard-column">
          <section className="card welcome-card">
            <h2>Reconhecer faz a diferença</h2>
            <p>
              Escolha um aluno, informe a quantidade de moedas e conte o motivo
              do reconhecimento.
            </p>
            <Link to="/professor/enviar" className="button button-primary">
              <Send size={20} /> Enviar moedas
            </Link>
          </section>
          <section className="card">
            <div className="section-heading">
              <h2>Sua cota semestral</h2>
              <Wallet size={20} />
            </div>
            <p className="muted">
              Você recebe 1.000 Pucoins a cada semestre. As moedas não
              utilizadas são acumuladas ao seu saldo.
            </p>
            <p className="muted" style={{ marginTop: 12 }}>
              {sent.length} reconhecimentos registrados no seu extrato.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
