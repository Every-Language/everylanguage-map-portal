import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { QueryProvider } from './shared/providers/QueryProvider'
import { initializeProjectStore } from './shared/stores/project'
import './index.css'

// Initialize the project store early
initializeProjectStore()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>,
)
