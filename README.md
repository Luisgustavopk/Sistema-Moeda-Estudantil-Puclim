# Puclim — Sistema de Moeda Estudantil

Projeto desenvolvido para o Laboratório de Desenvolvimento de Software da PUC Minas. O sistema tem como objetivo permitir que professores reconheçam alunos com moedas virtuais, que podem ser trocadas por vantagens oferecidas por empresas parceiras.

## Estado atual

Esta etapa inicializa a estrutura técnica do frontend e do backend. Estão preparados os diretórios, as dependências, as configurações de build e a conexão futura com MySQL.

Ainda não foram implementados CRUDs, telas, endpoints, autenticação própria, entidades, tabelas de negócio ou migrations. O frontend abre uma página vazia intencionalmente. As pastas vazias possuem `.gitkeep` para serem preservadas pelo Git.

## Tecnologias

### Backend

| Tecnologia | Versão/base | Responsabilidade |
| --- | --- | --- |
| Java | 17 | Linguagem do backend; base LTS compatível com o Spring Boot escolhido |
| Spring Boot | 4.1.1 | Inicialização, configuração e execução da aplicação |
| Spring Web MVC | Gerenciada pelo Spring Boot | Base para a futura API REST |
| Spring Data JPA + Hibernate | Gerenciada pelo Spring Boot | Repositórios e mapeamento objeto-relacional |
| Spring Validation | Gerenciada pelo Spring Boot | Validação futura dos dados recebidos |
| Spring Security | Gerenciada pelo Spring Boot | Base para autenticação e autorização futuras |
| MySQL Connector/J | Gerenciada pelo Spring Boot | Driver JDBC de conexão com o MySQL |
| Flyway + módulo MySQL | Gerenciada pelo Spring Boot | Versionamento e execução das migrations |
| Maven Wrapper | Maven 3.10.0 | Build reproduzível sem instalação global do Maven |

As versões das dependências do backend são coordenadas pelo parent do Spring Boot em `backend/pom.xml`, evitando combinações manuais incompatíveis. A dependência de testes está preparada, mas nenhum teste de negócio foi criado nesta etapa.

### Frontend

| Tecnologia | Responsabilidade |
| --- | --- |
| React 19 + TypeScript 6 | Componentes de interface e verificação estática de tipos |
| Vite 8 | Servidor de desenvolvimento e build dos arquivos estáticos |
| React Router | Infraestrutura para navegação entre as futuras páginas |
| TanStack Query | Consultas, cache e atualização dos dados vindos da API |
| React Hook Form + Zod | Formulários e validação dos dados no navegador |
| Tailwind CSS 4 | Estilização por classes utilitárias |
| shadcn/ui | Configuração para adicionar componentes adaptáveis ao projeto |
| Lucide React | Ícones da interface |
| Oxlint | Análise estática do código |

As dependências e suas faixas de versão ficam em `frontend/package.json`; o `package-lock.json` registra as versões efetivamente resolvidas. Use `npm ci` para reproduzir a instalação.

O shadcn/ui foi preparado por meio de `components.json`, aliases e utilitários de classes. Nenhum componente visual foi adicionado. A identidade visual do protótipo será traduzida em tokens em `src/styles/tokens.css` durante a implementação das telas.

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

Regras de negócio ficarão nos serviços. Os controllers não acessarão o banco diretamente. As respostas usarão DTOs para evitar exposição de credenciais e permitir controle dos dados pessoais retornados.

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
    │   └── cupons/
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

Cada funcionalidade possui os diretórios `api`, `components`, `hooks`, `pages`, `schemas` e `types`. Eles acomodarão, respectivamente, chamadas HTTP, componentes específicos, hooks, páginas, validações e tipos.

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

A pasta de migrations ainda está vazia. Não foram criadas tabelas de negócio nem dados iniciais. A modelagem existente deverá ser revisada antes da primeira migration, especialmente os campos obrigatórios do aluno, os vínculos institucionais e as referências das transações.

### Diretrizes para a implementação

- Quantidades de moedas usarão valores inteiros, com `BIGINT` no MySQL e `long` no Java.
- CPF, CNPJ, login/e-mail e código de cupom terão restrições de unicidade conforme as regras definidas.
- Credenciais serão separadas dos dados específicos dos perfis; senhas serão armazenadas apenas como hash.
- Transferências e resgates atualizarão saldo e histórico dentro de uma transação no serviço.
- A implementação terá controle de concorrência para impedir gastos simultâneos acima do saldo; `@Transactional` sozinho não garante essa regra.
- O saldo deverá permanecer consistente com o histórico de transações.
- O tratamento de exclusão de cadastros com histórico será definido antes dos CRUDs finais, evitando apagar transações e cupons associados por cascata.
- Imagens de vantagens terão sua referência registrada no banco; o armazenamento dos arquivos será definido na implementação.

Essas diretrizes descrevem a arquitetura escolhida; as regras de negócio ainda serão implementadas.

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
docker compose up -d mysql
docker compose ps
```

O serviço publica o MySQL apenas em `127.0.0.1:3306` por padrão. O volume `mysql_data` preserva os dados entre reinicializações. As variáveis de usuário e senha do container são aplicadas na inicialização de um volume vazio; editar `.env` não altera usuários já existentes no banco.

Também é possível usar uma instalação própria do MySQL: crie o banco `puclim` com `utf8mb4` e um usuário com permissões sobre esse banco. O usuário precisará executar as futuras migrations.

### 2. Executar o backend

O Spring Boot lê variáveis de ambiente do processo. Ele **não carrega automaticamente** o `.env` usado pelo Docker Compose. No PowerShell, configure a mesma senha do usuário do banco:

```powershell
$env:DB_PASSWORD = '<senha definida para DB_USER>'
# Opcionais; os valores abaixo já são os padrões:
$env:DB_USER = 'puclim'
$env:DB_URL = 'jdbc:mysql://localhost:3306/puclim?connectionTimeZone=UTC'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Se modificar `DB_NAME` ou `DB_PORT` no `.env`, ajuste também `DB_URL`. A porta HTTP padrão é `8080` e pode ser alterada com `SERVER_PORT`.

Em Linux/macOS, use `export DB_PASSWORD='<senha>'` e `sh ./mvnw spring-boot:run` dentro de `backend/`.

Não existem endpoints de negócio nesta etapa. O Spring Security conserva sua configuração automática inicial, que pode gerar uma senha temporária no console; ela não representa o mecanismo de login do Puclim, que será implementado posteriormente.

### 3. Executar o frontend

Em outro terminal, a partir da raiz:

```powershell
Set-Location frontend
npm ci
npm run dev
```

No PowerShell, se a política de execução bloquear `npm.ps1`, utilize `npm.cmd` nos mesmos comandos.

Acesse `http://localhost:5173`. A página vazia é esperada. O servidor Vite está preparado para encaminhar chamadas a `/api` ao backend em `http://localhost:8080`, durante o desenvolvimento. Nenhuma chamada foi implementada. Se alterar a porta do backend, ajuste o destino em `vite.config.ts`.

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

Esses comandos verificam lint, tipos e empacotamento. Ainda não há testes de negócio ou de integração com MySQL; o build do backend não exige um banco em execução nesta etapa.

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
