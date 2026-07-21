import React, { useState } from 'react'
import { ShieldCheck, Database, Key, Save, Download, RefreshCw, Lock, Eye, EyeOff, Cpu, Sun, Moon, Monitor } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToast } from '../components/Toast'
import { useTheme, ThemeMode } from '../hooks/useTheme'

const themeOptions: { value: ThemeMode; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
  { value: 'light', label: '浅色', icon: Sun, desc: '明亮清新' },
  { value: 'dark', label: '深色', icon: Moon, desc: '护眼低光' },
  { value: 'system', label: '跟随系统', icon: Monitor, desc: '自动切换' },
]

export const SettingsView: React.FC = () => {
  const { apiKey, setApiKey, loadAllData } = useAppStore()
  const toast = useToast()
  const { themeMode, setThemeMode } = useTheme()
  const [inputKey, setInputKey] = useState(apiKey)
  const [isSaving, setIsSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleSaveKey = async () => {
    if (!inputKey.trim()) { toast.error('错误', 'API Key 不能为空'); return }
    setIsSaving(true)
    try {
      if (window.electronAPI) {
        await window.electronAPI.safeStorage.setApiKey('llm_api_key', inputKey.trim())
        setApiKey(inputKey.trim())
        toast.success('已保存', '密钥已存储至 macOS Keychain')
      }
    } catch (err) {
      console.error(err)
      toast.error('失败', 'Keychain 保存失败，请检查权限')
    } finally { setIsSaving(false) }
  }

  const handleBackup = async () => {
    if (window.electronAPI) {
      const savedPath = await window.electronAPI.file.backupDatabase()
      if (savedPath) toast.success('备份成功', `已保存至：${savedPath}`)
      else toast.error('已取消', '未选择保存位置')
    }
  }

  const handleRestore = async () => {
    const ok = await toast.confirm('恢复数据库', '此操作将覆盖现有所有数据，不可撤销。是否继续？')
    if (ok) {
      if (window.electronAPI) {
        const success = await window.electronAPI.file.restoreDatabase()
        if (success) { await loadAllData(); toast.success('已恢复', '所有数据已还原') }
        else toast.error('失败', '未选择备份文件或格式错误')
      }
    }
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="animate-fade-in">
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">系统设置</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">管理主题外观、API 密钥存储及本地数据库备份</p>
        </div>

        {/* Theme */}
        <div className="card p-4 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              {themeMode === 'dark' ? <Moon className="w-4 h-4 text-blue-500" /> : themeMode === 'system' ? <Monitor className="w-4 h-4 text-blue-500" /> : <Sun className="w-4 h-4 text-blue-500" />}
              外观主题
            </h3>
            <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">{themeOptions.find((t) => t.value === themeMode)?.label}</span>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">选择应用的明暗主题。跟随系统模式将根据 macOS 的外观设置自动切换。</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              const isActive = themeMode === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setThemeMode(opt.value)}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1.5 transition-all border ${
                    isActive
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-[#232838] dark:bg-[#161a23] dark:hover:border-[#2d3548] dark:hover:bg-[#1d212c]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className={`text-[12px] font-medium ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>{opt.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="card p-4 space-y-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Key className="w-4 h-4 text-blue-500" />图片识别 API Key</h3>
            <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Lock className="w-2.5 h-2.5" />Keychain</span>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">配置后可通过大模型视觉 API 自动解析购物小票与截图。密钥保存在本地硬件 Keychain 中。</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type={showKey ? 'text' : 'password'} placeholder="sk-..." value={inputKey} onChange={(e) => setInputKey(e.target.value)}
                className="input-field w-full rounded-md px-3 py-2 pr-9 text-[12px] font-mono" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={handleSaveKey} disabled={isSaving} className="btn-primary px-4 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-40">
              <Save className="w-3.5 h-3.5" />{isSaving ? '保存中...' : '保存'}
            </button>
          </div>
          {apiKey && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />已配置（{apiKey.slice(0, 6)}...{apiKey.slice(-4)}）
            </div>
          )}
        </div>

        {/* Backup */}
        <div className="card p-4 space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Database className="w-4 h-4 text-blue-500" />数据库备份与恢复</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">记账数据保存在本地 SQLite 文件中，可定期备份或还原。</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleBackup} className="btn-secondary px-4 py-2.5 rounded-md text-[12px] flex items-center justify-center gap-2">
              <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div className="flex flex-col items-start"><span className="font-medium text-gray-700 dark:text-gray-200">导出备份</span><span className="text-[10px] text-gray-400 dark:text-gray-500">.sqlite 文件</span></div>
            </button>
            <button onClick={handleRestore} className="px-4 py-2.5 rounded-md text-[12px] flex items-center justify-center gap-2 bg-red-50 border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors">
              <RefreshCw className="w-4 h-4 text-red-500" />
              <div className="flex flex-col items-start"><span className="font-medium text-red-600 dark:text-red-400">恢复数据</span><span className="text-[10px] text-red-400 dark:text-red-500/70">从备份还原</span></div>
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="card p-3 flex items-start gap-3 text-[12px] text-gray-500 dark:text-gray-400 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-500/10 shrink-0"><ShieldCheck className="w-4 h-4 text-blue-500" /></div>
          <div className="space-y-1">
            <span className="font-medium text-gray-700 dark:text-gray-200 block">安全隔离说明</span>
            <p className="leading-relaxed">Electron 开启 <code className="text-blue-600 dark:text-blue-400 font-mono px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10">contextIsolation</code> 且关闭 <code className="text-blue-600 dark:text-blue-400 font-mono px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10">nodeIntegration</code>，前端通过 Safe IPC 代理访问文件系统。</p>
          </div>
        </div>

        {/* About */}
        <div className="card p-3 flex items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="p-1.5 rounded-md bg-gray-50 dark:bg-[#1d212c] shrink-0"><Cpu className="w-4 h-4 text-gray-400 dark:text-gray-500" /></div>
          <div className="flex items-center justify-between w-full">
            <div><span className="font-medium text-gray-700 dark:text-gray-200">FinanceBook</span><span className="text-gray-400 dark:text-gray-500 ml-2">v1.0.0</span></div>
            <span className="text-gray-400 dark:text-gray-500">Electron + React + SQLite</span>
          </div>
        </div>
      </div>
    </div>
  )
}
