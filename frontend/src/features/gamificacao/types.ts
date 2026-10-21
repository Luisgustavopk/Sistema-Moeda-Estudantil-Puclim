export interface Badge {
  id: string
  name: string
  description: string
  criterion: string
  rarity: string
  icon: string
  target: number
  progress: number
  unlockedAt: string | null
}
export interface Rank {
  position: number
  studentId: string
  name: string
  course: string
  institution: string
  received: number
  streak: number
  level: number
  firstCoin: string | null
  avatar?: string
}
export interface Ranking {
  content: Rank[]
  page: number
  size: number
  total: number
  own: Rank | null
  semester: string
  type: string
}
export interface Profile {
  realName?: string | null
  appearance?: import('./profile-customization').ProfileCustomization
  statsHidden?: boolean
  maximumLevel?: boolean
  activity?:
    | {
        id: string
        title: string
        date: string
        level: number | null
        badgeId: string | null
      }[]
    | null
  id: string
  name: string
  course: string
  institution: string
  level: number
  totalReceived: number
  nextLevelAt: number | null
  levelStart: number
  progressPercent: number
  streak: number
  bestStreak: number
  coinPosition: number | null
  streakPosition: number | null
  badges: Badge[]
  history: { level: number; total: number; date: string }[]
}
export interface PublicProfileDto {
  id: string
  name: string
  realName: string | null
  course: string
  institution: string
  level: number
  progressPercent: number
  maximumLevel: boolean
  appearance: Omit<
    import('./profile-customization').ProfileCustomization,
    'visibility'
  >
  badges: Badge[]
  activity: NonNullable<Profile['activity']> | null
  stats: Pick<
    Profile,
    | 'totalReceived'
    | 'nextLevelAt'
    | 'levelStart'
    | 'streak'
    | 'bestStreak'
    | 'coinPosition'
    | 'streakPosition'
  > | null
}
export interface Notice {
  id: string
  type: string
  title: string
  message: string
  date: string
  readAt: string | null
  referenceId: string | null
}
export interface Question {
  id: string
  prompt: string
  area: string
  options: string[]
  correctIndex: number
  active: boolean
}
export type QuestionInput = Omit<Question, 'id'>
export interface Quiz {
  id: string
  day: string
  completedAt: string | null
  correctCount: number
  errors: number
  grade: number
  streak: number
  items: {
    id: string
    prompt: string
    area: string
    options: string[]
    correctIndex: number | null
    selectedIndex: number | null
  }[]
}
export interface QuizStatus {
  streak: number
  bestStreak: number
  daysToReward: number
  nextAvailable: string
  today: Quiz | null
  history: Quiz[]
}
export interface Participation {
  id: string
  studentId: string
  studentName: string
  status: string
  delivery: string | null
  feedback: string | null
  acceptedAt: string
  submittedAt: string | null
  approvedAt: string | null
  history: { action: string; text: string; date: string }[]
}
export interface Mission {
  id: string
  teacherName: string
  title: string
  description: string
  reward: number
  capacity: number
  occupied: number
  reserved: number
  deadline: string
  status: string
  participants: Participation[]
}
export interface ActivityInput {
  title: string
  description: string
  reward: number
  capacity: number
  deadline: string
}
export interface Challenge extends ActivityInput {
  id: string
  budget: number
  status: string
  companyName: string
}
export interface Payment {
  id: string
  studentName: string
  semester: string
  kind: string
  amount: number
  status: string
  sourceKey: string
  originOperationId: string | null
  date: string
  paidAt: string | null
}
export interface Fund {
  semester: string
  allocation: number
  balance: number
  reserved: number
  origin: string | null
  movements: { kind: string; amount: number; sourceKey: string; date: string }[]
  payments: Payment[]
  winners: {
    position: number
    studentName: string
    received: number
    streak: number
    reward: number
  }[]
}
export interface Beneficiary {
  id: string
  name: string
}
export interface Donation {
  id: string
  advantageName: string
  companyName: string
  beneficiaryName: string
  date: string
}
