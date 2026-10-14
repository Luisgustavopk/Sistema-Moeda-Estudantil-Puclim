import { ApiError } from './errors'
export const DATA_MODE =
  import.meta.env.VITE_DATA_MODE === 'demo' ? 'demo' : 'api'
const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export async function http<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const headers = new Headers(options.headers)
    if (!(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json')
    if (
      options.method &&
      !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())
    ) {
      // Fetch a fresh token when login/logout/password change cleared the cookie.
      if (
        !document.cookie
          .split('; ')
          .some((value) => value.startsWith('XSRF-TOKEN='))
      )
        await http('/auth/csrf')
    }
    const csrf = document.cookie
      .split('; ')
      .find((value) => value.startsWith('XSRF-TOKEN='))
      ?.slice('XSRF-TOKEN='.length)
    if (csrf && options.method && options.method !== 'GET')
      headers.set('X-XSRF-TOKEN', decodeURIComponent(csrf))
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers,
    })
    if (!response.ok) {
      const body: { message?: string } = await response.json().catch(() => ({}))
      if (response.status === 401)
        window.dispatchEvent(new Event('puclim:unauthorized'))
      throw new ApiError(
        body.message ||
          (response.status === 401
            ? 'Sua sessão expirou. Entre novamente.'
            : 'Não foi possível concluir a solicitação.'),
        response.status,
      )
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.',
      503,
    )
  } finally {
    clearTimeout(timeout)
  }
}
