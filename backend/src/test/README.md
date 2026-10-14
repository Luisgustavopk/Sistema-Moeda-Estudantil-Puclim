# Testes do backend Puclim

Os testes estão organizados por responsabilidade. Cada método cria os próprios cadastros com identificadores únicos; nenhuma suíte depende de um método anterior ou de outra classe. As fixtures usam a API real e criam moedas exclusivamente pela cota e transferência, sem alterar saldos artificialmente.

## Organização

```text
java/br/pucminas/puclim/
├── integration/   # HTTP real, autorização, fluxos e concorrência
├── persistence/   # Repositórios, constraints, relacionamentos e atomicidade no banco
├── support/       # Configuração, cliente HTTP, fixtures, SMTP e execução simultânea
└── unit/          # CPF e CNPJ sem banco ou servidor
```

| Módulo | Arquivo | Cenários |
| --- | --- | --- |
| Autenticação | [AuthenticationIntegrationTest](java/br/pucminas/puclim/integration/AuthenticationIntegrationTest.java) | Credenciais, erros genéricos, CSRF, papéis, logout, expiração e revogação de sessões |
| Cadastro | [RegistrationIntegrationTest](java/br/pucminas/puclim/integration/RegistrationIntegrationTest.java) | Alunos/parceiros, CPF/CNPJ/e-mail, tipos e instituições ativas |
| Professores | [TeacherImportIntegrationTest](java/br/pucminas/puclim/integration/TeacherImportIntegrationTest.java) | CSV, preview, relatório parcial, duplicidade, primeiro acesso e privacidade |
| Contas | [AccountIntegrationTest](java/br/pucminas/puclim/integration/AccountIntegrationTest.java) | Atualização de perfil/contato, dados próprios e desativação |
| Transferências | [TransferIntegrationTest](java/br/pucminas/puclim/integration/TransferIntegrationTest.java) | Quantidades/motivo/saldo, extratos, idempotência e concorrência |
| Vantagens | [AdvantageIntegrationTest](java/br/pucminas/puclim/integration/AdvantageIntegrationTest.java) | Upload, propriedade, edição, catálogo e desativação |
| Cupons | [CouponIntegrationTest](java/br/pucminas/puclim/integration/CouponIntegrationTest.java) | Resgate concorrente, replay, códigos únicos, autorização e utilização única |
| Notificações | [NotificationIntegrationTest](java/br/pucminas/puclim/integration/NotificationIntegrationTest.java) | Falha SMTP sem rollback, retry e recebimento real dos dois e-mails com o mesmo código |
| Contas persistidas | [AccountPersistenceTest](java/br/pucminas/puclim/persistence/AccountPersistenceTest.java) | Hash, vínculos, unicidades, saldo não negativo e chaves estrangeiras |
| Extrato persistido | [LedgerPersistenceTest](java/br/pucminas/puclim/persistence/LedgerPersistenceTest.java) | Lançamentos pareados, motivo, soma do saldo e retenção após desativação |
| Cotas persistidas | [SemesterCreditPersistenceTest](java/br/pucminas/puclim/persistence/SemesterCreditPersistenceTest.java) | Crédito inicial, duplicidade, concorrência e acúmulo |
| Cupons persistidos | [CouponPersistenceTest](java/br/pucminas/puclim/persistence/CouponPersistenceTest.java) | Referências, custo/nomes históricos e preservação após desativação |
| Outbox persistida | [OutboxPersistenceTest](java/br/pucminas/puclim/persistence/OutboxPersistenceTest.java) | Destinatários/código compartilhado, contato atualizado e rollback conjunto |
| CPF | [CpfValidationTest](java/br/pucminas/puclim/unit/CpfValidationTest.java) | Normalização e rejeição de documentos inválidos |
| CNPJ | [CnpjValidationTest](java/br/pucminas/puclim/unit/CnpjValidationTest.java) | Normalização e dígitos verificadores |

`AbstractDatabaseTest` compartilha o contexto Spring Boot, HTTP em porta aleatória e configuração de banco. `ApiTestClient` gerencia cookies, CSRF, JSON e multipart. `TestDataFactory` cria fixtures independentes; `TestPayloads` e `TestDocuments` geram suas entradas. `ConcurrentTestActions` usa uma barreira de início e timeout para duas operações reais. `SmtpTestServer` recebe mensagens por conexão SMTP; o teste sempre restaura o JavaMailSender após alterar a porta. `TestSessionRegistry` controla o timeout de uma sessão específica, sem uma flag global para a próxima sessão.

## Executar

Dentro de `backend/`, sem banco, execute:

```bash
sh ./mvnw verify
```

Os quatro testes unitários são executados. As 31 verificações de integração/persistência ficam explicitamente ignoradas quando `TEST_DB_URL` não está definida. Cada classe de banco possui sua condição explícita, além de herdar a configuração do contexto.

Para banco real, use uma instância dedicada de MySQL/MariaDB com banco e usuário já criados:

```bash
export TEST_DB_URL='jdbc:mariadb://127.0.0.1:3307/puclim_test?connectionTimeZone=UTC'
# Para MySQL, substitua jdbc:mariadb por jdbc:mysql.
export TEST_DB_USER=puclim
export TEST_DB_PASSWORD='<senha do usuário de teste>'
sh ./mvnw verify
```

O primeiro uso aplica as migrations. Pode repetir a suíte no mesmo banco dedicado: as fixtures geram dados únicos e não exigem reset. Os registros permanecem para inspeção; não há truncate/drop automático, H2 ou substituição do banco. Use sempre o banco de teste. O SMTP local é iniciado pelo próprio teste, sem depender de Mailpit ou e-mail externo.

Selecionar apenas um módulo ou método:

```bash
sh ./mvnw test -Dtest=AuthenticationIntegrationTest
sh ./mvnw test -Dtest='*PersistenceTest'
sh ./mvnw test -Dtest='CouponIntegrationTest#replayReturnsTheSameCouponAndDifferentRequestsGenerateUniqueCodes'
sh ./mvnw test -Dtest='CpfValidationTest,CnpjValidationTest'
```

No PowerShell, configure `$env:TEST_DB_URL`, `$env:TEST_DB_USER`, `$env:TEST_DB_PASSWORD` e use `.\mvnw.cmd` com os mesmos parâmetros. Relatórios ficam em `target/surefire-reports`. Para evitar interferência da compilação automática da IDE, acrescente `-Dpuclim.build.directory=/tmp/puclim-tests` (ou outro diretório adequado ao seu sistema).

## Última validação

Em 14/10/2026, os 35 testes passaram em MariaDB 11.8.1 isolado, inclusive repetindo a suíte no mesmo banco. Um método de cupons foi executado sozinho e passou. Sem TEST_DB_URL, os 4 unitários passaram e os 31 testes de banco foram ignorados. O suporte a jdbc:mysql permanece, mas MySQL e Playwright não foram executados novamente nesta reorganização.
