import React, { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { DetailPanel } from './components/DetailPanel'
import { ManualTransactionModal } from './components/ManualTransactionModal'
import { ChatPanel } from './components/ChatPanel'
import { ToastProvider } from './components/Toast'
import { OverviewView } from './views/OverviewView'
import { TransactionsView } from './views/TransactionsView'
import { ImportView } from './views/ImportView'
import { AccountsView } from './views/AccountsView'
import { CategoriesView } from './views/CategoriesView'
import { BudgetView } from './views/BudgetView'
import { SettingsView } from './views/SettingsView'
import { useAppStore } from './store/useAppStore'
import { useTheme } from './hooks/useTheme'

export const App: React.FC = () => {
  const { activeTab, loadAllData, chatOpen, setChatOpen, apiKey } = useAppStore()
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  // 引入主题 hook，保证 DOM class 与用户偏好同步
  useTheme()

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />
      case 'transactions':
        return <TransactionsView />
      case 'import':
        return <ImportView />
      case 'accounts':
        return <AccountsView />
      case 'categories':
        return <CategoriesView />
      case 'budget':
        return <BudgetView />
      case 'settings':
        return <SettingsView />
      default:
        return <OverviewView />
    }
  }

  const tabTitles: Record<string, string> = {
    overview: '总览',
    transactions: '交易明细',
    import: '导入',
    accounts: '账户',
    categories: '分类',
    budget: '预算',
    settings: '设置',
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden font-sans bg-white dark:bg-[#0b0e14] text-gray-900 dark:text-gray-100">
        <Sidebar onOpenManualModal={() => setIsManualModalOpen(true)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Title bar — top padding clears macOS traffic light buttons */}
          <div className="pt-8 pb-2 px-5 border-b border-gray-100 dark:border-[#232838] app-drag-region flex items-center justify-between shrink-0 bg-white dark:bg-[#161a23]">
            <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">{tabTitles[activeTab]}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              本地加密
            </span>
          </div>

          <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-[#0b0e14]">{renderActiveView()}</div>
        </main>

        <DetailPanel />

        <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />

        {/* Chat Panel */}
        <ChatPanel />

        {/* Chat floating button */}
        {apiKey && !chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex items-center justify-center hover:scale-105 transition-transform app-no-drag"
            title="AI 聊天记账"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </ToastProvider>
  )
}

export default App
