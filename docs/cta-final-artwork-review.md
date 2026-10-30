# Puclim — composição exclusiva do CTA final

## Direção e escopo

A referência é a imagem `Seu próximo passo vale muito.png` enviada pelo usuário. A composição anterior repetia o `MeritSignal` do hero e o `OrbitField`, sem marcos que explicassem a circulação. A nova peça encerra a narrativa com **Aprender → Conquistar → Compartilhar** ao redor de um medalhão Puclim.

O medalhão, os três marcos assimétricos e as trajetórias interpretam a metade direita da referência. A coluna esquerda não foi redesenhada: título, parágrafo, botões, links, estilos e geometria foram preservados. Não foram adicionados controles, transações, rotas ou dependências.

Arquivos desta etapa:

- `frontend/src/features/landing/pages/LandingPage.tsx`: troca somente das importações e da composição decorativa final.
- `frontend/src/features/landing/pages/FinaleArtwork.tsx`: nova ilustração, com o símbolo oficial `Wave`, ícones Lucide e descrição acessível.
- `frontend/src/features/landing/pages/finale-artwork.css`: estilos exclusivos, materiais, trajetórias e adaptações responsivas.

Os hashes dos demais arquivos existentes em `frontend/src` permanecem iguais aos do início desta etapa. As alterações anteriores da jornada, footer e outros arquivos foram preservadas.

## Decisões visuais

- O reconhecimento aparece como um objeto de marca com relevo e espessura, acompanhado de marcos de aprendizado e compartilhamento. A moeda deixa de ser um símbolo ampliado e ganha contexto na conclusão da jornada.
- Os marcos usam composição assimétrica, sem interação falsa ou aparência de novos botões. Suas superfícies são opacas; não há backdrop blur.
- Os tokens existentes controlam superfícies, texto, bordas, trajetórias, ouro e sombras. O bronze do relevo reutiliza o material da moeda do login (`#76500c`), restrito a esta peça.
- A estrutura existente do CTA fornece o espaço da ilustração. No tablet, a trajetória se torna mais vertical; no mobile, os três títulos contornam um medalhão compacto. O conteúdo e os controles à esquerda mantêm as mesmas posições e medidas.
- A ilustração tem semântica de imagem e uma descrição única. Os elementos internos são decorativos, sem novos pontos na ordem de teclado.

## Skills efetivamente aplicadas

| Skill             | Uso neste recorte                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taste Skill       | Diagnóstico da repetição, composição própria a partir da referência, comparação antes/depois e revisão das capturas. Não houve novo sorteio de direção: a imagem do usuário fixa a direção desta seção. |
| UI/UX Pro Max     | Consulta direcionada sobre redução e excesso de movimento; hierarquia dos marcos e uso da stack existente.                                                                                              |
| Carbon Interface  | Tokens, alinhamento, responsividade, contraste e preservação da ação principal. Aplicação Carbon-inspired, sem instalar Carbon oficial.                                                                 |
| Animate           | Movimento com propósito narrativo, CSS, propriedades, curvas existentes, interrupção e preferências do usuário.                                                                                         |
| Review Animations | Auditoria explícita dos loops, hover, entradas, pausas e redução de movimento.                                                                                                                          |
| Impeccable        | Revisão do resultado renderizado, acabamento do medalhão, legibilidade e verificação de escopo.                                                                                                         |

Landing Page Design foi consultada complementarmente, preservando tipografia e identidade existentes.

## Motion e Review Animations

O propósito é explicar a circulação do reconhecimento no encerramento de uma página de apresentação. Os pontos percorrem trajetórias em **22 s e 32 s**, com rotação inversa para manter sua forma. O medalhão varia sua altura em apenas **6 px durante 8 s**. O hover utiliza transição interrompível de **200 ms**, condicionada a ponteiro preciso e preferência por movimento. As entradas reutilizam o observador existente, com defasagens de 70 ms.

Loops usam somente `transform`; materiais e sombras são estáticos. Não há atualização por frame em JavaScript. A pausa global, a suspensão fora da tela e a visibilidade da página continuam sob responsabilidade do mecanismo existente. Movimento reduzido mantém a composição visível e estática.

| Before                                                                                          | After                                                                                                          | Why                                                                    |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Na primeira passagem, ocultar a segunda trajetória no mobile mantinha sua contrarrotação ativa. | A trajetória e sua contrarrotação recebem `animation: none`; o mobile usa três loops, contra cinco no desktop. | Evitar trabalho invisível e simplificar a circulação em telas menores. |

Referências: `finale-artwork.css:76` (trajetórias), `:107` (hover), `:111` (medalhão), `:394` (mobile) e `:407` (movimento reduzido).

**Verdict: Approve.** As pausas congelam os tempos dos loops, o hover reverte sem salto e a preferência por movimento reduzido elimina as animações. A peça não introduz ações de teclado nem controles decorativos. Não foram identificadas regressões de movimento nos cenários exercitados.

## Revisão visual — Taste / Impeccable

### ROUND 1

Seen in one second: a chamada principal à esquerda e uma jornada de reconhecimento à direita.

Idea (one sentence): o reconhecimento estudantil se torna um medalhão que conecta aprender, conquistar e compartilhar.

Live thing: a circulação dos pontos e a resposta discreta do medalhão ao hover; o cadastro continua sendo a ação real.

Layout words by section: CTA=constelação narrativa; demais seções preservadas.

Scores: design 7 · usability 8 · creativity 7.5 · content 8 → overall 7.5, avaliação interna restrita ao recorte.

Caps applied: materiais, linhas e marcos exigidos pela referência prevalecem sobre defaults estéticos da skill.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. O material inicial parecia esverdeado no desktop: usar o bronze quente já presente na moeda do login.
2. As legendas pequenas quebravam cedo: ampliar os marcos no desktop e manter legendas de pelo menos 13 px no tablet.
3. Uma animação da trajetória secundária continuava ativa no mobile: desativar os dois grupos envolvidos.

### ROUND 2 — final

Seen in one second: a moeda Puclim reúne os três marcos e fecha a apresentação.

Idea (one sentence): o reconhecimento conecta conhecimento e próximas oportunidades.

Live thing: trajetórias lentas e hover de 200 ms; os CTAs originais continuam funcionais.

Layout words by section: CTA=constelação narrativa adaptada; restante preservado.

Scores: design 8 · usability 8.5 · creativity 7.5 · content 8 → overall 8.05, avaliação interna do recorte, sem equivalência a premiação externa.

Caps applied: exceções da referência documentadas abaixo; não há falha funcional ou de composição identificada neste recorte.

Top three problems: os três achados da primeira passagem foram corrigidos; não restou prioridade visual bloqueante no escopo.

O lint Taste final retornou **0 FAIL / 0 WARN**. O inspector da build retornou **0 FAIL / 3 WARN** com exceções declaradas para os materiais, divisores e órbitas pedidos, além de dois diagnósticos fora do significado real deste recorte:

- `eyebrow`: “Compartilhar” pertence à ilustração descrita como imagem; no mobile, a heurística o interpreta como um rótulo acima do título. Não é um kicker adicionado à coluna de conteúdo.
- `few-pictures`: a contagem de fragmentos de produto na página não justifica acrescentar fotografias a uma ilustração de encerramento nem modificar outras seções.
- Os avisos remanescentes — variedade tipográfica, texto secundário e ausência de vídeo — dizem respeito à página existente, fora da alteração autorizada.

## Validações

- Build de produção com TypeScript, lint e formatação aprovados.
- **9 testes Playwright da landing aprovados**, incluindo navegação, temas, teclado e demonstrações.
- Chromium em **1736, 1440, 1280, 1024, 768, 390 e 320 px**, nos dois temas: **14 capturas**, sem overflow e sem erros JavaScript.
- Comparação do HTML e das caixas dos elementos à esquerda com o estado anterior: conteúdo idêntico e diferenças geométricas inferiores a 0,1 px.
- Contraste dos marcos: texto principal **11,32:1** no claro / **11,04:1** no escuro; secundário **6,43:1** / **7,20:1**.
- Pausa global, suspensão fora da tela, progresso dos pontos, hover e reversão, foco de teclado, modo touch e movimento reduzido exercitados.
- Cadastro de aluno e âncora para outros perfis exercitados. Zoom CSS de 200% sem overflow.
- Capturas do CTA comparadas com o estado anterior; as nove folhas do inspector foram abertas e revistas.

Evidências: `.taste-skill/finale-before/`, `.taste-skill/finale-after/` e `.taste-skill/finale-inspection/`.

Limites: validação em Chromium e dispositivos emulados; não houve benchmark em aparelhos físicos, teste com leitor de tela real ou comparação em Safari/Firefox.
