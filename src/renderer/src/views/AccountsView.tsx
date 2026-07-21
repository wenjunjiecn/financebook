import React, { useState } from 'react'
import { Wallet, Plus, CreditCard, Landmark, Coins, Smartphone } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'
import { formatCentsToYuan } from '../utils/formatters'
import type { Account } from '../../../shared/types'

const accountTypeConfig: Record<Account['type'], { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string }> = {
  checking: { label: '银行账户', icon: Landmark, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-500' },
  credit: { label: '信用卡', icon: CreditCard, bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-500' },
  wechat: { label: '微信', icon: Smartphone, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500' },
  alipay: { label: '支付宝', icon: Smartphone, bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-500' },
  cash: { label: '现金', icon: Coins, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500' },
}

export const AccountsView: React.FC = () => {
  const { accounts, addAccount } = useAppStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<Account['type']>('checking')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('错误', '账户名称不能为空'); return }
    await addAccount({ name, type, balance: 0, currency: 'CNY' })
    toast.success('已创建', `「${name}」已添加`)
    setName('')
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between animate-fade-in">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">账户管理</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">管理微信、支付宝、银行卡及现金账户</p>
          </div>
          <div className="card px-4 py-2 text-right">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide block">总资产</span>
            <span className="text-[17px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatCentsToYuan(totalBalance)}</span>
          </div>
        </div>

        {/* Account Cards */}
        {accounts.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#1d212c] flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">还没有任何账户</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">在下方添加你的第一个账户</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {accounts.map((acc, idx) => {
              const config = accountTypeConfig[acc.type] || accountTypeConfig.checking
              const Icon = config.icon
              return (
                <div key={acc.id} className="card card-hover p-4 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}><Icon className={`w-4 h-4 ${config.text}`} /></div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{config.label}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-[13px] mb-2 truncate">{acc.name}</h4>
                  <div className="pt-2 border-t border-gray-50 dark:border-[#1d212c] flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">余额</span>
                    <span className="font-mono text-[15px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatCentsToYuan(acc.balance)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Account Form */}
        <div className="card p-4 max-w-md animate-slide-up">
          <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-blue-500" />添加新账户
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-400 dark:text-gray-500 block mb-1">账户名称</label>
              <input type="text" placeholder="例如：招商银行信用卡" value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full rounded-md px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 dark:text-gray-500 block mb-1">账户类型</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(accountTypeConfig) as Account['type'][]).map((t) => {
                  const config = accountTypeConfig[t]
                  const Icon = config.icon
                  const isActive = type === t
                  return (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`p-2 rounded-md flex flex-col items-center gap-1 transition-all border ${
                        isActive ? `${config.bg} ${config.text} border-current` : 'bg-gray-50 dark:bg-[#1d212c] text-gray-400 dark:text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-[#232838]'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-2 rounded-md text-[13px] font-medium flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />新建账户
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
