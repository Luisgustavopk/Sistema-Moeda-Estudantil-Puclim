import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

const RouterContent = createContext<ReactNode>(null)
function Content() {
  return useContext(RouterContent)
}
// Um único roteador permite confirmar saídas com alterações pendentes, inclusive Voltar.
const router = createBrowserRouter([{ path: '*', element: <Content /> }])

export function AppRouter({ children }: PropsWithChildren) {
  return (
    <RouterContent.Provider value={children}>
      <RouterProvider router={router} />
    </RouterContent.Provider>
  )
}
