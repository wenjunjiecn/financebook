import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import { Search, Download, Trash2, Tag, ArrowUpDown, CheckSquare, Receipt, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'
import { formatCentsToYuan } from '../utils/formatters'
import type { Transaction } from '../../../shared/types'

export const TransactionsView: React.FC = () => {
  const { transactions, categories, accounts, selectedTransaction, setSelectedTransaction, deleteTransactions, updateTransaction } = useAppStore()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [batchCategory, setBatchCategory] = useState('')

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} className="custom-checkbox" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e) => e.stopPropagation()} className="custom-checkbox" />
      ),
      size: 36,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <span>日期</span><ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => (
        <div className="leading-tight">
          <span className="font-mono text-[12px] text-gray-700 dark:text-gray-300 tabular-nums">{String(info.getValue()).slice(0, 10)}</span>
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 tabular-nums block">{String(info.getValue()).slice(11, 16)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'payee',
      header: '商户',
      cell: (info) => {
        const tx = info.row.original
        return (
          <div className="max-w-[240px]">
            <div className="text-[12px] text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <span className="truncate">{tx.payee}</span>
              {tx.isRefund && <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">退款</span>}
            </div>
            {tx.notes && <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{tx.notes}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'categoryId',
      header: '分类',
      cell: (info) => {
        const cat = categories.find((c) => c.id === String(info.getValue()))
        return (
          <span className="badge" style={{ backgroundColor: `${cat?.color || '#94a3b8'}12`, color: cat?.color || '#94a3b8' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.color || '#94a3b8' }} />
            {cat?.name || '未分类'}
          </span>
        )
      },
    },
    {
      accessorKey: 'accountId',
      header: '账户',
      cell: (info) => {
        const acc = accounts.find((a) => a.id === String(info.getValue()))
        return <span className="text-[12px] text-gray-500 dark:text-gray-400">{acc?.name || '默认'}</span>
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-auto">
          <span>金额</span><ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => {
        const tx = info.row.original
        const isExpense = tx.type === 'expense'
        return (
          <div className="text-right font-mono text-[13px] font-medium tabular-nums">
            <span className={isExpense ? 'text-gray-900 dark:text-gray-100' : 'text-emerald-600 dark:text-emerald-400'}>
              {isExpense ? '−' : '+'}{formatCentsToYuan(tx.amount).replace('¥', '')}
            </span>
          </div>
        )
      },
    },
  ], [categories, accounts])

  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!tx.payee.toLowerCase().includes(q) && !(tx.notes || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transactions, typeFilter, categoryFilter, search])

  const table = useReactTable({
    data: filteredData, columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const hasFilters = search !== '' || typeFilter !== 'all' || categoryFilter !== 'all'

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    const ok = await toast.confirm('删除交易', `确定删除选中的 ${selectedIds.length} 笔交易？此操作不可撤销。`)
    if (ok) {
      await deleteTransactions(selectedIds)
      setRowSelection({})
      toast.success('已删除', `${selectedIds.length} 笔交易已删除`)
    }
  }

  const handleBatchCategory = async () => {
    if (selectedIds.length === 0 || !batchCategory) return
    const cat = categories.find((c) => c.id === batchCategory)
    for (const id of selectedIds) await updateTransaction(id, { categoryId: batchCategory })
    setRowSelection({})
    setBatchCategory('')
    toast.success('已更新', `${selectedIds.length} 笔交易归类为「${cat?.name}」`)
  }

  const handleExport = async () => {
    let csv = 'ID,时间,类型,商户,金额(分),分类,账户,备注,来源\n'
    for (const tx of filteredData) {
      csv += `"${tx.id}","${tx.date}","${tx.type}","${tx.payee.replace(/"/g, '""')}","${tx.amount}","${tx.categoryId}","${tx.accountId}","${(tx.notes||'').replace(/"/g,'""')}","${tx.source}"\n`
    }
    if (window.electronAPI) {
      await window.electronAPI.file.exportCsv(`FinanceExport_${new Date().toISOString().slice(0,10)}.csv`, csv)
      toast.success('已导出', `${filteredData.length} 笔交易已导出`)
    }
  }

  return (
    <div className="p-5 h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">交易明细</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">共 {filteredData.length} 笔{hasFilters && ' · 已筛选'}</p>
        </div>
        <button onClick={handleExport} className="btn-secondary px-3 py-1.5 rounded-md text-[12px] flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /><span>导出</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text" placeholder="搜索商户或备注" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full rounded-md pl-8 pr-3 py-1.5 text-[12px]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field rounded-md px-2.5 py-1.5 text-[12px]">
          <option value="all">全部类型</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
          <option value="transfer">转账</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field rounded-md px-2.5 py-1.5 text-[12px]">
          <option value="all">全部分类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all') }} className="btn-ghost px-2 py-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Batch bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-md text-[12px] animate-fade-in">
          <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />已选 {selectedIds.length} 笔
          </span>
          <div className="flex items-center gap-2">
            <select value={batchCategory} onChange={(e) => setBatchCategory(e.target.value)} className="input-field rounded px-2 py-1 text-[11px]">
              <option value="">修改分类...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={handleBatchCategory} disabled={!batchCategory} className="btn-primary px-2.5 py-1 rounded text-[11px] disabled:opacity-40">应用</button>
            <button onClick={handleBatchDelete} className="px-2.5 py-1 rounded text-[11px] text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" />删除
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 card overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-50/80 dark:bg-[#161a23]/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide border-b border-gray-100 dark:border-[#232838]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1d212c]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                      <Receipt className="w-8 h-8" strokeWidth={1.5} />
                      <span className="text-[13px]">{hasFilters ? '没有符合条件的交易' : '还没有交易记录'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedTransaction?.id === row.original.id
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedTransaction(row.original)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-[#1d212c]'}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
