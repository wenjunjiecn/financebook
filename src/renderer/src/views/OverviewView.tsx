import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { TrendingDown, TrendingUp, Scale, PieChart as PieIcon, Sparkles, RefreshCw, ChevronDown, ChevronUp, Target, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatCentsToYuan } from '../utils/formatters'

export const OverviewView: React.FC = () => {
  const { transactions, categories, apiKey, aiInsights, aiInsightsLoading, generateAiInsights, budgets } = useAppStore()
  const [insightsExpanded, setInsightsExpanded] = useState(true)

  const budgetProgress = useMemo(() => {
    if (budgets.length === 0) return []
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthStart = `${yearMonth}-01 00:00:00`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01 00:00:00`

    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId)
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date >= monthStart && t.date < monthEnd)
        .reduce((sum, t) => sum + t.amount, 0)
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0
      return { ...b, categoryName: cat?.name || '未分类', color: cat?.color || '#94a3b8', spent, pct }
    })
  }, [budgets, categories, transactions])

  const stats = useMemo(() => {
    let totalExpense = 0
    let totalIncome = 0
    const categoryMap: Record<string, number> = {}
    const dailyMap: Record<string, { expense: number; income: number }> = {}

    for (const tx of transactions) {
      if (tx.type === 'expense') {
        totalExpense += tx.amount
        categoryMap[tx.categoryId] = (categoryMap[tx.categoryId] || 0) + tx.amount
      } else if (tx.type === 'income') {
        totalIncome += tx.amount
      }
      const dayKey = tx.date.slice(5, 10)
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { expense: 0, income: 0 }
      if (tx.type === 'expense') dailyMap[dayKey].expense += tx.amount / 100
      else if (tx.type === 'income') dailyMap[dayKey].income += tx.amount / 100
    }

    const dailyTrends = Object.keys(dailyMap).sort().slice(-14).map((day) => ({
      day,
      支出: dailyMap[day].expense,
      收入: dailyMap[day].income,
    }))

    const categoryPie = Object.keys(categoryMap)
      .map((catId) => {
        const cat = categories.find((c) => c.id === catId)
        return {
          name: cat?.name || '未分类',
          value: categoryMap[catId] / 100,
          rawValue: categoryMap[catId],
          color: cat?.color || '#94a3b8',
        }
      })
      .sort((a, b) => b.rawValue - a.rawValue)

    return {
      totalExpense, totalIncome,
      netIncome: totalIncome - totalExpense,
      dailyTrends, categoryPie,
      expenseRate: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      txCount: transactions.length,
    }
  }, [transactions, categories])

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4 max-w-[1100px] mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">总支出</span>
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatCentsToYuan(stats.totalExpense)}
            </div>
            <div className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              支出率 <span className="text-red-500 font-medium tabular-nums">{stats.expenseRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="card p-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">总收入</span>
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatCentsToYuan(stats.totalIncome)}
            </div>
            <div className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              储蓄率 <span className="text-emerald-500 font-medium tabular-nums">{stats.savingsRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="card p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                stats.netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
              }`}>
                <Scale className={`w-3.5 h-3.5 ${stats.netIncome >= 0 ? 'text-blue-500' : 'text-amber-500'}`} />
              </div>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">净结余</span>
            </div>
            <div className={`text-[22px] font-semibold tabular-nums ${
              stats.netIncome >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-amber-600'
            }`}>
              {formatCentsToYuan(stats.netIncome)}
            </div>
            <div className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              {stats.netIncome >= 0 ? '本月盈余' : '本月赤字'}
            </div>
          </div>
        </div>

        {/* AI Insights Card */}
        {apiKey && (
          <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#232838]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">AI 财务洞察</h3>
                {aiInsights && !aiInsightsLoading && (
                  <button
                    onClick={() => setInsightsExpanded(!insightsExpanded)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {insightsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <button
                onClick={generateAiInsights}
                disabled={aiInsightsLoading}
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${aiInsightsLoading ? 'animate-spin' : ''}`} />
                {aiInsightsLoading ? '生成中...' : aiInsights ? '重新生成' : '生成本月报告'}
              </button>
            </div>
            {insightsExpanded && (
              <div className="p-4">
                {aiInsightsLoading ? (
                  <div className="flex items-center gap-3 py-6 justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-[12px] text-gray-400 dark:text-gray-500">正在分析您的财务数据...</span>
                  </div>
                ) : aiInsights ? (
                  <div className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {aiInsights}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <Sparkles className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                    <p className="text-[12px] text-gray-400 dark:text-gray-500">点击「生成本月报告」获取 AI 财务分析</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">AI 将分析您的收支趋势、消费结构并给出建议</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Budget Progress */}
        {budgetProgress.length > 0 && (
          <div className="card p-4 animate-slide-up" style={{ animationDelay: '130ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                预算进度
              </h3>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                {budgetProgress.filter((b) => b.pct > 100).length > 0 && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{budgetProgress.filter((b) => b.pct > 100).length} 项超支
                  </span>
                )}
              </span>
            </div>
            <div className="space-y-2.5">
              {budgetProgress.slice(0, 5).map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-gray-600 dark:text-gray-300">{b.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`tabular-nums font-medium ${b.pct > 100 ? 'text-red-500' : b.pct > 80 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {b.pct.toFixed(0)}%
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                        {formatCentsToYuan(b.spent)} / {formatCentsToYuan(b.monthlyLimit)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#1d212c] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.pct > 100 ? 'bg-red-500' : b.pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-3 gap-3">
          {/* Trend */}
          <div className="col-span-2 card p-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">收支趋势</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-red-400" />支出
                </span>
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />收入
                </span>
              </div>
            </div>
            <div className="h-56">
              {stats.dailyTrends.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-gray-300 dark:text-gray-600">暂无趋势数据</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyTrends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:!stroke-[#232838]" vertical={false} />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} dy={6} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={45} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '8px',
                        fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--app-text)',
                      }}
                      labelStyle={{ color: 'var(--app-text-muted)', fontWeight: 500, marginBottom: 2 }}
                      itemStyle={{ color: 'var(--app-text)' }}
                      cursor={{ stroke: 'var(--app-border)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={1.5} fill="url(#gExp)" dot={false} activeDot={{ r: 3, fill: '#ef4444' }} />
                    <Area type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={1.5} fill="url(#gInc)" dot={false} activeDot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Pie */}
          <div className="card p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              支出分类
            </h3>
            <div className="h-36 flex items-center justify-center relative">
              {stats.categoryPie.length === 0 ? (
                <span className="text-[13px] text-gray-300 dark:text-gray-600">暂无数据</span>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} stroke="none">
                        {stats.categoryPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--app-text)' }}
                        formatter={(v: number) => [`¥${v.toFixed(2)}`, '金额']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
            <div className="space-y-1 mt-2">
              {stats.categoryPie.slice(0, 4).map((cat) => {
                const pct = stats.totalExpense > 0 ? (cat.rawValue / stats.totalExpense) * 100 : 0
                return (
                  <div key={cat.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-600 dark:text-gray-300 truncate">{cat.name}</span>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
