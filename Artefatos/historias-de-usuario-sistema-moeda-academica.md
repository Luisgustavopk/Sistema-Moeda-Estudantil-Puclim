# Histórias de usuário — Sistema de moeda estudantil (Puclim)

Laboratório 3 · Sprint 01 · PUC Minas, Engenharia de Software · Versão 1.3

## Como ler este documento

As histórias seguem o formato **Como** [ator], **quero** [ação], **para** [benefício]. Cada uma traz critérios de aceitação e uma prioridade:

- **Obrigatória:** vem direto do roteiro do Laboratório 3. Precisa estar 100% funcionando antes de qualquer extra.
- **Extra:** vem do documento de apoio (missões, quizzes, ranking, bônus, badges, níveis, doação). Entra só depois do obrigatório, na ordem da seção "Gamificação e extras".

As histórias estão agrupadas por tema, só para facilitar a leitura. Os requisitos técnicos (arquitetura, segurança e integridade) aparecem como requisitos não funcionais, no fim. O documento termina com as matrizes que ligam cada exigência do roteiro e cada extra às histórias.

## Atores

| Ator | Papel no sistema |
|---|---|
| Aluno | Recebe e troca moedas, consulta extrato. Nos extras: faz quizzes, cumpre missões, doa vantagens |
| Professor | Recebe cota semestral e envia moedas com motivo. Nos extras: cria missões e perguntas de quiz |
| Empresa parceira | Cadastra vantagens e confere cupons |
| Instituição de ensino | Um tipo de empresa parceira. Mantém seus professores e, nos extras, o Fundo da instituição |
| Instituição beneficiária | Um tipo de empresa parceira. Recebe as vantagens doadas pelos alunos (extra) |
| Sistema | Executa e-mails, jobs agendados (cota semestral, fechamento do semestre) e regras automáticas |

Instituições são um tipo de empresa parceira: todas se cadastram pelo mesmo fluxo (US03) e entram no sistema com login e senha. Não existe perfil de administrador nem de secretaria.

## Regras de negócio que valem para todas as histórias

- **RN1.** Moeda só nasce de duas fontes: a cota do professor e o Fundo da instituição (extras). Toda entrada e saída gera uma transação no extrato.
- **RN2.** Nenhum saldo fica negativo.
- **RN3.** Todo acesso exige autenticação com login e senha.
- **RN4.** Todo professor está vinculado a uma instituição. O aluno escolhe uma instituição já cadastrada.
- **RN5.** CPF, RG e endereço do aluno são dados pessoais (LGPD) e ficam visíveis só para ele.

## Acesso e cadastro

### US01 · Cadastrar-me como aluno
**Como** aluno, **quero** me cadastrar informando nome, e-mail, CPF, RG, endereço, instituição de ensino e curso, **para** participar do sistema de mérito.

- Todos os campos são obrigatórios.
- A instituição é escolhida em uma lista de instituições pré-cadastradas, sem digitação livre.
- CPF e e-mail não podem repetir. O CPF é validado.
- O aluno define login e senha no cadastro e entra com saldo zero.

**Prioridade:** Obrigatória

### US02 · Entrar no sistema
**Como** aluno, professor ou empresa parceira, **quero** entrar com login e senha, **para** acessar somente as funções do meu perfil.

- Credenciais inválidas mostram uma mensagem única, sem revelar qual campo errou.
- Cada perfil cai na sua área (aluno, professor ou empresa).
- Telas e rotas protegidas redirecionam para o login quando não há sessão.
- A sessão expira após inatividade e pode ser encerrada pelo botão sair.

**Prioridade:** Obrigatória

### US03 · Cadastrar minha empresa ou instituição parceira
**Como** empresa ou instituição parceira, **quero** me cadastrar com meus dados e credenciais, **para** participar do sistema.

- Ao cadastrar, escolho o tipo: empresa (oferece vantagens), instituição de ensino ou instituição beneficiária (recebe doações).
- Campos sugeridos: nome, CNPJ, e-mail de contato, login e senha (a confirmar em grupo).
- O e-mail é obrigatório, porque a empresa recebe a notificação de cupom (US18).
- CNPJ e e-mail não podem repetir.

**Prioridade:** Obrigatória

### US04 · Estar disponível para vínculo de alunos
**Como** instituição de ensino, **quero** estar cadastrada como parceira, **para** que meus alunos e professores possam se vincular a mim.

- Instituições de ensino ativas aparecem na lista de seleção do cadastro do aluno (US01), antes do primeiro cadastro.
- Cada instituição tem nome e identificação única.
- Instituições com alunos ou professores vinculados não podem ser excluídas.

**Prioridade:** Obrigatória

### US05 · Importar meus professores
**Como** instituição de ensino, **quero** importar a lista dos meus professores, **para** que eles já existam no sistema quando a parceria começar.

- Cada professor tem nome, CPF, departamento e fica vinculado à minha instituição.
- A importação rejeita linhas com CPF repetido e mostra um relatório de erros.
- Cada professor recebe acesso inicial e define a própria senha no primeiro login.

**Prioridade:** Obrigatória

### US06 · Gerenciar meus dados de aluno
**Como** aluno, **quero** consultar, atualizar e excluir meu cadastro, **para** manter minhas informações corretas e sair do sistema quando quiser.

- Posso editar nome, e-mail, endereço, curso e senha.
- A exclusão pede confirmação.
- O destino do histórico de transações após a exclusão será definido pelo grupo.

**Prioridade:** Obrigatória (CRUD de aluno, Sprints 02 e 03)

### US07 · Gerenciar os dados da minha empresa
**Como** empresa parceira, **quero** consultar, atualizar e excluir meu cadastro, **para** manter minha parceria atualizada.

- Excluir a empresa desativa suas vantagens, sem apagar cupons já emitidos.
- A troca de e-mail de contato vale para as próximas notificações.

**Prioridade:** Obrigatória (CRUD de empresa, Sprints 02 e 03)

## Moedas do professor e extratos

### US08 · Receber 1.000 moedas a cada semestre
**Como** professor, **quero** receber 1.000 moedas no início de cada semestre, acumuladas ao meu saldo, **para** reconhecer meus alunos durante o período.

- O crédito é agendado por semestre e soma ao saldo corrente. Moedas não usadas não expiram.
- Cada crédito aparece no extrato do professor como transação própria.
- O mesmo semestre não pode ser creditado duas vezes.

**Prioridade:** Obrigatória

### US09 · Enviar moedas a um aluno
**Como** professor, **quero** escolher um aluno, informar a quantidade e escrever o motivo do reconhecimento, **para** premiar bom comportamento e participação.

- O envio só é permitido com saldo suficiente. Quantidade zero ou negativa é recusada.
- O motivo é uma mensagem aberta e obrigatória. Sem motivo, não há envio.
- Antes de concluir, uma tela de revisão mostra aluno, quantidade e motivo.
- A operação é única: debita o professor, credita o aluno e registra a transação com o motivo.

**Prioridade:** Obrigatória

### US10 · Ser avisado por e-mail ao receber moedas
**Como** aluno, **quero** receber um e-mail quando um professor me enviar moedas, **para** saber que fui reconhecido e por quê.

- O e-mail traz nome do professor, quantidade e motivo.
- Se o e-mail falhar, a transação não é desfeita e o envio é reprocessado depois.

**Prioridade:** Obrigatória

### US11 · Consultar o extrato do professor
**Como** professor, **quero** ver meu saldo e todos os envios que fiz, **para** controlar quanto ainda posso distribuir.

- Mostra saldo atual e, para cada envio, aluno, quantidade, motivo e data.
- Filtra por período e busca por aluno.

**Prioridade:** Obrigatória

### US12 · Consultar o extrato do aluno
**Como** aluno, **quero** ver meu saldo e todas as transações de recebimento e troca, **para** acompanhar de onde vieram e para onde foram minhas moedas.

- Mostra saldo atual e uma lista com tipo, descrição, valor e data.
- Recebimentos mostram professor e motivo. Trocas mostram a vantagem e o custo.
- Filtra por período e por tipo (entrada, saída e, nos extras, bônus, recompensa e doação).

**Prioridade:** Obrigatória

## Vantagens, resgate e cupom

### US13 · Cadastrar uma vantagem
**Como** empresa parceira, **quero** cadastrar uma vantagem com nome, descrição, foto e custo em moedas, **para** oferecê-la aos alunos.

- Nome, descrição, foto e custo são obrigatórios. O custo é um número inteiro maior que zero.
- A foto aceita formatos de imagem comuns e tem limite de tamanho.
- A vantagem fica ligada à empresa logada.

**Prioridade:** Obrigatória

### US14 · Editar e desativar minhas vantagens
**Como** empresa parceira, **quero** alterar, desativar ou excluir uma vantagem, **para** manter o catálogo atualizado.

- Uma vantagem desativada some do catálogo, mas os cupons já emitidos continuam válidos.
- Mudar o custo não altera cupons já resgatados.

**Prioridade:** Obrigatória

### US15 · Consultar o catálogo de vantagens
**Como** aluno, **quero** ver as vantagens disponíveis com foto, descrição, custo e empresa, **para** escolher o que trocar.

- Cada item mostra foto, nome, empresa, descrição e custo em moedas.
- Itens acima do meu saldo aparecem indicados como indisponíveis para resgate.
- Busca por nome e filtro por categoria.

**Prioridade:** Obrigatória (busca e categoria são complementos)

### US16 · Resgatar uma vantagem
**Como** aluno, **quero** trocar minhas moedas por uma vantagem, **para** usar meu reconhecimento em produtos e descontos.

- O resgate só acontece com saldo igual ou maior que o custo.
- Antes de concluir, uma confirmação mostra custo, saldo atual e saldo após o resgate.
- A operação desconta o saldo, registra a transação e gera um cupom com código único.
- Dois resgates simultâneos não podem deixar o saldo negativo.

**Prioridade:** Obrigatória

### US17 · Receber o cupom por e-mail
**Como** aluno, **quero** receber um e-mail com o cupom e o código, **para** usar a vantagem presencialmente.

- O e-mail traz vantagem, empresa, código gerado pelo sistema, data e instruções de uso.
- O cupom também fica disponível na minha área (US20).

**Prioridade:** Obrigatória

### US18 · Notificar o parceiro por e-mail
**Como** empresa parceira, **quero** receber um e-mail a cada resgate, com o mesmo código do aluno, **para** conferir a troca no atendimento.

- O e-mail do parceiro traz vantagem, nome do aluno e o mesmo código do cupom.
- Os dois e-mails são disparados no mesmo resgate.

**Prioridade:** Obrigatória

### US19 · Conferir um cupom
**Como** empresa parceira, **quero** digitar o código apresentado pelo aluno e ver o status do cupom, **para** confirmar a troca com segurança.

- Status possíveis: válido, utilizado e, nos extras, doado (invalidado).
- Código inexistente ou de outra empresa mostra mensagem clara.
- Confirmar a utilização marca o cupom como utilizado, e ele não pode ser usado de novo.

**Prioridade:** Obrigatória

### US20 · Ver meus cupons
**Como** aluno, **quero** ver todos os cupons que resgatei com seus status, **para** saber o que ainda posso usar.

- Lista código, vantagem, empresa, data e status.

**Prioridade:** Obrigatória (apoio ao US17)

## Gamificação e extras

A ordem abaixo segue a priorização do documento de apoio: perfil público, ranking e níveis; badges; streak e quizzes; missões e doação. Se o tempo apertar, o corte é de baixo para cima.

### US21 · Ver o perfil público de um aluno
**Como** aluno ou professor, **quero** ver nome, curso, instituição, nível, badges, posição no ranking e streak de um aluno, **para** reconhecer o mérito dele.

- Extrato completo só aparece para o próprio aluno. O professor vê apenas as moedas que ele mesmo enviou.
- CPF, RG e endereço nunca aparecem para outras pessoas (RN5).

**Prioridade:** Extra

### US22 · Consultar o ranking
**Como** aluno, **quero** ver dois rankings, de moedas recebidas no semestre e de maior streak, **para** acompanhar minha posição.

- O ranking usa moedas recebidas, nunca o saldo, para que resgatar não derrube o aluno.
- Filtros por instituição e por semestre.
- Desempate: maior streak e depois a data da primeira moeda.

**Prioridade:** Extra

### US23 · Subir de nível
**Como** aluno, **quero** que meu nível aumente conforme o total de moedas recebidas, **para** ver meu progresso.

- Faixas sugeridas: nível 1 (0), 2 (100), 3 (300), 4 (700) e 5 (1.500).
- O nível usa o total acumulado recebido e nunca diminui.

**Prioridade:** Extra

### US24 · Conquistar badges
**Como** aluno, **quero** ganhar badges ao cumprir marcos, **para** ter reconhecimento além das moedas.

- Exemplos: primeira moeda recebida, primeiro resgate, primeira doação, 7 dias de streak, top 3 do semestre.
- Cada badge é uma regra que escuta eventos do sistema. Criar uma badge nova não exige mexer nas outras.
- Badges bloqueadas mostram o progresso. A raridade (de fácil a lendária) acompanha a dificuldade.

**Prioridade:** Extra

### US25 · Cadastrar perguntas de quiz
**Como** professor, **quero** cadastrar perguntas de múltipla escolha da minha disciplina, **para** formar um banco de questões.

- Cada pergunta tem enunciado, alternativas e uma resposta correta.
- Posso editar e excluir minhas perguntas.

**Prioridade:** Extra

### US26 · Responder o quiz do dia e manter o streak
**Como** aluno, **quero** responder um quiz por dia, **para** manter meu streak.

- Um quiz por dia (por exemplo, 5 perguntas). Concluir o quiz mantém o streak.
- Perder um dia zera o streak.
- Nota máxima gera bônus percentual (US30).

**Prioridade:** Extra

### US27 · Receber a recompensa semanal de streak
**Como** aluno, **quero** ganhar moedas ao completar 7 dias seguidos, **para** ser premiado pela constância.

- A recompensa sugerida é de 20 moedas, paga pelo Fundo da instituição, com limite de uma por semana.
- Aparece no extrato como recompensa.

**Prioridade:** Extra

### US28 · Criar uma missão
**Como** professor, **quero** criar uma missão com título, descrição, recompensa, número de vagas e prazo, **para** estimular tarefas específicas.

- Só publica se meu saldo cobrir recompensa vezes vagas. Esse valor fica reservado.
- Missão vencida devolve o saldo reservado que não foi usado.

**Prioridade:** Extra

### US29 · Concluir uma missão e ser aprovado
**Como** aluno, **quero** entregar uma missão e receber a recompensa após a aprovação do professor, **para** ser reconhecido por ela.

- A missão passa por disponível, em andamento, aguardando aprovação e concluída.
- Na aprovação, o sistema gera a transação com a mensagem da missão como motivo e envia e-mail ao aluno.
- O professor também pode devolver a entrega.

**Prioridade:** Extra

### US30 · Receber bônus percentual
**Como** aluno, **quero** ganhar um bônus sobre moedas recebidas em certas ações, **para** ser incentivado a participar mais.

- Fontes sugeridas: quiz com nota máxima (+10%), doação de vantagem (+5%) e streak ativo de 7 dias ou mais (+5%).
- Teto de 25% sobre cada recebimento.
- O bônus sai do Fundo da instituição e aparece no extrato como transação separada, do tipo bônus.

**Prioridade:** Extra

### US31 · Doar uma vantagem
**Como** aluno, **quero** doar uma vantagem resgatada a uma instituição beneficiária, **para** ajudar outras pessoas.

- A instituição beneficiária é escolhida entre as cadastradas com esse tipo (US03).
- A doação não gasta moedas. Aparece no extrato como tipo doação e concede bônus (US30).
- O cupom doado é invalidado e não pode mais ser usado pelo aluno.

**Prioridade:** Extra

### US32 · Premiar o top 3 do semestre
**Como** sistema, **quero** premiar os três primeiros do ranking no fim do semestre, **para** reconhecer o desempenho do período.

- Um job agendado concede bônus de moedas ou uma vantagem exclusiva no catálogo.

**Prioridade:** Extra

### US33 · Ver e aceitar missões disponíveis
**Como** aluno, **quero** ver as missões abertas e aceitar as que me interessam, **para** ganhar moedas cumprindo tarefas.

- A lista mostra título, professor, recompensa, vagas restantes e prazo.
- Missões sem vagas ou vencidas não podem ser aceitas.
- Também vejo as missões em andamento, aguardando aprovação e concluídas.

**Prioridade:** Extra

### US34 · Acompanhar as entregas das minhas missões
**Como** professor, **quero** ver quantas vagas foram ocupadas e quais entregas aguardam análise, **para** aprovar, devolver ou encerrar cada missão.

- Mostra vagas ocupadas, entregas pendentes e o saldo reservado.
- Posso editar o prazo e encerrar a missão. Encerrar libera o saldo reservado que não foi usado.

**Prioridade:** Extra

### US35 · Consultar o resultado do quiz e meu streak
**Como** aluno, **quero** ver minha nota, o gabarito e minha sequência de dias, **para** acompanhar meu desempenho e não perder o streak.

- Após concluir, mostro nota, acertos e erros por pergunta.
- Mostro a sequência atual, o maior streak e quantos dias faltam para a recompensa semanal.
- Quem já fez o quiz do dia vê o aviso de que o próximo fica disponível amanhã.

**Prioridade:** Extra

### US36 · Ser avisado de conquistas e de subida de nível
**Como** aluno, **quero** ser avisado quando ganhar uma badge ou subir de nível, **para** comemorar meu progresso.

- O aviso aparece na tela no momento do evento e fica registrado no meu perfil.
- Mostra qual badge ou nível foi alcançado e o que falta para o próximo.

**Prioridade:** Extra

### US37 · Gerenciar o Fundo da minha instituição
**Como** instituição de ensino, **quero** definir e acompanhar o Fundo de cada semestre, **para** pagar recompensas automáticas sem consumir a cota dos professores.

- Mostra saldo do Fundo e todas as saídas (streak, bônus, top 3).
- Recompensas automáticas não são pagas se o Fundo estiver sem saldo, e a instituição é avisada.

**Prioridade:** Extra

### US38 · Propor um desafio patrocinado
**Como** empresa parceira, **quero** criar um desafio com orçamento próprio, **para** engajar os alunos com minha marca.

- O desafio tem título, descrição, recompensa, vagas, prazo e orçamento.
- O desafio não cria moedas novas. A origem das moedas do orçamento é uma decisão pendente.

**Prioridade:** Extra (fase 2)

### US39 · Transferir moedas entre alunos com mediação do professor
**Como** aluno, **quero** solicitar uma transferência do meu saldo para outro aluno vinculado a um professor em comum, **para** reconhecer sua colaboração conforme os critérios desse professor.

- O professor publica critérios e gerencia os vínculos de alunos da sua instituição. Cada aluno pode ter vários professores vinculados.
- O aluno seleciona professor e destinatário, informa quantidade inteira positiva e motivo, e confirma a leitura dos critérios.
- Ambos os alunos devem estar ativos e vinculados ao professor escolhido. Não é permitido transferir para si mesmo.
- A solicitação fica pendente sem débito, crédito ou reserva. O saldo é verificado no envio e novamente na aprovação.
- Somente o professor responsável pode aprovar ou rejeitar, sempre com parecer obrigatório.
- Na aprovação, débito e crédito são atômicos e pareados; falhas não geram lançamentos parciais. Repetir o mesmo pedido ou decisão não movimenta moedas novamente.
- Os critérios aceitos no envio são preservados mesmo após alterações futuras. Se forem alterados antes do envio, o aluno precisa ler e aceitar a versão atual.
- Solicitação, decisão, professor, parecer e datas ficam no histórico dos participantes. Há notificações internas para o professor e os alunos.
- Um vínculo com pedidos pendentes só pode ser removido após a análise desses pedidos.
- A transferência não cria moedas, não usa o saldo do professor e não gera mérito, ranking, níveis ou bônus por recirculação.

**Prioridade:** Extra solicitado pela equipe

## Requisitos não funcionais

Estes itens não são histórias de usuário. São condições que o sistema precisa cumprir para sustentar as histórias acima.

### RNF01 · Arquitetura MVC
O sistema é organizado em MVC, com as camadas Controller, Service e Repository/DAO, como o roteiro exige.

- O diagrama de classes e o de componentes refletem as camadas do código.
- Regras de negócio ficam no Service, nunca no Controller.

**Prioridade:** Obrigatória

### RNF02 · Proteção de dados e credenciais
Senhas são guardadas com hash e dados pessoais ficam restritos, em conformidade com a LGPD.

- Nenhuma senha é salva em texto puro.
- CPF, RG e endereço só são retornados ao próprio aluno (RN5).

**Prioridade:** Obrigatória

### RNF03 · Integridade das transações
Toda operação com moedas é atômica e registrada, para que o saldo sempre bata com o extrato.

- Envio, resgate e doação ou acontecem por inteiro ou não acontecem.
- O saldo é a soma das transações. Nenhuma moeda surge fora das fontes da RN1.

**Prioridade:** Obrigatória

### RNF04 · Eventos de domínio
O sistema publica eventos (moeda recebida, quiz concluído, resgate, doação, missão aprovada), para que ranking, nível, streak e badges se atualizem sem acoplamento.

**Prioridade:** Extra

## Matriz de rastreabilidade com o roteiro

| Exigência do roteiro | Histórias |
|---|---|
| Cadastro de aluno (nome, e-mail, CPF, RG, endereço, instituição, curso) | US01, US04 |
| Instituições pré-cadastradas | US04 |
| Professores pré-cadastrados, com nome, CPF, departamento e instituição | US05 |
| 1.000 moedas por semestre, acumuláveis | US08 |
| Envio com saldo suficiente e motivo obrigatório | US09 |
| Aluno notificado por e-mail ao receber moedas | US10 |
| Extrato de professor e de aluno | US11, US12 |
| Empresa se cadastra e cadastra vantagens (descrição, foto e custo) | US03, US13, US14 |
| Aluno escolhe uma vantagem | US15 |
| Resgate com desconto do saldo | US16 |
| E-mail de cupom ao aluno e ao parceiro, ambos com código gerado | US17, US18, US19 |
| Login e senha para os três perfis, com autenticação | US02 |
| CRUD de aluno e de empresa parceira | US06, US07 |
| Arquitetura MVC | RNF01 |

## Matriz de rastreabilidade com os extras

| Extra do documento de apoio | Histórias |
|---|---|
| Missões do professor (4.1) | US28, US29, US33, US34 |
| Streak e quizzes (4.2) | US25, US26, US27, US35 |
| Ranking (4.3) | US22, US32 |
| Bônus percentual (4.4) | US30 |
| Catálogo e doação (4.5) | US31, US03 |
| Badges (4.6) | US24, US36 |
| Níveis (4.7) | US23, US36 |
| Perfil do aluno (4.8) | US21 |
| Fundo da instituição (seção 3) | US37 |
| Desafios patrocinados (4.9, fase 2) | US38 |
| Eventos e observers (seção 5) | RNF04 |
