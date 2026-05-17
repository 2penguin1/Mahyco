import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import './lib/i18n'
import App from './App.tsx'
import { AuthProvider } from './lib/providers/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './lib/context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
