import React, { useState } from 'react'
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  FileSpreadsheet,
  MessageSquare,
  Wallet,
  Upload,
  Wand2,
  ShieldAlert,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'
import { WeChatImporter } from '../importers/wechatImporter'
import { AlipayImporter } from '../importers/alipayImporter'
import { GenericCsvImporter, FieldMapping } from '../importers/genericCsvImporter'
import { formatCentsToYuan } from '../utils/formatters'
import type { CandidateTransaction } from '../../../shared/types'

type ImportMode = 'wechat' | 'alipay' | 'generic' | 'image'

const importModes: { id: ImportMode; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
  { id: 'wechat', label: '微信账单', icon: MessageSquare, desc: '微信支付 CSV' },
  { id: 'alipay', label: '支付宝账单', icon: Wallet, desc: '支付宝 CSV' },
  { id: 'generic', label: '通用 CSV', icon: FileSpreadsheet, desc: '自定义映射' },
  { id: 'image', label: '图片识别', icon: Sparkles, desc: 'OCR 识别' },
]

export const ImportView: React.FC = () => {
  const {
    candidates, setCandidates, updateCandidate, toggleCandidateSelected, toggleAllCandidatesSelected,
    commitImportCandidates, categories, accounts, templates, addCsvTemplate, apiKey, setActiveTab,
    aiCategorizeCandidates, aiCategorizing, aiDetectAnomalies, aiAnomalyDetecting,
  } = useAppStore()
  const toast = useToast()

  const [activeImportMode, setActiveImportMode] = useState<ImportMode>('wechat')
  const [genericMapping, setGenericMapping] = useState<FieldMapping>({
    dateColIndex: 0, payeeColIndex: 1, amountColIndex: 2, typeColIndex: 3, notesColIndex: 4, hasHeader: true,
  })
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const processFileContent = (content: string, mode: 'wechat' | 'alipay' | 'generic') => {
    try {
      let parsed: CandidateTransaction[] = []
      if (mode === 'wechat') parsed = new WeChatImporter().parse(content)
      else if (mode === 'alipay') parsed = new AlipayImporter().parse(content)
      else if (mode === 'generic') parsed = new GenericCsvImporter().parseWithMapping(content, genericMapping)
      setCandidates(parsed)
      toast.success('解析成功', `已识别 ${parsed.length} 笔候选交易`)
    } catch (err: any) {
      toast.error('解析失败', err.message || String(err))
    }
  }

  const handleFileSelect = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.file.openFileDialog()
      if (!filePath) return
      const content = await window.electronAPI.file.readTextFile(filePath)
      processFileContent(content, activeImportMode as any)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (activeImportMode === 'image' || imageFiles.length > 0) {
      if (imageFiles.length > 1) {
        handleBatchImageFiles(imageFiles)
      } else {
        handleImageFile(imageFiles[0])
      }
      return
    }
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (event) => { const content = event.target?.result as string; if (content) processFileContent(content, activeImportMode as any) }
    reader.readAsText(file, 'utf-8')
  }

  const handleImageFile = (file: File) => {
    if (!apiKey) { toast.error('未配置 API Key', '请先在系统设置中配置大模型 API Key'); setActiveTab('settings'); return }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setImagePreviews([base64])
      setAiLoading(true)
      const loadingId = toast.loading('识别中', '正在解析票据图片...')
      try {
        const recognized = await window.electronAPI.ai.recognizeReceipt(base64, apiKey)
        const matchedCat = categories.find((c) => c.name.includes(recognized.categoryName || ''))?.id || 'cat_other_exp'
        const candidate: CandidateTransaction = {
          tempId: `ai_${Date.now()}`, amount: recognized.amount, type: 'expense', categoryId: matchedCat,
          accountId: accounts[0]?.id || 'acc_wechat', date: recognized.date, payee: recognized.payee,
          notes: recognized.notes, paymentMethod: '图片识别', status: 'normal', source: 'ai_image',
          isRefund: false, isSelected: true,
        }
        setCandidates([candidate])
        toast.dismiss(loadingId)
        toast.success('识别完成', `${recognized.payee} · ${formatCentsToYuan(recognized.amount)}`)
      } catch (err: any) {
        toast.dismiss(loadingId)
        toast.error('识别错误', err.message || String(err))
      } finally { setAiLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleBatchImageFiles = async (files: File[]) => {
    if (!apiKey) { toast.error('未配置 API Key', '请先在系统设置中配置大模型 API Key'); setActiveTab('settings'); return }
    const base64s: string[] = []
    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      base64s.push(base64)
    }
    setImagePreviews(base64s)
    setAiLoading(true)
    setBatchProgress({ current: 0, total: files.length })
    const loadingId = toast.loading('批量识别中', `0/${files.length} 张已识别...`)
    const newCandidates: CandidateTransaction[] = []
    try {
      for (let i = 0; i < base64s.length; i++) {
        setBatchProgress({ current: i + 1, total: files.length })
        toast.dismiss(loadingId)
        toast.loading('批量识别中', `${i + 1}/${files.length} 张识别中...`)
        try {
          const recognized = await window.electronAPI.ai.recognizeReceipt(base64s[i], apiKey)
          const matchedCat = categories.find((c) => c.name.includes(recognized.categoryName || ''))?.id || 'cat_other_exp'
          newCandidates.push({
            tempId: `ai_${Date.now()}_${i}`, amount: recognized.amount, type: 'expense', categoryId: matchedCat,
            accountId: accounts[0]?.id || 'acc_wechat', date: recognized.date, payee: recognized.payee,
            notes: recognized.notes, paymentMethod: '图片识别', status: 'normal', source: 'ai_image',
            isRefund: false, isSelected: true,
          })
        } catch (err) {
          console.error(`Image ${i + 1} recognition failed:`, err)
        }
      }
      toast.dismiss(loadingId)
      if (newCandidates.length > 0) {
        setCandidates(newCandidates)
        toast.success('批量识别完成', `成功识别 ${newCandidates.length}/${files.length} 张票据`)
      } else {
        toast.error('识别失败', '所有图片均识别失败')
      }
    } catch (err: any) {
      toast.dismiss(loadingId)
      toast.error('批量识别错误', err.message || String(err))
    } finally {
      setAiLoading(false)
      setBatchProgress(null)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error('错误', '模板名称不能为空'); return }
    await addCsvTemplate({ name: templateName, mappingJson: JSON.stringify(genericMapping) })
    setTemplateName('')
    toast.success('已保存', `「${templateName}」模板已保存`)
  }

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id)
    const found = templates.find((t) => t.id === id)
    if (found) { try { setGenericMapping(JSON.parse(found.mappingJson)); toast.info('已加载', `已应用「${found.name}」`) } catch {} }
  }

  const handleCommit = async () => {
    const count = await commitImportCandidates()
    if (count > 0) { toast.success('入账成功', `${count} 笔交易已写入`); setActiveTab('transactions') }
  }

  const allSelected = candidates.length > 0 && candidates.every((c) => c.isSelected)
  const selectedCount = candidates.filter((c) => c.isSelected).length

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">账单导入</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">支持微信/支付宝 CSV、通用 CSV 映射，以及图片识别</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in">
          {importModes.map((mode) => {
            const Icon = mode.icon
            const isActive = activeImportMode === mode.id
            return (
              <button key={mode.id} onClick={() => setActiveImportMode(mode.id)}
                className={`p-3 rounded-lg text-left transition-all border ${
                  isActive ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-[#232838] dark:bg-[#161a23] dark:hover:border-[#2d3548] dark:hover:bg-[#1d212c]'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className={`text-[12px] font-medium ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>{mode.label}</span>
                </div>
                <p className={`text-[10px] ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{mode.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Generic CSV Mapping */}
        {activeImportMode === 'generic' && (
          <div className="card p-4 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">CSV 列字段映射</h3>
              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">已有模板</span>
                  <select value={selectedTemplateId} onChange={(e) => handleSelectTemplate(e.target.value)} className="input-field rounded-md px-2 py-1 text-[11px]">
                    <option value="">选择...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[{ key: 'dateColIndex', label: '日期列' }, { key: 'payeeColIndex', label: '商户列' }, { key: 'amountColIndex', label: '金额列' }, { key: 'typeColIndex', label: '类型列' }, { key: 'notesColIndex', label: '备注列' }].map((field) => (
                <div key={field.key}>
                  <label className="text-[11px] text-gray-400 dark:text-gray-500 block mb-1">{field.label}</label>
                  <input type="number" value={genericMapping[field.key as keyof FieldMapping] as number ?? 0}
                    onChange={(e) => setGenericMapping({ ...genericMapping, [field.key]: parseInt(e.target.value) || 0 })}
                    className="input-field w-full rounded-md px-2 py-1.5 text-[12px] tabular-nums" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-[#232838]">
              <input type="text" placeholder="模板名称" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input-field rounded-md px-2.5 py-1.5 text-[12px] flex-1" />
              <button onClick={handleSaveTemplate} className="btn-secondary px-3 py-1.5 rounded-md text-[12px] flex items-center gap-1.5"><Save className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />保存</button>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} onClick={handleFileSelect}
          className={`rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all text-center border-2 border-dashed ${
            isDragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-[#232838] dark:bg-[#161a23] dark:hover:border-[#2d3548] dark:hover:bg-[#1d212c]'
          }`}>
          <div className={`p-3 rounded-xl mb-3 ${activeImportMode === 'image' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
            {activeImportMode === 'image' ? <ImageIcon className="w-6 h-6 text-amber-500" /> : <Upload className="w-6 h-6 text-blue-500" />}
          </div>
          <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{activeImportMode === 'image' ? '拖入小票/截图（支持多张），或点击选择' : '点击选择文件，或拖入此区域'}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{activeImportMode === 'image' ? '支持 JPG / PNG 票据图片，可批量识别' : '支持 UTF-8 / GBK 编码 CSV'}</p>
        </div>

        {/* AI Loading */}
        {aiLoading && (
          <div className="card p-4 flex items-center gap-3 animate-scale-in" style={{ borderColor: '#fcd34d' }}>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10"><Sparkles className="w-4 h-4 text-amber-500 animate-spin" /></div>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-amber-700 dark:text-amber-400">{batchProgress ? '批量图片识别中' : '图片识别中'}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {batchProgress ? `正在识别第 ${batchProgress.current}/${batchProgress.total} 张...` : '正在解析票据信息...'}
              </p>
              {batchProgress && (
                <div className="mt-1.5 h-1 bg-amber-100 dark:bg-amber-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="card p-3 animate-scale-in">
            <div className="flex items-center gap-2 flex-wrap">
              {imagePreviews.map((preview, idx) => (
                <img key={idx} src={preview} alt={`preview-${idx}`} className="w-12 h-12 object-cover rounded-md border border-gray-200 dark:border-[#232838]" />
              ))}
              <div className="text-[12px] ml-2">
                <span className="font-medium text-gray-900 dark:text-gray-100 block">已加载 {imagePreviews.length} 张预览图</span>
                <span className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5 block">识别结果将在下方呈现，确认后入账</span>
              </div>
            </div>
          </div>
        )}

        {/* Candidates */}
        {candidates.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">待确认候选</h3>
                <span className="badge bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 tabular-nums">{candidates.length} 笔</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCandidates([])} className="btn-secondary px-3 py-1.5 rounded-md text-[12px]">清空</button>
                {apiKey && candidates.length > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        await aiCategorizeCandidates()
                        toast.success('AI 分类完成', '已使用 AI 智能匹配分类')
                      }}
                      disabled={aiCategorizing || aiAnomalyDetecting}
                      className="px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${aiCategorizing ? 'animate-spin' : ''}`} />
                      {aiCategorizing ? 'AI 分类中...' : 'AI 智能分类'}
                    </button>
                    <button
                      onClick={async () => {
                        await aiDetectAnomalies()
                        toast.success('异常检测完成', 'AI 已检测候选交易中的异常项')
                      }}
                      disabled={aiCategorizing || aiAnomalyDetecting}
                      className="px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      <ShieldAlert className={`w-3.5 h-3.5 ${aiAnomalyDetecting ? 'animate-spin' : ''}`} />
                      {aiAnomalyDetecting ? '检测中...' : 'AI 异常检测'}
                    </button>
                  </>
                )}
                <button onClick={handleCommit} disabled={selectedCount === 0} className="btn-primary px-4 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-40">
                  <Check className="w-3.5 h-3.5" />确认入账 {selectedCount} 笔
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-[#161a23] text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-[#232838]">
                    <tr>
                      <th className="p-2.5 w-10"><input type="checkbox" checked={allSelected} onChange={(e) => toggleAllCandidatesSelected(e.target.checked)} className="custom-checkbox" /></th>
                      <th className="p-2.5 text-[10px] font-medium">状态</th>
                      <th className="p-2.5 text-[10px] font-medium">时间</th>
                      <th className="p-2.5 text-[10px] font-medium">商户</th>
                      <th className="p-2.5 text-[10px] font-medium">分类</th>
                      <th className="p-2.5 text-[10px] font-medium">账户</th>
                      <th className="p-2.5 text-[10px] font-medium text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#1d212c]">
                    {candidates.map((c) => (
                      <tr key={c.tempId} className={`hover:bg-gray-50 dark:hover:bg-[#1d212c] transition-colors ${c.status === 'duplicate' ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''}`}>
                        <td className="p-2.5"><input type="checkbox" checked={c.isSelected} onChange={() => toggleCandidateSelected(c.tempId)} className="custom-checkbox" /></td>
                        <td className="p-2.5">
                          {c.status === 'duplicate' ? (
                            <span className="badge bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" title={c.duplicateMatchReason}><AlertTriangle className="w-2.5 h-2.5" />重复</span>
                          ) : c.anomalyWarning ? (
                            <span className="badge bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" title={c.anomalyWarning}><ShieldAlert className="w-2.5 h-2.5" />异常</span>
                          ) : c.isRefund ? (
                            <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><RotateCcw className="w-2.5 h-2.5" />退款</span>
                          ) : (
                            <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><CheckCircle2 className="w-2.5 h-2.5" />正常</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-gray-600 dark:text-gray-400 tabular-nums text-[11px]">{c.date}</td>
                        <td className="p-2.5">
                          <input type="text" value={c.payee} onChange={(e) => updateCandidate(c.tempId, { payee: e.target.value })}
                            className="bg-transparent border-b border-transparent focus:border-blue-400 text-gray-900 dark:text-gray-100 text-[12px] px-1 py-0.5 focus:outline-none w-full transition-colors" />
                        </td>
                        <td className="p-2.5">
                          <select value={c.categoryId} onChange={(e) => updateCandidate(c.tempId, { categoryId: e.target.value })} className="input-field rounded px-1.5 py-0.5 text-[11px]">
                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select value={c.accountId} onChange={(e) => updateCandidate(c.tempId, { accountId: e.target.value })} className="input-field rounded px-1.5 py-0.5 text-[11px]">
                            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400 tabular-nums">{formatCentsToYuan(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
