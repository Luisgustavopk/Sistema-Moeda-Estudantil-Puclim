import { createContext, useContext } from 'react'
export type ToastTone = 'success' | 'info' | 'error'
export const ToastContext = createContext<
  (message: string, tone?: ToastTone) => void
>(() => undefined)
export const useToast = () => useContext(ToastContext)
