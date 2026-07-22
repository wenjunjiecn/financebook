import React, { useState, useMemo } from 'react'
import { Target, Plus, Trash2, Sparkles, TrendingDown, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'
import { formatCentsToYuan } from '../utils/formatters'

export const BudgetView: React.FC = () => {
  const {
    budgets, categories, transactions, apiKey,
    saveBudget, deleteBudget, aiSuggestBudgets, aiBudgetSuggesting,
  } = useAppStore()
  const toast = useToast()

  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [limitYuan, setLimitYuan] = useState('')

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthStart = `${yearMonth}-01 00:00:00`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01 00:00:00`

  // 计算各分类当月已花费
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date >= monthStart && tx.date < monthEnd) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount
      }
    }
    return map
  }, [transactions, monthStart, monthEnd])

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategoryId) { toast.error('错误', '请选择分类'); return }
    const limitCents = Math.round(parseFloat(limitYuan || '0') * 100)
    if (limitCents <= 0) { toast.error('错误', '预算金额必须大于 0'); return }
    await saveBudget({ categoryId: selectedCategoryId, monthlyLimit: limitCents, period: yearMonth })
    const cat = categories.find((c) => c.id === selectedCategoryId)
    toast.success('已设置', `「${cat?.name}」月度预算 ${formatCentsToYuan(limitCents)}`)
    setSelectedCategoryId('')
    setLimitYuan('')
  }

  const handleAiSuggest = async () => {
    if (!apiKey) { toast.error('未配置 API Key', '请先在系统设置中配置大模型 API Key'); return }
    await aiSuggestBudgets()
    toast.success('AI 建议已应用', '已根据历史消费生成预算建议')
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (categorySpending[b.categoryId] || 0), 0)

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between animate-fade-in">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">预算管理</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{yearMonth} 月度预算 · 控制支出合理消费</p>
          </div>
          <div className="card px-4 py-2 text-right">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide block">总预算 / 已花</span>
            <span className="text-[15px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatCentsToYuan(totalSpent)} <span className="text-gray-400 text-[12px]">/ {formatCentsToYuan(totalBudget)}</span>
            </span>
          </div>
        </div>

        {/* Budget Cards */}
        {budgets.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#1d212c] flex items-center justify-center mx-auto mb-3">
              <Target className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">还没有设置预算</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">在下方添加预算，或使用 AI 自动生成建议</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {budgets.map((budget, idx) => {
              const cat = categories.find((c) => c.id === budget.categoryId)
              const spent = categorySpending[budget.categoryId] || 0
              const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0
              const isOver = pct > 100
              const isWarning = pct > 80 && pct <= 100
              return (
                <div key={budget.id} className="card p-4 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat?.color || '#94a3b8' }} />
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{cat?.name || '未分类'}</span>
                    </div>
                    <button
                      onClick={async () => { await deleteBudget(budget.id); toast.success('已删除', '预算已移除') }}
                      className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[20px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {formatCentsToYuan(spent)}
                    </span>
                    <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums">
                      / {formatCentsToYuan(budget.monthlyLimit)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-[#1d212c] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className={`tabular-nums font-medium ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {pct.toFixed(0)}%
                    </span>
                    {isOver ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="w-3 h-3" />超支 {formatCentsToYuan(spent - budget.monthlyLimit)}
                      </span>
                    ) : isWarning ? (
                      <span className="text-amber-500">接近预算上限</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">剩余 {formatCentsToYuan(budget.monthlyLimit - spent)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Budget Form */}
        <div className="card p-4 max-w-md animate-slide-up">
          <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-blue-500" />设置分类预算
          </h3>
          <form onSubmit={handleAddBudget} className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-400 dark:text-gray-500 block mb-1">分类</label>
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="input-field w-full rounded-md px-3 py-2 text-[13px]">
                <option value="">选择分类...</option>
                {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 dark:text-gray-500 block mb-1">月度预算限额（元）</label>
              <input type="number" step="0.01" placeholder="例如：2000" value={limitYuan}
                onChange={(e) => setLimitYuan(e.target.value)}
                className="input-field w-full rounded-md px-3 py-2 text-[13px] font-mono tabular-nums" />
            </div>
            <button type="submit" className="btn-primary w-full py-2 rounded-md text-[13px] font-medium flex items-center justify-center gap-1.5">
              <Target className="w-4 h-4" />设置预算
            </button>
          </form>
        </div>

        {/* AI Budget Suggestion */}
        {apiKey && (
          <div className="card p-4 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">AI 智能预算建议</h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">根据过去 3 个月消费数据自动生成各分类预算</p>
              </div>
            </div>
            <button
              onClick={handleAiSuggest}
              disabled={aiBudgetSuggesting}
              className="px-4 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-40"
            >
              <TrendingDown className={`w-3.5 h-3.5 ${aiBudgetSuggesting ? 'animate-spin' : ''}`} />
              {aiBudgetSuggesting ? '生成中...' : '生成建议'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
