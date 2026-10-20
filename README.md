# Puclim — Sistema de Moeda Estudantil

Projeto desenvolvido para o Laboratório de Desenvolvimento de Software da PUC Minas. O sistema tem como objetivo permitir que professores reconheçam alunos com moedas virtuais, que podem ser trocadas por vantagens oferecidas por empresas parceiras.

## Estado atual

O frontend da sprint 3 está implementado: acesso e cadastros, perfis, painéis por papel, envio de moedas, extratos, catálogo, gestão de vantagens, resgates, cupons, importação de professores e notificações. O visual segue o protótipo em estilo **clay, petróleo e ouro**, com barra lateral e opção de modo escuro. O perfil é definido pelo login; não há seletor de papel, estilo ou paleta.

O backend implementa os fluxos de contas, autenticação por sessão e CSRF, cotas, transferências, extratos, vantagens, cupons e outbox de e-mails. O frontend usa a API real por padrão; o modo de demonstração é opcional e explícito. Erros da API nunca acionam dados fictícios.

US20–US37 possuem backend persistente e integração React para perfis públicos, rankings, níveis, badges, quizzes, streak, missões, bônus, doações, premiação semestral, notificações e Fundo institucional. US38 permite gerenciar propostas; publicação financeira e pagamentos aguardam a definição da origem autorizada das moedas patrocinadas. Consulte a [documentação da gamificação](Artefatos/gamificacao-implementacao.md) para o estado de cada história, contratos, regras financeiras e migração de bancos legados.

Os [resultados da validação](Artefatos/gamificacao-validacao.md) registram os testes executados, ambientes e limitações desta entrega.

## Tecnologias

### Backend

| Tecnologia | Versão/base | Responsabilidade |
| --- | --- | --- |
| Java | 17 | Linguagem do backend; base LTS compatível com o Spring Boot escolhido |
| Spring Boot | 4.1.1 | Inicialização, configuração e execução da aplicação |
| Spring Web MVC | Gerenciada pelo Spring Boot | API REST |
| Spring Data JPA + Hibernate | Gerenciada pelo Spring Boot | Repositórios e mapeamento objeto-relacional |
| Spring Validation | Gerenciada pelo Spring Boot | Validação dos dados recebidos |
| Spring Security | Gerenciada pelo Spring Boot | Sessões, CSRF e autorização por papel |
| MySQL Connector/J | Gerenciada pelo Spring Boot | Driver JDBC de conexão com o MySQL |
| Flyway + módulo MySQL | Gerenciada pelo Spring Boot | Versionamento e execução das migrations |
| Maven Wrapper | Maven 3.10.0 | Build reproduzível sem instalação global do Maven |

As versões das dependências do backend são coordenadas pelo parent do Spring Boot em `backend/pom.xml`. Há testes unitários, de integração HTTP, persistência, concorrência e rollback; consulte [backend/src/test/README.md](backend/src/test/README.md).

### Frontend

| Tecnologia | Responsabilidade |
| --- | --- |
| React 19 + TypeScript 6 | Componentes de interface e verificação estática de tipos |
| Vite 8 | Servidor de desenvolvimento e build dos arquivos estáticos |
| React Router | Navegação entre páginas e rotas protegidas |
| TanStack Query | Consultas, cache e atualização dos dados vindos da API |
| React Hook Form + Zod | Formulários e validação dos dados no navegador |
| Tailwind CSS 4 | Estilização por classes utilitárias |
| shadcn/ui | Configuração para adicionar componentes adaptáveis ao projeto |
| Lucide React | Ícones da interface |
| Oxlint | Análise estática do código |
| Prettier | Formatação consistente do código |
| Playwright | Testes dos fluxos no navegador, em desktop e celular |

As dependências e suas faixas de versão ficam em `frontend/package.json`; o `package-lock.json` registra as versões efetivamente resolvidas. Use `npm ci` para reproduzir a instalação.

O shadcn/ui continua preparado por meio de `components.json`, aliases e utilitários de classes. Os componentes utilizados nesta entrega são próprios e ficam em `shared/components/ui`, preservando o visual clay. Os tokens de cor, sombra e modo escuro ficam em `src/styles/tokens.css`; os estilos compartilhados ficam em `globals.css`. A fonte Bricolage Grotesque e as imagens de exemplo são servidas localmente.

A base visual usa os valores do wireframe fornecido: petróleo `#0f4c5c`, ouro `#d1a21c`, cartões com raio de 22 px e sombras clay externas e internas. O conteúdo é fluido e centralizado ao lado do menu, com largura máxima de 108 rem (1.728 px na configuração padrão) e padding lateral de 24–96 px no desktop; isso oferece mais respiro em monitores grandes. Tipografia e espaçamentos usam `clamp()`: texto-base de 16–18 px e títulos de 30–40 px no desktop, com títulos de 24 px e padding lateral de 16 px no celular. A barra lateral ocupa 250 px no desktop, passa a 78 px com ícones em telas intermediárias e abre por botão no celular. Painéis e catálogo reorganizam suas colunas; formulários e notificações preservam limites de leitura, e cupons isolados mantêm tamanho de cartão. Fotografias, busca, atalhos e a mensagem “O mérito começa com você” foram mantidos. O header reúne navegação, indicação de demonstração e modo escuro. Notificações têm acesso apenas pela barra lateral. Foto, nome, tipo de usuário, acesso ao perfil e saída ficam juntos na barra lateral, também acessível pelo menu no celular.

Vite é uma ferramenta de desenvolvimento e build, e React Router cuida da navegação. O backend permanece no Spring Boot; não há servidor Express nem outro backend em Node.js.

## Arquitetura geral

O repositório reúne duas aplicações: um frontend React e um backend Spring Boot. O backend é um **monólito em camadas**: suas funcionalidades compartilham uma aplicação e um banco relacional.

```text
Navegador / React
       |
       | HTTP / JSON
       v
Controller -> Service -> Repository -> MySQL
                  |           |
             Regras e     JPA/Hibernate
             transações
```

O React é responsável pela apresentação. O Spring MVC recebe as requisições REST e organiza o fluxo no backend. Essa divisão deve ser refletida nos diagramas e na apresentação da arquitetura do laboratório.

A escolha de um monólito reduz a complexidade de execução, depuração e entrega para o tamanho do projeto. Operações envolvendo vários registros podem compartilhar uma transação no mesmo banco.

## Estrutura do repositório

```text
.
├── Artefatos/                  # Histórias de usuário e modelos existentes
├── backend/                    # Aplicação Spring Boot
├── frontend/                   # Aplicação React
├── compose.yaml                # MySQL opcional para desenvolvimento local
├── .env.example                # Exemplo de configuração do Compose
├── .editorconfig               # Convenções de edição
└── README.md
```

### Backend: organização por camada

```text
backend/
├── pom.xml
├── mvnw / mvnw.cmd
├── .mvn/wrapper/
└── src/
    ├── main/
    │   ├── java/br/pucminas/puclim/
    │   │   ├── PuclimApplication.java
    │   │   ├── controller/
    │   │   ├── service/
    │   │   ├── repository/
    │   │   ├── entity/
    │   │   ├── dto/request/
    │   │   ├── dto/response/
    │   │   ├── mapper/
    │   │   ├── exception/
    │   │   ├── security/
    │   │   └── config/
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/
    └── test/java/br/pucminas/puclim/
```

| Diretório | Responsabilidade prevista |
| --- | --- |
| `controller` | Receber requisições HTTP, validar a entrada e devolver respostas |
| `service` | Executar casos de uso, regras de negócio e delimitar transações |
| `repository` | Consultar e persistir dados com Spring Data JPA |
| `entity` | Representar entidades persistidas e seus relacionamentos |
| `dto/request` e `dto/response` | Definir os contratos de entrada e saída da API |
| `mapper` | Converter entidades e DTOs |
| `exception` | Representar erros e padronizar as respostas de erro |
| `security` | Implementar autenticação e autorização |
| `config` | Concentrar configurações da aplicação |

Regras de negócio ficam nos serviços. Controllers delegam a eles, e respostas usam DTOs para controlar os dados públicos e privados retornados.

### Frontend: organização por funcionalidade

```text
frontend/
├── public/
├── components.json
├── package.json / package-lock.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── providers.tsx
    │   ├── router.tsx
    │   └── layouts/
    ├── features/
    │   ├── auth/
    │   ├── alunos/
    │   ├── empresas/
    │   ├── instituicoes/
    │   ├── moedas/
    │   ├── vantagens/
    │   ├── cupons/
    │   ├── conta/
    │   └── notificacoes/
    ├── shared/
    │   ├── components/ui/
    │   ├── hooks/
    │   ├── lib/
    │   └── utils/
    ├── assets/
    └── styles/
        ├── globals.css
        └── tokens.css
```

As funcionalidades usam os diretórios `api`, `components`, `hooks`, `pages`, `schemas` e `types` conforme necessário. Eles acomodam, respectivamente, chamadas HTTP, componentes específicos, hooks, páginas, validações e tipos. Contratos compartilhados entre funcionalidades ficam em `shared/types/domain.ts`.

- `app` reúne a composição da aplicação, providers, roteamento e layouts.
- `features` mantém juntos os arquivos relacionados a uma funcionalidade.
- `shared` recebe somente componentes e utilitários reutilizáveis entre funcionalidades.
- `assets` guarda recursos importados pelo código; `public` guarda arquivos servidos diretamente.
- O alias `@/` aponta para `src/` no TypeScript e no Vite.
- Dados do servidor serão gerenciados pelo TanStack Query; estado temporário da interface poderá ficar nos componentes.
- Validação e proteção de rotas no frontend não substituem validação e autorização no backend.

## Banco de dados e persistência

### Por que MySQL e modelo relacional?

MySQL foi escolhido como banco do projeto por preferência da equipe. O modelo relacional atende aos vínculos entre alunos, professores, instituições, empresas, vantagens e cupons, permitindo representá-los com tabelas, chaves primárias e chaves estrangeiras.

A base prevista é **MySQL 8.4 com InnoDB**, que oferece transações e suporte a chaves estrangeiras. O ambiente local usa `utf8mb4` para suportar os caracteres dos dados e textos da aplicação.

### Por que ORM?

JPA define o contrato de mapeamento e persistência; Hibernate é a implementação de ORM utilizada; Spring Data JPA oferece a abstração dos repositórios; Connector/J estabelece a conexão JDBC com o MySQL.

Essa combinação reduz o código repetitivo de CRUD e permite trabalhar com entidades Java e relacionamentos. O ORM não substitui a modelagem do banco, suas restrições ou o conhecimento de SQL. Consultas específicas poderão usar SQL quando necessário, mantendo o acesso na camada de persistência.

### Por que Flyway?

As alterações do schema serão versionadas em `backend/src/main/resources/db/migration`, por exemplo, `V1__criar_contas.sql`. Cada migration aplicada deve permanecer imutável; novas alterações recebem novos arquivos.

O Hibernate está configurado com `ddl-auto: validate`: ele verificará o alinhamento entre entidades e schema, enquanto o Flyway será responsável pelas alterações estruturais. Não utilizamos `ddl-auto: update` para evoluir o banco automaticamente.

`V1__existing_schema.sql` inicializa o modelo anterior e `V2__gamification.sql` adiciona a gamificação e o catálogo de badges. Bancos novos são inicializados pelo Flyway; bancos legados exigem inspeção e baseline explícitos conforme a [estratégia documentada](Artefatos/gamificacao-implementacao.md#banco-novo-e-banco-legado).

### Regras da implementação

- Quantidades de moedas usam valores inteiros, com `BIGINT` no MySQL e `long` no Java.
- CPF, CNPJ, login/e-mail e código de cupom possuem unicidade no banco.
- Credenciais são separadas dos dados específicos dos perfis; senhas são armazenadas como hash.
- Transferências e resgates atualizam saldo e histórico dentro de uma transação no serviço.
- Locks e idempotência impedem gastos simultâneos acima do saldo; `@Transactional` sozinho não garante essa regra.
- O saldo é conciliado com o histórico de transações.
- Cadastros com histórico são desativados, preservando transações e cupons associados.
- Imagens de vantagens possuem referência registrada no banco e arquivos no diretório configurado.

Essas regras são implementadas nos serviços, com locks, idempotência e constraints de banco. Cadastros com histórico são desativados, preservando extratos e cupons. Imagens usam o diretório configurado em `UPLOAD_DIRECTORY`.

## Executar o ambiente inicial

### Pré-requisitos

- JDK 17 ou superior, com `JAVA_HOME` apontando para o JDK.
- Node.js 24 LTS e npm.
- MySQL 8.4 acessível localmente **ou** Docker com Docker Compose para usar o banco fornecido.
- Acesso à internet na primeira instalação das dependências e do Maven Wrapper.

### 1. Preparar o MySQL

Se usar Docker, na raiz do repositório:

```powershell
Copy-Item .env.example .env
# Edite .env e substitua as duas senhas de exemplo antes de iniciar.
docker compose --profile mysql up -d mysql mailpit
docker compose ps
```

O serviço publica o MySQL apenas em `127.0.0.1:3307` por padrão. O volume `mysql_data` preserva os dados entre reinicializações. As variáveis de usuário e senha do container são aplicadas na inicialização de um volume vazio; editar `.env` não altera usuários já existentes no banco.

Também é possível usar uma instalação própria do MySQL: crie o banco `puclim` com `utf8mb4` e um usuário com permissões sobre esse banco. O usuário precisará executar as futuras migrations.

### 2. Executar o backend

O Spring Boot carrega opcionalmente o `.env` na raiz ou no diretório atual e aceita variáveis do processo. Se preferir configurar pelo PowerShell, use a mesma senha do usuário do banco:

```powershell
$env:DB_PASSWORD = '<senha definida para DB_USER>'
# Opcionais; os valores abaixo já são os padrões:
$env:DB_USER = 'puclim'
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3307/puclim?connectionTimeZone=UTC'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Se modificar `DB_NAME` ou `DB_PORT` no `.env`, ajuste também `DB_URL`. A porta HTTP padrão é `8080` e pode ser alterada com `SERVER_PORT`.

Em Linux/macOS, use `export DB_PASSWORD='<senha>'` e `sh ./mvnw spring-boot:run` dentro de `backend/`.

A API usa as contas cadastradas e professores importados pela instituição. Não há conta administrativa padrão. O primeiro acesso do professor exige trocar a senha temporária. E-mails locais podem ser inspecionados no Mailpit em `http://localhost:8025`.

### 3. Executar o frontend

Em outro terminal, a partir da raiz:

```powershell
Set-Location frontend
npm ci
npm run dev
```

No PowerShell, se a política de execução bloquear `npm.ps1`, utilize `npm.cmd` nos mesmos comandos.

Acesse `http://localhost:5173`. O modo integrado requer o backend e o banco. Para testar somente as telas anteriores sem esses serviços, configure explicitamente `VITE_DATA_MODE=demo` antes de iniciar o Vite. A gamificação requer a API real. As contas exclusivas da demonstração são:

| Perfil | Login/e-mail | Senha inicial |
| --- | --- | --- |
| Aluno | `aluno@puclim.demo` | `Puclim@2026` |
| Professor | `professor@puclim.demo` | `Puclim@2026` |
| Empresa | `empresa@puclim.demo` | `Puclim@2026` |
| Instituição de ensino | `instituicao@puclim.demo` | `Puclim@2026` |

Alterações da demonstração são preservadas neste navegador. Para recomeçar, remova as chaves `puclim.demo.v1` do armazenamento local e `puclim.demo.session` do armazenamento da sessão, pelas ferramentas do navegador. Professores importados recebem uma senha temporária na demonstração e devem substituí-la no primeiro acesso.

Para explicitar a integração, copie `frontend/.env.example` para `frontend/.env.local`, mantenha `VITE_DATA_MODE=api` e reinicie o Vite. `VITE_API_URL` define a base da API, por padrão `/api`. O proxy encaminha esse caminho ao backend em `http://localhost:8080`. Use `VITE_PROXY_TARGET` se a API estiver em outra porta.

O proxy do Vite não faz parte do build de produção. O encaminhamento da API no ambiente publicado será definido durante a preparação da implantação.

## Verificar a estrutura

Frontend, dentro de `frontend/`:

```powershell
npm run lint
npm run build
```

O build inclui a verificação de tipos. Para verificar somente os tipos, use `npm run typecheck`.

Backend, dentro de `backend/`:

```powershell
.\mvnw.cmd verify
```

Para testar os fluxos do frontend, dentro de `frontend/`:

```powershell
npm run test:e2e
```

Os testes usam Chrome em modo invisível, criam contextos isolados e iniciam/encerram os servidores de teste nas portas `5173` e `5174`. Essas portas precisam estar livres. A suíte cobre demonstração e integração HTTP com respostas controladas, incluindo erros da API. Por padrão é necessário ter Google Chrome instalado; também é possível instalar Chromium com `npx playwright install chromium` e definir `PLAYWRIGHT_CHANNEL=chromium`.

Use `npm run format` para formatar o frontend. Resultados, screenshots e traces dos testes ficam em `frontend/test-results/` e são ignorados pelo Git.

Com `TEST_DB_URL`, `TEST_DB_USER` e `TEST_DB_PASSWORD` de um banco dedicado, `verify` também executa testes de integração e persistência em MySQL/MariaDB. Sem `TEST_DB_URL`, as classes de banco são explicitamente ignoradas. `npm run test:e2e:live` executa os fluxos anteriores e de gamificação contra a API real; configure `LIVE_API_TARGET` quando necessário. Os testes aceitam portas alternativas via `PLAYWRIGHT_DEMO_PORT`, `PLAYWRIGHT_API_PORT` e `PLAYWRIGHT_LIVE_PORT`.

## Artefatos e referências

- [Histórias de usuário](Artefatos/historias-de-usuario-sistema-moeda-academica.md)
- [Modelagem do sistema](Artefatos/Modelagem/README.md)
- [Spring Boot](https://docs.spring.io/spring-boot/index.html)
- [Transações no Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html)
- [MySQL: InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)
- [Flyway: migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations)
- [React: construção de uma aplicação](https://react.dev/learn/build-a-react-app-from-scratch)
- [Vite](https://vite.dev/guide/)
- [shadcn/ui](https://ui.shadcn.com/docs)

Os modelos serão atualizados conforme as decisões de implementação, mantendo o alinhamento entre documentação e código exigido pelo laboratório.
