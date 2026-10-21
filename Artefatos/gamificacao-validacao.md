# Validação da gamificação — 20/10/2026

Implementação e regras por história: [gamificacao-implementacao.md](gamificacao-implementacao.md).

## Resultados executados

| Verificação | Ambiente e resultado |
| --- | --- |
| Backend `mvnw verify` | **57 testes aprovados**, zero falhas, erros ou testes ignorados; pacote executável gerado |
| Runtime/compilação | JDK 17, compilação `release 17`; Spring Boot 4.1.1 |
| Banco de integração | MySQL 8.0.44 isolado em `127.0.0.1:3319`, banco `puclim_gamification_test` |
| Flyway + Hibernate | V1 e V2 aplicadas no banco isolado inicialmente vazio; repetições validaram os checksums e `ddl-auto: validate` |
| Frontend `npm run typecheck` | Aprovado |
| Frontend `npm run lint` | Aprovado, sem avisos |
| Frontend `npm run build` | Aprovado; TypeScript e Vite concluídos |
| Playwright de regressão | **15 aprovados**: 12 de demonstração e 3 de contratos HTTP/erros/sessão |
| Playwright com API real | **2 aprovados**: fluxo US01–US20 e fluxo completo de gamificação, usando o pacote Java 17 validado |
| Conciliação SQL após o E2E | Zero contas com saldo diferente da soma do extrato; zero Fundos com saldo diferente da soma dos movimentos; zero reservas de missões divergentes de reserva inicial menos liberações e pagamentos; zero saldos ou reservas negativos |
| Revisão de whitespace | `git diff --check` aprovado |

Os 57 testes do backend incluem 35 testes anteriores, 19 novos cenários de integração da gamificação e 3 testes unitários da política. Os testes de integração atravessam HTTP, segurança, controllers, serviços, repositórios e MySQL real. Não foi usado H2 nem um banco simulado.

## Cobertura relevante

- Limites e extensão de níveis, progresso vitalício e concessão única de badges.
- Privacidade da projeção pública, autorização de acesso por papel e titularidade das notificações.
- Ranking por recebimento independentemente de resgate, desempate por streak/primeira moeda e paginação.
- Perguntas próprias, edição preservando snapshots, gabarito oculto, correção no servidor e replay de conclusão.
- Duas conclusões simultâneas do mesmo quiz, sequência de 14 dias com duas recompensas, interrupção e recorde histórico.
- Bônus sobre o principal, teto e arredondamento, Fundo insuficiente, pendência e reprocessamento sem pagamento duplicado.
- Dois bônus concorrentes disputando o mesmo saldo institucional.
- Reserva real de missão, publicação repetida, rollback por saldo insuficiente e disputa pela última vaga.
- Entrega, devolução, reenvio, duas aprovações simultâneas e crédito único.
- Encerramento preservando entregas pendentes; expiração cancelando participações sem entrega e liberando reserva uma única vez.
- Autorização de missões por instituição e professor, doação sem novo débito, estado persistido e bloqueio de cupom doado.
- Dotação própria, única e imutável, sem autorização para alunos, professores ou empresas comuns.
- Fechamento semestral repetido, prêmio pendente e prêmio pago, snapshot e badge top 3 únicos.
- Falha intencional de um listener com rollback de saldos, extrato, e-mail e conquistas na mesma transação.
- Propostas patrocinadas próprias, orçamento mínimo, envio, cancelamento, encerramento manual/por prazo e bloqueio de publicação sem financiamento.

O novo teste Playwright cadastra o Fundo pela interface, cria cinco perguntas, publica uma missão com reserva, responde o quiz, aceita e entrega a missão, devolve para ajustes, reenvia, aprova, encerra, consulta conquistas/ranking/recompensas, marca uma notificação como lida, doa um cupom e consulta a doação como beneficiária. Também cria, encaminha e cancela uma proposta como empresa. Os cadastros de preparação usam a API real; as funcionalidades de gamificação são exercidas pela interface.

## Execução reproduzível

Com um MySQL/MariaDB de testes próprio configurado:

```powershell
cd backend
$env:JAVA_HOME='C:\Program Files\Java\jdk-17'
$env:TEST_DB_URL='jdbc:mysql://127.0.0.1:3307/puclim_test?connectionTimeZone=UTC'
$env:TEST_DB_USER='puclim'
$env:TEST_DB_PASSWORD='<senha do banco dedicado>'
.\mvnw.cmd '-Dpuclim.build.directory=target/gamification-validation' verify
```

O caminho de JDK é apenas o utilizado nesta execução; ajuste conforme sua instalação. O diretório de build separado evita interferência de compilação automática da IDE.

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
$env:PLAYWRIGHT_DEMO_PORT='5183'
$env:PLAYWRIGHT_API_PORT='5184'
npm.cmd run test:e2e
$env:PLAYWRIGHT_LIVE_PORT='5185'
$env:LIVE_API_TARGET='http://127.0.0.1:8189'
npm.cmd run test:e2e:live
```

As portas alternativas foram usadas para preservar servidores já abertos. Para a suíte live, inicie previamente o backend apontando para o banco dedicado; use `8080` ou a porta configurada em `LIVE_API_TARGET`.

Evidências locais ignoradas pelo Git: `backend/target/gamification-validation.log`, relatórios em `backend/target/gamification-validation/surefire-reports/`, `frontend/build-validation.log`, `frontend/playwright-regression.log` e `frontend/playwright-live-final.log`.

## Limites da validação e pendências

- **US38:** publicação e pagamentos continuam bloqueados até a definição da origem autorizada do orçamento patrocinado. Não houve emissão de moedas para esses desafios.
- **Banco legado real:** não foi migrado. O banco local existente não forneceu acesso pela tentativa sem credenciais; a validação usou instância própria isolada. O baseline de uma instalação existente depende de backup e comparação com V1 conforme a estratégia documentada.
- **MariaDB:** a suíte desta entrega foi executada em MySQL. Não foi repetida em MariaDB nesta validação.
- **E-mail:** os testes anteriores de SMTP local, outbox e retry passaram; entrega a provedores externos de e-mail e publicação em produção não foram executadas.

Ocorreram tentativas intermediárias com falhas que foram corrigidas: persistência antes do preenchimento de campos obrigatórios, precisão temporal no replay do quiz e uma corrida no login do teste live anterior. A compilação também foi isolada da IDE. Após a interrupção da sessão, foi necessário reiniciar o MySQL de testes e repetir o `verify`. Os resultados da tabela correspondem às execuções finais concluídas.
