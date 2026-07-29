import { AppShell } from './components/shell/AppShell'
import { AppProvider } from './state/AppContext'

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
