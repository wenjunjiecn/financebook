import React, { useState } from 'react'
import { Tags, Plus, Sparkles, ArrowRight, FolderTree } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'

export const CategoriesView: React.FC = () => {
  const { categories, rules, addCategory, addCategoryRule } = useAppStore()
  const toast = useToast()

  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'expense' | 'income'>('expense')
  const [catColor, setCatColor] = useState('#3b82f6')
  const [ruleKeyword, setRuleKeyword] = useState('')
  const [ruleCatId, setRuleCatId] = useState('')

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) { toast.error('错误', '分类名称不能为空'); return }
    await addCategory({ name: catName, icon: 'Tag', color: catColor, type: catType })
    toast.success('已创建', `「${catName}」已添加`)
    setCatName('')
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleKeyword.trim()) { toast.error('错误', '关键词不能为空'); return }
    if (!ruleCatId) { toast.error('错误', '请选择映射分类'); return }
    await addCategoryRule({ keyword: ruleKeyword, categoryId: ruleCatId, priority: 10 })
    const cat = categories.find((c) => c.id === ruleCatId)
    toast.success('已添加', `「${ruleKeyword}」→「${cat?.name}」`)
    setRuleKeyword('')
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto space-y-4">
        <div className="animate-fade-in">
          <h2 className="text-[16px] font-semibold text-gray-900">分类与规则</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">配置收支分类及导入时的关键词自动归类</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Categories */}
          <div className="card p-4 space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-1.5"><Tags className="w-4 h-4 text-blue-500" />分类列表</h3>
              <span className="badge bg-gray-100 text-gray-500 tabular-nums">{categories.length} 个</span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {expenseCategories.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">支出分类</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {expenseCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 border border-gray-100">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-[12px] text-gray-700 font-medium truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {incomeCategories.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">收入分类</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {incomeCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 border border-gray-100">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-[12px] text-gray-700 font-medium truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {categories.length === 0 && (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <FolderTree className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-[12px]">还没有分类</span>
                </div>
              )}
            </div>

            <form onSubmit={handleAddCategory} className="pt-3 border-t border-gray-50 space-y-2">
              <h4 className="text-[11px] font-medium text-gray-600">新建分类</h4>
              <div className="flex items-center gap-1.5">
                <input type="text" placeholder="名称" value={catName} onChange={(e) => setCatName(e.target.value)} className="input-field rounded-md px-2.5 py-1.5 text-[12px] flex-1" />
                <select value={catType} onChange={(e) => setCatType(e.target.value as 'expense' | 'income')} className="input-field rounded-md px-2 py-1.5 text-[12px]">
                  <option value="expense">支出</option><option value="income">收入</option>
                </select>
                <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="w-8 h-8 rounded-md cursor-pointer bg-transparent border border-gray-200" />
                <button type="submit" className="btn-primary px-3 py-1.5 rounded-md text-[12px] font-medium">添加</button>
              </div>
            </form>
          </div>

          {/* Rules */}
          <div className="card p-4 space-y-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" />自动归类规则</h3>
              <span className="badge bg-gray-100 text-gray-500 tabular-nums">{rules.length} 条</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {rules.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <Sparkles className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-[12px]">还没有规则</span>
                </div>
              ) : (
                rules.map((r) => {
                  const cat = categories.find((c) => c.id === r.categoryId)
                  return (
                    <div key={r.id} className="p-2.5 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-between text-[12px]">
                      <span className="font-mono text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">"{r.keyword}"</span>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <ArrowRight className="w-3 h-3" />
                        <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                          {cat && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                          {cat?.name || r.categoryId}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleAddRule} className="pt-3 border-t border-gray-50 space-y-2">
              <h4 className="text-[11px] font-medium text-gray-600">新增规则</h4>
              <div className="flex items-center gap-1.5">
                <input type="text" placeholder="关键词" value={ruleKeyword} onChange={(e) => setRuleKeyword(e.target.value)} className="input-field rounded-md px-2.5 py-1.5 text-[12px] flex-1" />
                <select value={ruleCatId} onChange={(e) => setRuleCatId(e.target.value)} className="input-field rounded-md px-2 py-1.5 text-[12px]">
                  <option value="">映射到...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="btn-primary px-3 py-1.5 rounded-md text-[12px] font-medium">添加</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
