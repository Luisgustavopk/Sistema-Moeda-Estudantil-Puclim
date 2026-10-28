# Puclim — crítica comparativa e redesign da landing

28/10/2026. Implementação no frontend existente; referência principal: o login do próprio Puclim. Este documento substitui a direção de cartaz da primeira rodada registrada em `landing-art-direction.md`.

Method: dual-agent (A: `/root/visual_critique` · B: `/root/evidence_critique`). A avaliação de composição terminou antes de seus resultados serem cruzados com o detector. A crítica e a direção foram explicadas ao usuário antes da implementação.

## Por que a landing estava inferior ao login

O login tem um ambiente material coerente: papel quente, petróleo, ouro controlado, luz suave, sombras com direção e uma tarefa central. Sua qualidade vem das relações entre esses elementos, além da moeda.

O predomínio de petróleo no tema escuro é intencional e não é um defeito. A crítica trata de composição, continuidade e hierarquia nos dois temas.

A landing tinha uma ideia específica — as cinco barras e a circulação do mérito — mas alternava linguagens: cartaz amarelo chapado, adesivos inclinados, formulário cinza esverdeado, screenshot ampliada, manifesto e diagrama. A navegação funcionava, porém a composição recomeçava em cada seção. Mais entradas animadas não resolveriam essa fragmentação.

| Heurística da versão anterior    | Nota      | Evidência principal                                           |
| -------------------------------- | --------- | ------------------------------------------------------------- |
| Visibilidade de estado           | 2/4       | A troca a cada quatro segundos interrompia a leitura.         |
| Correspondência com o mundo real | 3/4       | Vocabulário claro, explicação concreta depois dos slogans.    |
| Controle e liberdade             | 3/4       | Pausa e seleção manual existiam; reprodução começava sozinha. |
| Consistência                     | 2/4       | Paleta e fonte compartilhadas, materiais divergentes.         |
| Prevenção de erros               | 3/4       | Simulação identificada, quantidade e motivo validados.        |
| Reconhecimento                   | 3/4       | Acesso de retorno pouco visível no celular.                   |
| Eficiência avançada              | n/a       | Landing persuasiva, sem operação repetitiva.                  |
| Estética e foco                  | 2/4       | Título, CTA e cartões dispersos; slogans repetidos.           |
| Recuperação de erros             | 3/4       | Erros próximos aos campos e feedback persistente.             |
| Ajuda                            | 3/4       | FAQ útil, distante da primeira decisão.                       |
| **Total anterior**               | **24/36** | Usabilidade; não uma medida objetiva de beleza.               |

Cinco prioridades orientaram o trabalho:

1. **P1 — unidade material:** substituir campos de cor desconectados por papel, luz, bordas e elevação consistentes.
2. **P1 — compreensão e controle:** explicar professor → estudante → parceiro antes do formulário; leitura estável por padrão.
3. **P2 — foco do hero:** aproximar proposta e ação; barras com acabamento próprio e artefatos subordinados ao título.
4. **P2 — prova de produto:** reduzir ampliação e corte das capturas; permitir inspecionar a imagem completa.
5. **P2 — continuidade:** integrar o manifesto, reduzir rupturas de fundo e manter acesso adequado para cada perfil.

Pontos fortes preservados: marca reconhecível, conteúdo factual, demonstração funcional, capturas do próprio sistema, teclado e validação. Para o estudante novo, a sequência explica quem envia as moedas; para quem retorna no celular, há acesso direto ao login no hero; para quem lê devagar ou reduz movimento, a demonstração fica parada até uma escolha explícita.

O detector Impeccable inicial retornou zero achados no TSX e no diretório da landing. A inspeção no navegador encontrou controles de 32 × 44 px e corte da captura móvel: ambos corrigidos. A ausência de achados automáticos não foi tratada como aprovação estética.

## Direção e referências

**Um percurso de reconhecimento sobre papel e luz.** As cinco barras do Puclim se tornam relevo dourado; um reconhecimento ganha presença material e conduz à demonstração de saldo e cupom.

Do login foram aplicados Bricolage Grotesque, papel `#f4f1e8`, superfície `#fffdf8`, petróleo `#123e48` / `#0f4c5c`, ouro `#e8c877`, tema escuro `#102d33`, campos legíveis e elevação suave. A landing conserva o símbolo das cinco barras como protagonista, conforme a correção final do usuário. As trajetórias orbitais agora conectam a composição, mas a moeda interativa do login não foi incorporada ao hero.

A pesquisa externa da primeira rodada permanece em [landing-art-direction.md](landing-art-direction.md). Princípios úteis reinterpretados: produto como evidência (Linear/Gumloop), relação entre participantes (Enode), demonstração específica e teclado (Raycast). Nenhum asset ou código desses sites foi incorporado.

O sorteio Taste ofereceu `one-motif` e `page-is-the-object`. `one-motif` foi escolhido porque as cinco barras pertencem à identidade real. A orientação genérica de campos planos foi adaptada ao pedido explícito de profundidade, luz e acabamento do login. Não foram adicionados fotografias genéricas, testemunhos, métricas ou promessas sem fonte.

## Implementação

- **Hero:** título editorial ocupa a composição inteira; as cinco barras antigas ganham ondas sutis. Trajetórias elípticas, pequenos sinais em circulação e luz ambiente integram título, reconhecimento e possibilidades. Textos permanecem estáveis.
- **Jornada:** uma trajetória única transporta o símbolo entre Reconhecer, Conquistar e Aproveitar. Formulário, saldo e resgate continuam funcionando. A leitura fica estável por padrão; reprodução é opcional e pausa fora da tela.
- **Produto:** quatro demonstrações nativas e legíveis substituem a screenshot como apresentação principal: espaço do estudante, catálogo, cupom e reconhecimento. Um estado React compartilhado conecta a jornada às novas demonstrações. Reconhecer 80 moedas e resgatar a vantagem de 60 resulta em saldo de 20 nos dois lugares.
- **Evidência:** as quatro capturas reais permanecem em um disclosure complementar, com acesso à imagem completa. Não substituem os controles funcionais.
- **Ecossistema:** os quatro perfis orbitam o centro Puclim; caminhos destacados e pequenos sinais convergem para a comunidade. Seleção por teclado permanece imediata.
- **FAQ:** preserva disclosures nativos, perguntas e respostas, com espaçamento, foco e hierarquia refinados.
- **Encerramento:** remove o retângulo de CTA; título, símbolo e trajetória encerram a narrativa. Acesso de organizações/professores permanece visível.
- **Temas:** fundo, iluminação, superfícies e textos usam aliases semânticos. As demonstrações novas seguem o modo escuro em petróleo, sem inserir painéis claros. Capturas históricas preservam o tema original do produto fotografado.
- **Responsividade:** composição própria no celular, controles de 44 × 44 px, menu com foco/Escape, tabs com setas/Home/End e layout pela largura do contêiner.
- Nenhuma dependência adicionada. Regras de negócio, APIs, autenticação e backend preservados. Todas as simulações são locais e identificadas; nenhum cupom possui validade.

## Skills aplicadas

| Skill             | Papel concreto                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Carbon Interface  | Grid, proximidade, ritmo, estados, campos, foco e teclado; Carbon-inspired na stack existente.                       |
| UI/UX Pro Max     | Consultas sobre materiais, movimento reduzido e toque; hierarquia e compreensão da sequência.                        |
| Taste Skill       | Inventário da marca, escolha `one-motif`, composição, inspeção de produção e revisão de capturas.                    |
| Animate           | Movimento por propósito, CSS, transições breves, suspensão fora da tela/aba e controle de reprodução.                |
| Review Animations | Revisão formal explicitamente solicitada; metadado `disable-model-invocation` da skill preservado.                   |
| Impeccable        | Crítica independente A/B e refinamento renderizado de composição, legibilidade, contraste, responsividade e estados. |

As orientações anteriores de `landing-page-design` e `design-to-motion` foram mantidas na narrativa e na demonstração dentro do site. Exportação de vídeo não integra esta entrega.

## Review Animations

| Before                                                      | After                                                                                | Why                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Símbolo e linhas pouco conectados à experiência.            | Ondas de escala nas cinco barras e sinais orbitais por rotação de um plano elíptico. | Usa a assinatura Puclim, com transform/opacity e sem animação de layout. `landing-experience.css:36`, `landing-experience.css:94`. |
| Demonstração automática e requestAnimationFrame permanente. | Reprodução explícita; um timer conserva o tempo ao pausar/sair da tela.              | Controle e leitura estável, sem trabalho por quadro. `use-landing-motion.ts:78`, `use-landing-motion.ts:120`.                      |
| Abas com headings remontados e estados de 500–900 ms.       | Trocas manuais imediatas; estado de 240 ms só na reprodução explicativa.             | Teclado não reinicia entradas. `landing.css:576`.                                                                                  |
| Três etapas visuais independentes.                          | O símbolo se desloca no trilho; o mesmo exemplo alimenta saldo e cupom.              | Movimento indica progresso real da simulação. `landing-experience.css:308`, `MeritExampleProvider.tsx`.                            |
| Pulsos por stroke-dashoffset.                               | Partículas em transform/opacity; caminho selecionado e textos estáticos.             | Mostra circulação sem pintura contínua da linha. `landing-experience.css:855`, `ProfileNetwork.tsx`.                               |

**Veredito: aprovado para esta entrega.** Interações abaixo de 300 ms; hero e revelações de leitura têm duração maior por apresentação. Loops de fundo são decorativos e não retiram conteúdo. Hover com deslocamento exige ponteiro preciso. Pausa global interrompe loops/transições; movimento reduzido mostra o conteúdo completo sem animações. Loops param fora da viewport e com a aba oculta. Não houve medição instrumental de FPS em hardware modesto.

## Verificação final

- Build de produção e TypeScript: aprovados.
- Oxlint e formatação dos arquivos da rodada: aprovados.
- Playwright: **14 testes aprovados** — nove da landing e cinco de regressão do login. Incluem dez segundos de leitura estável, reprodução/pausa, suspensão fora da tela, modo reduzido, temas/som, perfis por teclado, menu móvel, validação/resgate sem POST e abertura da captura completa. O teste novo verifica o estado compartilhado entre jornada, saldo, vantagem e cupom, sem POST.
- Chrome: 1440, 768, 390 e 320 px nos temas claro/escuro, sem overflow horizontal. Títulos em duas linhas nessas larguras. Nenhum erro JavaScript não tratado nas sessões verificadas.
- Ampliação CSS de 200% em desktop/tablet, com reorganização pela largura disponível. Não equivale a testar todas as combinações de zoom nativo/tecnologia assistiva; larguras inferiores a 320 CSS px não integram o requisito.
- Contrastes de tokens: texto secundário/papel **5,84:1**, ouro escuro/papel **5:1**, borda/fundo claro **3,44:1**, borda/fundo escuro **3,98:1**. Não é auditoria de cada pixel das imagens.
- Movimento reduzido: zero animações e zero revelações pendentes. Pausa global: todos os loops amostrados em estado paused; loops fora da viewport já estavam pausados. Troca de produto por teclado: zero animações no preview.
- A imagem completa abriu e carregou com largura natural de 1076 px.
- Taste de produção: **0 FAIL, 3 WARN**, com exceções explícitas `gradient`, `shadow`, `palette-cream`, `few-pictures` e `outlined-box`, fundamentadas na identidade, no pedido de materiais e nas capturas complementares. O aviso outlined-box corresponde às quatro órbitas elípticas, não a cartões contornados; os elementos foram conferidos no navegador.

Avisos mantidos: escala tipográfica inclui a marca, títulos e UI demonstrativa; texto secundário acompanha o login e supera AA; não há vídeo externo porque a demonstração é HTML controlável. As capturas históricas são bitmaps de tema claro; o produto interativo novo acompanha os dois temas. A referência fotográfica da vantagem já existe no seed (`/images/coffee.jpg`), sem download de imagem externa.

Testes de navegação usam sessão/API simuladas; não houve autenticação real de ponta a ponta. Não foi realizado ensaio com leitor de tela ou auditoria exaustiva em outros navegadores.

## Arquivos desta rodada

- `frontend/src/features/landing/pages/LandingPage.tsx`
- `frontend/src/features/landing/pages/MeritHero.tsx`
- `frontend/src/features/landing/pages/JourneyDemo.tsx`
- `frontend/src/features/landing/pages/ProductShowcase.tsx`
- `frontend/src/features/landing/pages/ProfileNetwork.tsx`
- `frontend/src/features/landing/pages/LiveProduct.tsx`
- `frontend/src/features/landing/pages/MeritSignal.tsx`
- `frontend/src/features/landing/pages/OrbitField.tsx`
- `frontend/src/features/landing/pages/MeritExampleProvider.tsx`
- `frontend/src/features/landing/pages/use-merit-example.ts`
- `frontend/src/features/landing/pages/landing-experience.css`
- `frontend/src/features/landing/pages/use-landing-motion.ts`
- `frontend/src/features/landing/pages/landing.css`
- `frontend/tests/landing.spec.ts`
- Este documento e a indicação histórica em `landing-art-direction.md`.

Evidências: `.taste-skill/premium-before/`, `.taste-skill/advanced-final/` e `.taste-skill/advanced-inspection-final/`. O helper de overlay foi encerrado com `stop --keep-inject`; nenhum script foi inserido no HTML do produto. A revisão usou Chrome isolado e não deixou overlay visível no navegador do usuário. `.impeccable/critique/ignore.md` estava ausente; não foram criadas supressões Impeccable para encobrir achados. A direção e o escopo já estavam definidos pelo briefing, sem necessidade de nova entrevista ou aprovação.
