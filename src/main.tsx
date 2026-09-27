import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './app/App'
import './styles/global.css'
import './styles/notion.css'
import './styles/editor.css'
import './styles/settings.css'
import { FeedbackProvider } from './shared/components/FeedbackProvider'
import { AppErrorBoundary } from './shared/components/AppErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary><FeedbackProvider><App /></FeedbackProvider></AppErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)
