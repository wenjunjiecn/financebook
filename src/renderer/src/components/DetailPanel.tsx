import React, { useEffect, useState } from 'react'
import {
  X, Tag, Calendar, Wallet, FileText, RotateCcw, Trash2, Check, DollarSign,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from './Toast'
import { formatCentsToYuan } from '../utils/formatters'
import type { TransactionType } from '../../../shared/types'

export const DetailPanel: React.FC = () => {
  const { selectedTransaction, setSelectedTransaction, categories, accounts, updateTransaction, deleteTransaction } = useAppStore()
  const toast = useToast()

  const [draft, setDraft] = useState(selectedTransaction)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setDraft(selectedTransaction)
    setHasChanges(false)
  }, [selectedTransaction])

  if (!selectedTransaction || !draft) {
    return null
  }

  const update = (patch: Partial<typeof draft>) => {
    setDraft((d) => {
      if (!d) return d
      return { ...d, ...patch }
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return
    await updateTransaction(draft.id, {
      categoryId: draft.categoryId,
      accountId: draft.accountId,
      amount: draft.amount,
      payee: draft.payee,
      notes: draft.notes,
      date: draft.date,
      type: draft.type,
    })
    toast.success('已保存', '交易信息已更新')
    setHasChanges(false)
  }

  const handleRevert = () => {
    setDraft(selectedTransaction)
    setHasChanges(false)
  }

  const handleDelete = async () => {
    const ok = await toast.confirm('删除交易', '确定删除此交易？此操作不可撤销。')
    if (ok) {
      await deleteTransaction([draft.id])
      setSelectedTransaction(null)
      toast.success('已删除', '该交易已删除')
    }
  }

  const txType = draft.type
  const cat = categories.find((c) => c.id === draft.categoryId)
  const acc = accounts.find((a) => a.id === draft.accountId)

  return (
    <aside className="w-[340px] bg-white dark:bg-[#161a23] border-l border-gray-100 dark:border-[#232838] flex flex-col shrink-0 animate-slide-in-right overflow-hidden">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-gray-50 dark:border-[#232838] shrink-0">
        <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">交易详情</span>
        <button onClick={() => setSelectedTransaction(null)} className="btn-ghost p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Amount */}
        <div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">金额</div>
          <div className={`text-[28px] font-semibold tabular-nums ${
            txType === 'expense' ? 'text-gray-900 dark:text-gray-100' : txType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {txType === 'expense' ? '−' : txType === 'income' ? '+' : ''}{formatCentsToYuan(draft.amount).replace('¥', '')}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="badge" style={{ backgroundColor: `${cat?.color || '#94a3b8'}12`, color: cat?.color || '#94a3b8' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.color || '#94a3b8' }} />
              {cat?.name || '未分类'}
            </span>
            <span className="badge bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">{draft.source === 'wechat' ? '微信' : draft.source === 'alipay' ? '支付宝' : draft.source === 'manual' ? '手动' : draft.source}</span>
          </div>
        </div>

        <div className="h-px bg-gray-50 dark:bg-[#1d212c]" />

        {/* Type */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block">类型</label>
          <div className="grid grid-cols-3 gap-1">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
              <button key={t} onClick={() => update({ type: t })}
                className={`py-1.5 rounded-md text-[11px] transition-colors ${
                  draft.type === t ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-[#1d212c] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232838]'
                }`}>
                {t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账'}
              </button>
            ))}
          </div>
        </div>

        {/* Payee */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><FileText className="w-3 h-3" />商户</label>
          <input value={draft.payee} onChange={(e) => update({ payee: e.target.value })} className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px]" />
        </div>

        {/* Amount input */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><DollarSign className="w-3 h-3" />金额（元）</label>
          <input type="number" step="0.01" value={(draft.amount / 100).toFixed(2)}
            onChange={(e) => update({ amount: Math.round(parseFloat(e.target.value || '0') * 100) })}
            className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px] font-mono tabular-nums" />
        </div>

        {/* Date */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><Calendar className="w-3 h-3" />日期时间</label>
          <input type="text" value={draft.date} onChange={(e) => update({ date: e.target.value })} className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px] font-mono" />
        </div>

        {/* Category */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><Tag className="w-3 h-3" />分类</label>
          <select value={draft.categoryId} onChange={(e) => update({ categoryId: e.target.value })} className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px]">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Account */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><Wallet className="w-3 h-3" />账户</label>
          <select value={draft.accountId} onChange={(e) => update({ accountId: e.target.value })} className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px]">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 block">备注</label>
          <textarea value={draft.notes || ''} onChange={(e) => update({ notes: e.target.value })} rows={3}
            placeholder="添加备注..." className="input-field w-full rounded-md px-2.5 py-1.5 text-[12px] resize-none" />
        </div>

        {/* Meta */}
        <div className="pt-2 space-y-1 text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex justify-between"><span>交易ID</span><span className="font-mono">{draft.id.slice(0, 8)}...</span></div>
          {acc && <div className="flex justify-between"><span>账户</span><span>{acc.name}</span></div>}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-50 dark:border-[#232838] flex items-center gap-2 shrink-0">
        {hasChanges ? (
          <>
            <button onClick={handleRevert} className="btn-secondary px-3 py-2 rounded-md text-[12px] flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />撤销
            </button>
            <button onClick={handleSave} className="btn-primary flex-1 py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" />保存修改
            </button>
          </>
        ) : (
          <button onClick={handleDelete} className="flex-1 py-2 rounded-md text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />删除交易
          </button>
        )}
      </div>
    </aside>
  )
}
