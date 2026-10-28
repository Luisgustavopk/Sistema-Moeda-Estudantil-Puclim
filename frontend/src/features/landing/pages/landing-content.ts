export const navigation = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#possibilidades', label: 'Possibilidades' },
  { href: '#para-voce', label: 'Para você' },
]

export const audiences = [
  {
    name: 'Estudantes',
    heading: 'Sua dedicação aparece.',
    description:
      'Participe da vida acadêmica, receba moedas pelo seu empenho e escolha como aproveitar suas conquistas.',
    benefits: [
      'Acompanhe seu saldo e seu histórico.',
      'Explore quizzes, missões e conquistas.',
      'Troque moedas por vantagens do catálogo.',
    ],
    action: 'Criar minha conta',
    href: '/cadastro/aluno',
    note: 'Seu vínculo com a instituição faz parte do cadastro.',
  },
  {
    name: 'Professores',
    heading: 'Reconheça quem vai além.',
    description:
      'Valorize a participação e o desenvolvimento dos seus alunos com um reconhecimento que continua depois da aula.',
    benefits: [
      'Envie moedas com um motivo claro.',
      'Acompanhe suas transferências e seu saldo.',
      'Proponha missões e perguntas para os alunos.',
    ],
    action: 'Acessar minha conta',
    href: '/login',
    note: 'O acesso do professor é cadastrado pela instituição de ensino.',
  },
  {
    name: 'Empresas',
    heading: 'Faça parte da conquista.',
    description:
      'Aproxime sua empresa da comunidade acadêmica oferecendo vantagens que os estudantes podem resgatar com suas moedas.',
    benefits: [
      'Cadastre e gerencie suas vantagens.',
      'Acompanhe os resgates das suas ofertas.',
      'Confira os cupons apresentados pelos alunos.',
    ],
    action: 'Cadastrar minha empresa',
    href: '/cadastro/empresa',
    note: 'Selecione “Empresa” no tipo de organização.',
  },
  {
    name: 'Instituições',
    heading: 'Conecte sua comunidade.',
    description:
      'Reúna alunos e professores em um ambiente de reconhecimento e acompanhe as ferramentas da sua instituição.',
    benefits: [
      'Vincule os estudantes à instituição.',
      'Cadastre ou importe seus professores.',
      'Acesse a gestão do Fundo institucional.',
    ],
    action: 'Cadastrar minha instituição',
    href: '/cadastro/empresa',
    note: 'Selecione “Instituição de ensino” no tipo de organização.',
  },
]

export const questions = [
  {
    question: 'Como consigo moedas?',
    answer:
      'Professores podem reconhecer seu desempenho e sua participação enviando moedas com um motivo. Você também pode acompanhar os quizzes e as missões disponíveis no seu espaço.',
  },
  {
    question: 'As moedas são dinheiro?',
    answer:
      'São moedas virtuais para uso dentro do puclim. Elas representam reconhecimento e podem ser utilizadas para resgatar as vantagens disponíveis no catálogo.',
  },
  {
    question: 'Quem pode criar uma conta?',
    answer:
      'Estudantes e organizações podem se cadastrar pela plataforma. O acesso dos professores é cadastrado pela instituição de ensino.',
  },
  {
    question: 'Como funciona um resgate?',
    answer:
      'Escolha uma vantagem no catálogo e confirme o resgate com seu saldo. Você recebe um cupom, que é conferido pela empresa parceira na hora de utilizar a vantagem.',
  },
  {
    question: 'Onde vejo o que recebi e utilizei?',
    answer:
      'No extrato da sua conta você acompanha as movimentações de moedas. Os cupons das vantagens resgatadas ficam disponíveis no seu espaço de cupons.',
  },
  {
    question: 'Como minha organização participa?',
    answer:
      'No cadastro de organização, selecione Empresa para oferecer vantagens ou Instituição de ensino para vincular estudantes e cadastrar professores.',
  },
]
