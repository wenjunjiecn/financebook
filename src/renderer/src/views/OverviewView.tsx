import React, { useMemo } from 'react'
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
import { TrendingDown, TrendingUp, Scale, PieChart as PieIcon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatCentsToYuan } from '../utils/formatters'

export const OverviewView: React.FC = () => {
  const { transactions, categories } = useAppStore()

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
