# Base pronta para apresentação do Puclim

Base fictícia cadastrada na API real em 21/10/2026. Abra **http://localhost:5173** no modo integrado (`VITE_DATA_MODE=api`). Os cadastros anteriores foram preservados.

**Senha de todas as contas abaixo: `Puclim@2026`.** Os professores já fizeram a troca da senha temporária e podem acessar o painel diretamente.

| Perfil | Nome | Login | Saldo inicial da apresentação |
| --- | --- | --- | ---: |
| Instituição de ensino | Instituto Puclim — Demonstração | `instituicao.demo` | — |
| Professor | Marcos Oliveira | `professor.demo` | 170 |
| Professora | Juliana Costa | `professora.demo` | 670 |
| Aluna | Ana Souza | `ana.demo` | 278 |
| Aluno | Bruno Lima | `bruno.demo` | 45 |
| Aluna | Carla Mendes | `carla.demo` | 195 |
| Aluno | Diego Alves | `diego.demo` | 160 |
| Aluna | Elisa Santos | `elisa.demo` | 40 |
| Empresa | Cantina Sabor do Campus | `cantina.demo` | — |
| Empresa | Papelaria Ideias no Papel | `papelaria.demo` | — |
| Beneficiária | Instituto Aprender Juntos | `ong.demo` | — |

Os saldos mudam conforme você demonstra as operações. Toda movimentação foi criada pelos serviços da aplicação e conferida com o extrato; não houve alteração manual de saldo no banco.

## Roteiro sugerido

1. **Instituição — `instituicao.demo`:** abra **Professores** e mostre Marcos e Juliana. O botão **Cadastrar professor** permite demonstrar um cadastro individual. Em **Fundo institucional**, há uma dotação fictícia de 1.000 moedas e pagamentos de bônus, com saldo inicial restante de 992 moedas.
2. **Professor — `professor.demo`:** abra **Entre alunos**. Marcos tem Ana, Bruno, Carla e Diego vinculados, com critérios publicados. Mostre os três pedidos: um pendente, um aprovado e um rejeitado. O pedido pendente de **Ana → Bruno, 40 moedas**, pode ser aprovado ao vivo: preencha o parecer e clique em **Aprovar transferência**. O saldo do professor permanece igual.
3. **Aluno — `bruno.demo`:** após essa aprovação, Bruno passa de **45 para 85 moedas**. Em **Transferências**, mostre a decisão e o parecer; em **Meu extrato**, filtre por **Transferências recebidas**. Em **Vantagens**, ele pode resgatar um **Kit de estudos por 80 moedas** e gerar um novo cupom.
4. **Empresa — `papelaria.demo`:** em **Conferir cupons**, apresente o código gerado no passo anterior e registre sua utilização. Já existe outro cupom de Bruno utilizado, para mostrar o histórico e o bloqueio de reutilização.
5. **Aluna — `ana.demo`:** mostre saldo, ranking, nível, conquistas e histórico do quiz. Ana já concluiu o quiz do dia com nota máxima e tem um cupom válido de **Café com pão de queijo**. Há uma missão concluída e o histórico de seus reconhecimentos.
6. **Professor — `professor.demo`:** abra **Missões**, clique em **Documentar o fluxo de transferências** e mostre a entrega de Bruno aguardando análise, a participação de Carla em andamento e a de Ana concluída. A missão **Revisar a acessibilidade das telas** tem vagas disponíveis.
7. **Professora — `professora.demo`:** Juliana tem Carla, Diego e Elisa vinculados. Em **Missões**, a atividade **Boas práticas de trabalho em equipe** tem uma entrega de Diego devolvida com orientação de correção.
8. **Beneficiária — `ong.demo`:** em **Doações recebidas**, mostre o caderno doado por Carla. Em `carla.demo`, a doação também aparece no histórico e nas conquistas.

Para demonstrar o envio de uma nova solicitação, entre em `ana.demo`, abra **Transferências**, escolha Marcos, selecione um colega vinculado, informe quantidade e motivo e aceite os critérios. Depois entre em `professor.demo` para analisar. Elisa está vinculada apenas a Juliana e não aparece como destinatária nas transferências mediadas por Marcos.

## Dados preparados

- **Vínculos:** Marcos → Ana, Bruno, Carla e Diego; Juliana → Carla, Diego e Elisa.
- **Transferências:** Ana → Bruno, 40 moedas, pendente; Bruno → Carla, 25 moedas, aprovada; Carla → Diego, 30 moedas, rejeitada com parecer.
- **Catálogo:** café com pão de queijo (30), almoço do estudante (90), kit de estudos (80) e caderno universitário (50), todos com imagens.
- **Cupons:** um válido de Ana, um utilizado de Bruno e um doado por Carla.
- **Gamificação:** cinco perguntas, quizzes concluídos por Ana e Bruno, níveis, badges e ranking calculados pelos serviços. Diego, Carla e Elisa podem responder ao quiz durante a apresentação.
- **Missões:** três atividades com vagas, entregas em andamento, aguardando aprovação, concluídas e devolvidas. Prazos iniciais: 30 dias após a preparação.
- **Notificações:** reconhecimentos, pedidos, decisões, missões e doação. E-mails locais podem ser vistos em **http://localhost:8025**.

O quiz diário e os bônus associados à data são referentes ao dia da preparação. A partir do dia seguinte, os quizzes concluídos continuam no histórico e uma nova tentativa diária pode ficar disponível.

## Preparar novamente

Com o backend e o banco rodando, a partir da raiz do projeto:

```bash
python3 scripts/seed-demo.py
```

O script usa somente a biblioteca padrão do Python 3.9+ e a API local em `http://127.0.0.1:8080/api`. Para outra porta local, use `--api http://127.0.0.1:8081/api`.

Reexecutar reutiliza os cadastros, lançamentos e cupons e preserva decisões e participações já realizadas. **Não reseta a apresentação nem restaura os saldos iniciais.** As contas de demonstração precisam manter a senha acima para serem reutilizadas. O resumo com IDs, saldos, transferências e códigos dos cupons fica em `.cache/demo-summary.json`, ignorado pelo Git.
