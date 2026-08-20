import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { bootstrapDesktopData } from './core/services/desktopDataService.ts'

bootstrapDesktopData()
  .catch((error) => console.error('初始化桌面数据文件失败:', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
