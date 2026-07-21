import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initializeTheme } from './hooks/useTheme'
import './index.css'

// 在 React 渲染前应用主题，避免首屏闪烁
initializeTheme()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
