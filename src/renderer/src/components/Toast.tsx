import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration: number
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => string
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
  loading: (title: string, message?: string) => string
  dismiss: (id: string) => void
  confirm: (title: string, message?: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const toastConfig: Record<ToastType, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  loading: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
}

const ToastIcon: React.FC<{ type: ToastType; className?: string }> = ({ type, className }) => {
  const config = toastConfig[type]
  const Icon = config.icon
  return <Icon className={`${className} ${type === 'loading' ? 'animate-spin' : ''}`} />
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{ title: string; message?: string; resolve: (value: boolean) => void } | null>(null)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) { clearTimeout(timersRef.current[id]); delete timersRef.current[id] }
  }, [])

  const toast = useCallback((type: ToastType, title: string, message?: string, duration: number = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, type, title, message, duration }])
    if (duration > 0 && type !== 'loading') timersRef.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const success = useCallback((title: string, message?: string) => toast('success', title, message), [toast])
  const error = useCallback((title: string, message?: string) => toast('error', title, message, 4500), [toast])
  const info = useCallback((title: string, message?: string) => toast('info', title, message), [toast])
  const loading = useCallback((title: string, message?: string) => toast('loading', title, message, 0), [toast])

  const confirm = useCallback((title: string, message?: string) => {
    return new Promise<boolean>((resolve) => { setConfirmState({ title, message, resolve }) })
  }, [])

  const handleConfirm = (result: boolean) => {
    if (confirmState) { confirmState.resolve(result); setConfirmState(null) }
  }

  useEffect(() => { return () => { Object.values(timersRef.current).forEach(clearTimeout) } }, [])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, loading, dismiss, confirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none app-no-drag">
        {toasts.map((t) => {
          const config = toastConfig[t.type]
          return (
            <div key={t.id} className="pointer-events-auto animate-slide-in-right min-w-[280px] max-w-[380px]">
              <div className="card p-3 flex items-start gap-2.5 shadow-md">
                <div className={`p-1.5 rounded-md shrink-0 ${config.bg}`}>
                  <ToastIcon type={t.type} className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-tight">{t.title}</p>
                  {t.message && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed break-words">{t.message}</p>}
                </div>
                {t.type !== 'loading' && (
                  <button onClick={() => dismiss(t.id)} className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 -mr-0.5 -mt-0.5 p-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm Dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 animate-fade-in app-no-drag">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px]" onClick={() => handleConfirm(false)} />
          <div className="relative card w-full max-w-sm p-5 animate-scale-in shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{confirmState.title}</h3>
                {confirmState.message && <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{confirmState.message}</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => handleConfirm(false)} className="btn-secondary px-4 py-1.5 rounded-md text-[12px]">取消</button>
              <button onClick={() => handleConfirm(true)} className="px-4 py-1.5 rounded-md text-[12px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">确认</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
