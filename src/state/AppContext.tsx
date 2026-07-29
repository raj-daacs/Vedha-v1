// state/AppContext.tsx
// ---------------------------------------------------------------------------
// The single context. Components read state and dispatch through `useApp()`;
// nothing threads props for app state.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { initialState, reducer } from './reducer'
import type { Action, AppState } from './types'

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
