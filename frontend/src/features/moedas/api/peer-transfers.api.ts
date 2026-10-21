import { http } from '@/shared/lib/http'

export interface PeerMember {
  id: string
  name: string
  course: string
  active: boolean
}
export interface PeerGroup {
  teacherId: string
  teacherName: string
  criteria: string | null
  students: PeerMember[]
}
export interface PeerRequest {
  id: string
  teacherId: string
  teacherName: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  amount: number
  reason: string
  criteria: string
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA'
  feedback: string | null
  createdAt: string
  reviewedAt: string | null
}
export interface PeerOverview {
  groups: PeerGroup[]
  availableStudents: PeerMember[]
  requests: PeerRequest[]
}
export interface PeerTransferInput {
  criteria: string
  teacherId: string
  recipientId: string
  amount: number
  reason: string
}
const base = '/transferencias-alunos'
export const peerTransfersApi = {
  overview: () => http<PeerOverview>(base),
  policy: (criteria: string) =>
    http<void>(`${base}/criterios`, {
      method: 'PUT',
      body: JSON.stringify({ criteria }),
    }),
  link: ({ studentId, active }: { studentId: string; active: boolean }) =>
    http<void>(`${base}/vinculos/${encodeURIComponent(studentId)}`, {
      method: active ? 'PUT' : 'DELETE',
    }),
  request: ({ input, key }: { input: PeerTransferInput; key: string }) =>
    http<PeerRequest>(base, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(input),
    }),
  review: ({
    id,
    approve,
    feedback,
  }: {
    id: string
    approve: boolean
    feedback: string
  }) =>
    http<PeerRequest>(`${base}/${encodeURIComponent(id)}/analise`, {
      method: 'POST',
      body: JSON.stringify({ approve, feedback }),
    }),
}
