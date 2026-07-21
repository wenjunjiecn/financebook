import React from 'react'
import {
  LayoutDashboard,
  Receipt,
  FileUp,
  Wallet,
  Tags,
  Settings,
  Plus,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useAppStore, ActiveTab } from '../store/useAppStore'

interface SidebarProps {
  onOpenManualModal: () => void
}

const navItems: { id: ActiveTab; label: string; icon: LucideIcon; badge?: number }[] = [
  { id: 'overview', label: '总览', icon: LayoutDashboard },
  { id: 'transactions', label: '交易明细', icon: Receipt },
  { id: 'import', label: '导入', icon: FileUp },
  { id: 'accounts', label: '账户', icon: Wallet },
  { id: 'categories', label: '分类', icon: Tags },
  { id: 'settings', label: '设置', icon: Settings },
]

export const Sidebar: React.FC<SidebarProps> = ({ onOpenManualModal }) => {
  const { activeTab, setActiveTab, transactions } = useAppStore()

  const items = navItems.map((item) => {
    if (item.id === 'transactions') return { ...item, badge: transactions.length }
    return item
  })

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 select-none">
      {/* Brand — pushed down below macOS traffic light buttons */}
      <div className="pt-8 pb-1 px-4 app-drag-region shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-semibold text-gray-900">FinanceBook</span>
        </div>
      </div>

      {/* Add button */}
      <div className="px-3 pt-2 pb-3">
        <button
          onClick={onOpenManualModal}
          className="btn-primary w-full py-2 px-3 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span>记一笔</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] ${
                isActive
                  ? 'nav-item-active'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={2} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.badge > 999 ? '999+' : item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-50 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" strokeWidth={2} />
          <span className="text-[11px] text-gray-400">数据本地加密存储</span>
        </div>
      </div>
    </aside>
  )
}
