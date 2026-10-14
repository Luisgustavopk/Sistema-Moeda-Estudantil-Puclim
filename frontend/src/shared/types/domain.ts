export type Role = 'ALUNO' | 'PROFESSOR' | 'EMPRESA'
export type PartnerKind = 'EMPRESA' | 'ENSINO' | 'BENEFICIARIA'
export type Category = 'Alimentação' | 'Material' | 'Eventos' | 'Descontos'

export interface Account {
  id: string
  role: Role
  name: string
  email: string
  login: string
  balance: number
  active: boolean
  cpf?: string
  rg?: string
  address?: string
  course?: string
  institutionId?: string
  department?: string
  cnpj?: string
  phone?: string
  description?: string
  partnerKind?: PartnerKind
  mustChangePassword?: boolean
}

export interface Institution {
  id: string
  name: string
}
export interface StudentSummary {
  id: string
  name: string
  course: string
  institution: string
}
export interface TeacherSummary {
  id: string
  name: string
  login: string
  department: string
  email: string
}
export interface StudentRegistration {
  name: string
  email: string
  login: string
  password: string
  cpf: string
  rg: string
  address: string
  course: string
  institutionId: string
}
export interface PartnerRegistration {
  name: string
  email: string
  login: string
  password: string
  cnpj: string
  phone: string
  description: string
  partnerKind: PartnerKind
}
export interface ProfileUpdate {
  name: string
  email: string
  address?: string
  course?: string
  phone?: string
  description?: string
}
export interface Advantage {
  id: string
  companyId: string
  companyName: string
  name: string
  description: string
  photo: string
  category: Category
  cost: number
  active: boolean
}
export type AdvantageInput = Pick<
  Advantage,
  'name' | 'description' | 'photo' | 'category' | 'cost' | 'active'
>
export interface Transaction {
  id: string
  date: string
  kind: 'COTA' | 'RECEBIMENTO' | 'ENVIO' | 'RESGATE'
  amount: number
  description: string
  counterpart?: string
  reason?: string
}
export interface Coupon {
  id: string
  advantageId: string
  code: string
  studentId: string
  studentName: string
  companyId: string
  companyName: string
  advantageName: string
  cost: number
  date: string
  status: 'VALIDO' | 'UTILIZADO'
  usedAt?: string
}
export interface ImportRow {
  line: number
  name: string
  cpf: string
  department: string
  email: string
  login: string
  error?: string
}
export interface ImportResult {
  created: number
  errors: { line: number; message: string }[]
  access: { name: string; login: string; temporaryPassword?: string }[]
}
export interface Notification {
  id: string
  subject: string
  body: string
  date: string
  recipient: string
}

export interface PuclimApi {
  session(): Promise<Account | null>
  login(login: string, password: string): Promise<Account>
  logout(): Promise<void>
  registerStudent(input: StudentRegistration): Promise<Account>
  registerPartner(input: PartnerRegistration): Promise<Account>
  institutions(): Promise<Institution[]>
  updateProfile(input: ProfileUpdate): Promise<Account>
  changePassword(currentPassword: string, password: string): Promise<Account>
  deleteAccount(): Promise<void>
  students(): Promise<StudentSummary[]>
  teachers(): Promise<TeacherSummary[]>
  importTeachers(rows: ImportRow[]): Promise<ImportResult>
  transactions(): Promise<Transaction[]>
  transfer(
    studentId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction>
  advantages(own?: boolean): Promise<Advantage[]>
  uploadPhoto(file: File): Promise<string>
  saveAdvantage(input: AdvantageInput, id?: string): Promise<Advantage>
  deleteAdvantage(id: string): Promise<void>
  redeem(id: string): Promise<Coupon>
  coupons(): Promise<Coupon[]>
  checkCoupon(code: string): Promise<Coupon>
  useCoupon(code: string): Promise<Coupon>
  notifications(): Promise<Notification[]>
}
