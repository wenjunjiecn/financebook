import React, { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DetailPanel } from './components/DetailPanel'
import { ManualTransactionModal } from './components/ManualTransactionModal'
import { ToastProvider } from './components/Toast'
import { OverviewView } from './views/OverviewView'
import { TransactionsView } from './views/TransactionsView'
import { ImportView } from './views/ImportView'
import { AccountsView } from './views/AccountsView'
import { CategoriesView } from './views/CategoriesView'
import { SettingsView } from './views/SettingsView'
import { useAppStore } from './store/useAppStore'

export const App: React.FC = () => {
  const { activeTab, loadAllData } = useAppStore()
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

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
    settings: '设置',
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden font-sans bg-white text-gray-900">
        <Sidebar onOpenManualModal={() => setIsManualModalOpen(true)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Title bar — top padding clears macOS traffic light buttons */}
          <div className="pt-8 pb-2 px-5 border-b border-gray-100 app-drag-region flex items-center justify-between shrink-0 bg-white">
            <span className="text-[13px] font-medium text-gray-600">{tabTitles[activeTab]}</span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              本地加密
            </span>
          </div>

          <div className="flex-1 overflow-hidden bg-gray-50/50">{renderActiveView()}</div>
        </main>

        <DetailPanel />

        <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
      </div>
    </ToastProvider>
  )
}

export default App
