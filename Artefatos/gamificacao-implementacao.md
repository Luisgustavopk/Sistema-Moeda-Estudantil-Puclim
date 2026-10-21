# Gamificação Puclim — implementação US20–US38

O desenvolvimento estende os cadastros, sessões, extrato, cupons e outbox existentes. Não há novo papel administrativo, fallback de gamificação para demonstração, armazenamento de progresso em localStorage ou alteração do design system.

## Histórias e acesso pela interface

| História | Implementação | Interface |
| --- | --- | --- |
| US20 | Cupons próprios persistidos, atualização periódica, estados válido/utilizado/doado | Aluno → Meus cupons |
| US21 | Projeção pública com nome, curso, instituição, nível, conquistas, posições e streak; sem documentos, credenciais, contato ou extrato | Conquistas; links do ranking e de participantes |
| US22 | Rankings por recebimentos e melhor streak do período; instituição, semestre, paginação e posição própria | Aluno/professor → Rankings |
| US23 | Faixas configuráveis, total recebido, progresso, histórico e evento por nível alcançado | Dashboard e Conquistas |
| US24 | Catálogo de regras e metas, cinco badges iniciais, progresso e concessão única | Conquistas |
| US25 | Cadastro, edição e exclusão lógica de perguntas próprias; alternativas e gabarito validados | Professor → Perguntas |
| US26 | Um quiz diário, cinco perguntas, snapshots, correção no servidor e streak | Aluno → Quiz diário |
| US27 | Recompensa de 20 moedas a cada sete conclusões consecutivas, financiada pelo Fundo | Recompensas e extrato |
| US28 | Publicação idempotente com reserva real de recompensa × vagas | Professor → Missões |
| US29 | Entrega, devolução, reenvio, aprovação e pagamento único; extrato, eventos e e-mail | Missões, nos painéis de aluno e professor |
| US30 | Benefícios percentuais centralizados; bônus separado, vinculado à origem e sem capitalização | Recompensas, extrato e Fundo |
| US31 | Doação definitiva de cupom válido, sem débito adicional; vínculo à beneficiária e histórico | Meus cupons; beneficiária → Doações recebidas |
| US32 | Fechamento automático e repetível com snapshot de vencedores, prêmios e badge | Instituição → Fundo de um semestre encerrado |
| US33 | Missões elegíveis da instituição, aceite serializado e participações próprias | Aluno → Missões |
| US34 | Participantes, histórico, entregas, prazo, encerramento e liberação de reservas | Professor → Missões |
| US35 | Nota, respostas, gabarito após conclusão, histórico, streak, recorde e próxima disponibilidade | Aluno → Quiz diário |
| US36 | Caixa de notificações persistida, leitura e avisos visuais de novos eventos | Notificações e avisos globais |
| US37 | Dotação rastreável e imutável, saldo, movimentos, pagamentos, pendências e vencedores | Instituição de ensino → Fundo institucional |
| US38 | Propostas próprias, validação de orçamento, edição, encaminhamento e cancelamento | Empresa → Desafios |

US20–US37 estão implementadas com API e interface. US38 tem propostas implementadas, inclusive encerramento manual e por expiração, mas permanece **sem publicação financeira e sem pagamentos**: as histórias não definem a origem autorizada das moedas patrocinadas. `publicar` retorna conflito com explicação. A proposta não debita professores, não usa o Fundo automaticamente e não emite moedas.

## Regras financeiras e temporais

As decisões abaixo fazem parte da política inicial implementada, inclusive onde a história deixava escolhas em aberto.

- O dia do quiz, streak, validade dos benefícios e limites de semestre usam **America/Sao_Paulo** no servidor. Alterar o relógio do navegador não altera a elegibilidade.
- Um quiz iniciado e não concluído pode ser retomado no mesmo dia; no dia seguinte expira. Repetir uma conclusão com respostas iguais retorna o resultado anterior. Respostas diferentes após a conclusão são recusadas.
- Perguntas e alternativas são copiadas no início do quiz. Edições e exclusão lógica do banco de questões não alteram resultados históricos. O gabarito permanece ausente antes da conclusão.
- O nível usa a soma vitalícia de entradas elegíveis. O saldo gasto nunca reduz o nível. Limites iniciais: 0, 100, 300, 700 e 1.500.
- Entram nos rankings e na progressão apenas lançamentos positivos `RECEBIMENTO`, `MISSAO`, `RECOMPENSA`, `BONUS` e `PREMIO`. Cada crédito é contado uma vez. `COTA`, `ENVIO`, `RESGATE`, `RESERVA`, `LIBERACAO` e `DOACAO` não entram. O bônus é uma entrada efetiva separada e não é somado novamente ao principal.
- Ranking de moedas: maior recebimento no período, maior streak registrado em quiz concluído nesse período, primeira entrada elegível mais antiga e, persistindo empate absoluto, ID público estável. Ranking de streak: maior sequência registrada no período, primeira entrada e ID. Uma sequência pode atravessar a virada de semestre.
- Perfis públicos e rankings são acessíveis somente a alunos e professores autenticados. Rankings permitem escolher instituições de ensino ativas. A projeção pública é uma lista explícita de campos; o extrato e documentos continuam exclusivos do titular. Professores continuam consultando somente seu próprio extrato.
- O bônus incide **somente sobre recebimentos de professor e pagamentos de missão**, nunca sobre outro bônus, recompensa semanal, prêmio, liberação de reserva ou doação. Quiz perfeito dá +10% nos recebimentos posteriores daquele mesmo dia; ter doado ao menos um cupom naquele dia dá +5%; streak ativo de pelo menos sete dias dá +5%. Múltiplos quizzes/doações não acumulam percentuais. Os benefícios do quiz e da doação expiram à meia-noite local. O teto configurável não pode superar 25%. Moedas são inteiras: arredondamento para baixo.
- A recompensa semanal ocorre nas conclusões 7, 14, 21 etc. da mesma sequência. Depois de uma interrupção começa uma nova sequência de sete. A chave única é a conclusão que originou o ciclo, sem depender do número da semana civil.
- Bônus, recompensas e prêmios são debitados do Fundo do semestre em que se tornam devidos. Sem saldo, a obrigação fica `PENDENTE`, sem crédito no aluno; instituição e aluno recebem aviso. O job e a ação de reprocessamento repetem a tentativa com segurança. Uma obrigação mantém seu semestre original após a virada.
- A instituição de ensino autenticada pode criar uma única dotação para o semestre atual, com origem/autorização textual obrigatória e limite de 1.000.000 de moedas por padrão. Não há endpoint de alteração direta de saldo, reforço de dotação ou emissão por aluno/professor/empresa comum. Repetir os mesmos dados é idempotente; mudar uma dotação existente é recusado. O registro liga instituição, semestre, origem, valor, data e movimento `DOTACAO`.
- O Fundo paga obrigações imediatamente sob lock, sem pré-reservar recompensas futuras. Por isso seu campo de reservas é zero nesta política; pendências não são apresentadas como orçamento garantido. Saldo disponível e todas as obrigações aparecem separadamente.
- Publicar missão debita o saldo disponível do professor com lançamento `RESERVA` e mantém a mesma quantia em `Mission.reserved`. Aprovar consome a reserva e credita uma única entrada `MISSAO`; o professor não é debitado duas vezes. Encerrar gera `LIBERACAO` somente da parte sem obrigação. A soma de contas + reservas de missões + Fundo respeita as fontes autorizadas.
- Missões encerradas cancelam participações sem entrega. Entregas já enviadas e entregas devolvidas conservam reserva para análise, correção e aprovação mesmo após o encerramento. Essa reserva não é liberada enquanto a obrigação existir. Missões encerradas não reabrem.
- A doação gera lançamento `DOACAO` de valor zero, invalida definitivamente o cupom para o aluno e associa a vantagem à beneficiária ativa escolhida. Repetir a doação ao mesmo destino retorna o registro; mudar o destino ou usar cupom doado é recusado. O benefício percentual se aplica apenas a recebimentos posteriores elegíveis.
- O fechamento semestral congela até três alunos com recebimento positivo de cada instituição antes de realizar pagamentos. Prêmios iniciais: 100, 60 e 40 moedas; a política desta implementação usa moedas. A badge top 3 independe de haver saldo para o prêmio. O snapshot e as obrigações possuem unicidade, inclusive após reinicialização. Pagamento atrasado entra no extrato na data efetiva e não reescreve o snapshot encerrado.

`GamificationPolicy` concentra níveis, tamanho de quiz, percentuais, limite da dotação, valor semanal e prêmios, com binding de `puclim.gamification.*` e validação na inicialização. Novos níveis são configuráveis. Novas badges podem ser cadastradas com critérios existentes (`COINS`, `REDEMPTIONS`, `DONATIONS`, `STREAK`, `TOP3`), metas, raridade e apresentação próprias; um critério novo exige implementar sua medição no serviço, sem alterar as demais definições.

## Transações, persistência e eventos

Os serviços executam em transações `READ_COMMITTED`. Contas envolvidas em operações conjuntas são bloqueadas em ordem de ID; missões, cupons, tentativas e Fundos recebem locks de escrita. As unicidades do banco complementam os locks: tentativa/aluno/dia; missão/aluno; badge/aluno; nível/aluno; dotação/instituição/semestre; fechamento/instituição/semestre; posição/vencedor; chave de recompensa; chave de movimentação e operação/chave de requisição.

Eventos síncronos participam da transação de origem (`MANDATORY` nos listeners), incluindo registro de níveis, badges, notificações e obrigações. Uma falha obrigatória reverte dinheiro e efeitos associados. E-mails continuam na outbox persistente existente e são enviados depois, com retry. Não são confundidos com a nova caixa interna `inbox_notifications`. Conflitos de lock retornam 409 e podem ser repetidos com a mesma chave; nenhuma repetição cria outro pagamento.

Entidades novas:

| Grupo | Entidades/tabelas |
| --- | --- |
| Progresso | `StudentProgress`, `LevelHistory`, `BadgeDefinition`, `BadgeAward` |
| Avisos internos | `InboxNotification` |
| Quiz | `QuizQuestion`, `QuizAttempt`, `QuizItem`, coleções ordenadas de alternativas |
| Missões | `Mission`, `MissionParticipation`, `MissionReview` |
| Economia | `InstitutionFund`, `FundMovement`, `RewardPayment` |
| Doação | `CouponDonation`, referenciando o `Coupon` existente |
| Semestre | `SemesterClosure`, `SemesterWinner` |
| Patrocínio | `SponsoredChallenge` |

Migrations: `V1__existing_schema.sql` inicializa as entidades anteriores; `V2__gamification.sql` adiciona o modelo, índices, FKs, unicidades e catálogo de badges. Nenhuma migration apaga registros. `ddl-auto: validate` continua ativo.

## Endpoints

Todos abaixo têm prefixo **`/api/gamificacao`**, usam a sessão e a proteção CSRF existentes. Controllers delegam aos serviços. Identificadores enviados pelo cliente nunca substituem o titular autenticado na criação de participação, quiz, dotação, pergunta ou desafio.

| Método e caminho | Autorização/efeito |
| --- | --- |
| `GET /contexto` | Contexto temporal e limite da política para autenticados |
| `GET /perfil`, `GET /perfis/{id}` | Progresso próprio do aluno / projeção pública para aluno ou professor |
| `GET /ranking?institution=&semester=&type=MOEDAS\|STREAK&page=&size=` | Rankings; tamanho máximo 100 |
| `GET /notificacoes`, `POST /notificacoes/{id}/ler` | Caixa interna própria e leitura idempotente |
| `GET, POST /perguntas`; `PUT, DELETE /perguntas/{id}` | Professor; edição/exclusão somente do proprietário |
| `GET /quizzes`; `POST /quizzes/hoje`; `POST /quizzes/{id}/respostas` | Aluno; status/histórico, início e conclusão próprios |
| `GET, POST /missoes` | Listagem por papel; criação por professor com `Idempotency-Key` |
| `POST /missoes/{id}/aceitar` | Aluno da instituição da missão |
| `PATCH /missoes/{id}/prazo`; `POST /missoes/{id}/encerrar` | Professor proprietário |
| `POST /participacoes/{id}/entregar` | Aluno da participação |
| `POST /participacoes/{id}/aprovar`; `POST /participacoes/{id}/devolver` | Professor da missão; corpo `{ "text": "parecer" }` |
| `GET /recompensas` | Histórico próprio do aluno |
| `GET /fundo/{semester}` | Fundo da instituição de ensino autenticada |
| `POST /fundo/{semester}/dotacao` | Dotação própria; corpo `{ "amount": 1000, "origin": "autorização" }` |
| `POST /fundo/{semester}/reprocessar` | Reprocessa obrigações do próprio Fundo |
| `POST /fundo/{semester}/encerrar` | Processa somente semestre já encerrado da própria instituição |
| `GET /beneficiarias` | Destinos ativos para o aluno |
| `POST /cupons/{code}/doar` | Aluno proprietário; corpo `{ "beneficiaryId": "id" }` |
| `GET /doacoes` | Doações feitas pelo aluno ou recebidas pela beneficiária autenticada |
| `GET, POST /desafios`; `PUT /desafios/{id}` | Empresa comum, somente propostas próprias |
| `POST /desafios/{id}/enviar`, `/cancelar`, `/encerrar`, `/publicar` | Encaminhamento, cancelamento, encerramento e bloqueio explícito de publicação sem financiamento |

Os endpoints anteriores de transferência, resgate, extrato, cupom e autenticação mantêm seus contratos. Transferências e resgates passam a publicar eventos de progresso. O enum TypeScript de cupom inclui `DOADO`; o de extrato inclui os novos tipos. A lista e a conferência de cupons apresentam o estado doado e impedem utilização.

Frontend: `features/gamificacao/` reúne contratos, cliente HTTP, hooks de mutação, perfil/ranking, perguntas/quiz, formulário de atividades, missões, economia, doação e caixa interna. `App`, `AppLayout`, dashboard do aluno, cupons, conferência, extrato e notificações recebem as integrações. As mutações invalidam o TanStack Query e atualizam a sessão/saldo. Formulários usam React Hook Form + Zod; componentes, cores e navegação existentes são reaproveitados.

## Banco novo e banco legado

Banco novo: configure as variáveis do `.env.example`, crie um banco vazio e inicie a aplicação. Flyway aplica V1 e V2; Hibernate valida o resultado. Testes devem usar um banco dedicado. Não aponte `TEST_DB_URL` para produção.

Banco legado sem histórico Flyway: o comportamento padrão é **falhar**, sem baseline automático. Antes de migrar:

1. Faça backup consistente e teste a restauração em uma cópia.
2. Inspecione `SHOW TABLES`, `SHOW CREATE TABLE` e `information_schema`; compare todas as tabelas, colunas, tipos, índices, FKs e constraints com V1. Confira unicidades de operações/cotas/cupons, contas sem saldo negativo e conciliação `accounts.balance = SUM(ledger_entries.amount)`.
3. Se houver divergências, prepare uma migração específica para essa instalação, preservando dados. Não marque um schema divergente como compatível.
4. Somente na cópia verificada equivalente a V1, execute a inicialização uma vez com `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` e `SPRING_FLYWAY_BASELINE_VERSION=1`. Isso marca V1 como existente e aplica V2. Retire essas variáveis nas execuções seguintes.
5. Valide Hibernate, constraints, contagens, conciliação e fluxos antigos na cópia antes de repetir o procedimento autorizado na instalação real. Nunca use `clean`, `repair` para esconder divergências ou `ddl-auto: update`.

O banco local já existente não foi alterado. A inspeção e execução desta entrega usam MySQL isolado, em diretório de testes. A compatibilidade de um banco legado específico depende de suas credenciais e da revisão acima.

## Execução e validação

Backend, com Java 17 e variáveis de banco/SMTP configuradas:

```powershell
cd backend
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

Frontend integrado, em outro terminal:

```powershell
cd frontend
npm.cmd install
$env:VITE_DATA_MODE='api'
npm.cmd run dev
```

O proxy do Vite aponta para a API existente. Use `VITE_PROXY_TARGET` quando ela estiver em outra porta. Para produção, use `npm.cmd run build` e configure cookies/HTTPS e proxy `/api` conforme a instalação anterior.

Testes de banco real:

```powershell
cd backend
$env:TEST_DB_URL='jdbc:mysql://127.0.0.1:3307/puclim_test?connectionTimeZone=UTC'
$env:TEST_DB_USER='puclim'
$env:TEST_DB_PASSWORD='<senha do banco de testes>'
.\mvnw.cmd '-Dpuclim.build.directory=target/gamification-validation' test
```

Use `jdbc:mariadb` para uma instância MariaDB. O diretório separado evita interferência de compilação automática da IDE. Sem `TEST_DB_URL`, os testes de banco são explicitamente ignorados, não considerados aprovados.

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
$env:LIVE_API_TARGET='http://127.0.0.1:8080'
npm.cmd run test:e2e:live
```

Se as portas padrão estiverem ocupadas, configure `PLAYWRIGHT_DEMO_PORT`, `PLAYWRIGHT_API_PORT` e `PLAYWRIGHT_LIVE_PORT`. A suíte live usa cadastros únicos e a API real; não simula respostas. O novo teste exercita todas as áreas novas acessíveis nos cinco papéis de negócio.

Resultados efetivamente executados serão registrados em `gamificacao-validacao.md`. A restrição de financiamento da US38 é uma pendência de negócio, não uma integração financeira implementada.
