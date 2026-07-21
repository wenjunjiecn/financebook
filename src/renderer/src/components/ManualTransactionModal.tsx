import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, CheckCircle2, DollarSign, Calendar, Tag, Wallet, FileText, ArrowLeftRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from './Toast'

const formSchema = z.object({
  amountYuan: z.string().min(1, '请输入正确金额').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, '金额必须大于 0'),
  type: z.enum(['expense', 'income', 'transfer']),
  payee: z.string().min(1, '请输入商户/交易对方'),
  categoryId: z.string().min(1, '请选择分类'),
  accountId: z.string().min(1, '请选择账户'),
  date: z.string().min(1, '请选择日期'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

const typeOptions = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'transfer', label: '转账' },
] as const

export const ManualTransactionModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { categories, accounts, saveManualTransaction } = useAppStore()
  const toast = useToast()

  const todayStr = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountYuan: '', type: 'expense', payee: '',
      categoryId: categories[0]?.id || 'cat_food', accountId: accounts[0]?.id || 'acc_wechat',
      date: todayStr, notes: '',
    },
  })

  const watchedType = watch('type')

  if (!isOpen) return null

  const onSubmit = async (data: FormValues) => {
    const cents = Math.round(parseFloat(data.amountYuan) * 100)
    await saveManualTransaction({
      amount: cents, type: data.type, payee: data.payee, categoryId: data.categoryId,
      accountId: data.accountId, date: data.date, notes: data.notes || '',
      paymentMethod: '手工记账', status: 'normal', source: 'manual', isRefund: false,
    })
    reset()
    onClose()
    toast.success('已记账', `${data.payee} · ¥${data.amountYuan}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in app-no-drag"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md overflow-hidden animate-scale-in shadow-xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-50"><DollarSign className="w-4 h-4 text-blue-500" /></div>
            <div>
              <h3 className="font-medium text-gray-900 text-[14px]">手工记账</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">手动录入一笔交易</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-md text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {/* Type */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5">交易类型</label>
            <div className="grid grid-cols-3 gap-1.5">
              {typeOptions.map((opt) => {
                const isActive = watchedType === opt.value
                return (
                  <label key={opt.value} className={`cursor-pointer flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-medium transition-all border ${
                    isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                  }`}>
                    <input type="radio" {...register('type')} value={opt.value} className="sr-only" />
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>{opt.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5">金额（元）</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">¥</span>
              <input type="number" step="0.01" placeholder="0.00" {...register('amountYuan')} autoFocus
                className="input-field w-full rounded-md pl-8 pr-3 py-2.5 text-[20px] font-mono font-semibold text-gray-900 tabular-nums" />
            </div>
            {errors.amountYuan && <span className="text-[11px] text-red-500 mt-1 block">{errors.amountYuan.message}</span>}
          </div>

          {/* Payee */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" />商户/交易对方</label>
            <input type="text" placeholder="例如：星巴克" {...register('payee')} className="input-field w-full rounded-md px-3 py-2 text-[13px]" />
            {errors.payee && <span className="text-[11px] text-red-500 mt-1 block">{errors.payee.message}</span>}
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" />分类</label>
              <select {...register('categoryId')} className="input-field w-full rounded-md px-3 py-2 text-[12px]">
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.categoryId && <span className="text-[11px] text-red-500 mt-1 block">{errors.categoryId.message}</span>}
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1"><Wallet className="w-3 h-3" />账户</label>
              <select {...register('accountId')} className="input-field w-full rounded-md px-3 py-2 text-[12px]">
                {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              {errors.accountId && <span className="text-[11px] text-red-500 mt-1 block">{errors.accountId.message}</span>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />交易时间</label>
            <input type="text" {...register('date')} className="input-field w-full rounded-md px-3 py-2 text-[12px] font-mono tabular-nums" />
            {errors.date && <span className="text-[11px] text-red-500 mt-1 block">{errors.date.message}</span>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5">备注</label>
            <textarea rows={2} placeholder="可选..." {...register('notes')} className="input-field w-full rounded-md p-2.5 text-[12px] resize-none" />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-50">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-[12px]">取消</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-40">
              <CheckCircle2 className="w-3.5 h-3.5" />{isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
