import './assets/custom-title-bar.css'
import './styles/index.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './AppWrapper'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ThemeProvider } from './contexts/ThemeContext'

const Main = () => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Main />)
