import { DATA_MODE, http } from '@/shared/lib/http'
import { ApiError } from '@/shared/lib/errors'
import type * as T from './types'

function request<R>(
  path: string,
  method = 'GET',
  input?: unknown,
  key?: string,
): Promise<R> {
  if (DATA_MODE === 'demo')
    return Promise.reject(
      new ApiError(
        'A gamificação requer conexão com a API. Entre no ambiente integrado para utilizar este recurso.',
        503,
      ),
    )
  return http<R>(`/gamificacao${path}`, {
    method,
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
  })
}
const id = encodeURIComponent
export const gameApi = {
  context: () =>
    request<{ semester: string; today: string; maxAllocation: number }>(
      '/contexto',
    ),
  profile: (studentId?: string) =>
    request<T.Profile>(studentId ? `/perfis/${id(studentId)}` : '/perfil'),
  ranking: (
    semester: string,
    type: string,
    page: number,
    institution?: string,
  ) =>
    request<T.Ranking>(
      `/ranking?${new URLSearchParams({ ...(semester ? { semester } : {}), type, page: String(page), ...(institution ? { institution } : {}) })}`,
    ),
  notices: () => request<T.Notice[]>('/notificacoes'),
  read: (noticeId: string) =>
    request<void>(`/notificacoes/${id(noticeId)}/ler`, 'POST'),
  questions: () => request<T.Question[]>('/perguntas'),
  saveQuestion: (input: T.QuestionInput, questionId?: string) =>
    request<T.Question>(
      `/perguntas${questionId ? `/${id(questionId)}` : ''}`,
      questionId ? 'PUT' : 'POST',
      input,
    ),
  deleteQuestion: (questionId: string) =>
    request<void>(`/perguntas/${id(questionId)}`, 'DELETE'),
  quizzes: () => request<T.QuizStatus>('/quizzes'),
  startQuiz: () => request<T.Quiz>('/quizzes/hoje', 'POST'),
  submitQuiz: (quizId: string, answers: number[]) =>
    request<T.Quiz>(`/quizzes/${id(quizId)}/respostas`, 'POST', { answers }),
  missions: () => request<T.Mission[]>('/missoes'),
  createMission: (input: T.ActivityInput, key: string) =>
    request<T.Mission>('/missoes', 'POST', input, key),
  acceptMission: (missionId: string) =>
    request<T.Mission>(`/missoes/${id(missionId)}/aceitar`, 'POST'),
  closeMission: (missionId: string) =>
    request<T.Mission>(`/missoes/${id(missionId)}/encerrar`, 'POST'),
  deadline: (missionId: string, deadline: string) =>
    request<T.Mission>(`/missoes/${id(missionId)}/prazo`, 'PATCH', {
      deadline,
    }),
  deliver: (participationId: string, text: string) =>
    request<T.Mission>(
      `/participacoes/${id(participationId)}/entregar`,
      'POST',
      { text },
    ),
  review: (participationId: string, approve: boolean, text: string) =>
    request<T.Mission>(
      `/participacoes/${id(participationId)}/${approve ? 'aprovar' : 'devolver'}`,
      'POST',
      { text },
    ),
  rewards: () => request<T.Payment[]>('/recompensas'),
  fund: (semester: string) => request<T.Fund>(`/fundo/${id(semester)}`),
  allocate: (semester: string, input: { amount: number; origin: string }) =>
    request<T.Fund>(`/fundo/${id(semester)}/dotacao`, 'POST', input),
  retry: (semester: string) =>
    request<void>(`/fundo/${id(semester)}/reprocessar`, 'POST'),
  closeSemester: (semester: string) =>
    request<void>(`/fundo/${id(semester)}/encerrar`, 'POST'),
  beneficiaries: () => request<T.Beneficiary[]>('/beneficiarias'),
  donate: (code: string, beneficiaryId: string) =>
    request<T.Donation>(`/cupons/${id(code)}/doar`, 'POST', { beneficiaryId }),
  donations: () => request<T.Donation[]>('/doacoes'),
  challenges: () => request<T.Challenge[]>('/desafios'),
  saveChallenge: (
    input: T.ActivityInput & { budget: number },
    challengeId?: string,
  ) =>
    request<T.Challenge>(
      `/desafios${challengeId ? `/${id(challengeId)}` : ''}`,
      challengeId ? 'PUT' : 'POST',
      input,
    ),
  challengeAction: (
    challengeId: string,
    action: 'enviar' | 'cancelar' | 'encerrar',
  ) => request<T.Challenge>(`/desafios/${id(challengeId)}/${action}`, 'POST'),
}
