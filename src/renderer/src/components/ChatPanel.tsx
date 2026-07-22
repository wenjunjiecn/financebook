import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Trash2, CheckCircle2, MessageCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatCentsToYuan } from '../utils/formatters'
import type { ChatMessage } from '../../../shared/types'

const SUGGESTIONS = [
  '今天午饭花了35',
  '这个月花了多少？',
  '昨天收到工资8000',
  '最近有什么大额消费？',
  '帮我分析下消费情况',
]

export const ChatPanel: React.FC = () => {
  const {
    chatOpen, setChatOpen, chatMessages, chatLoading,
    sendChatMessage, clearChat, apiKey, executeChatAction,
  } = useAppStore()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, chatLoading])

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return
    const text = input.trim()
    setInput('')
    await sendChatMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!chatOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[1px] animate-fade-in"
        onClick={() => setChatOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] bg-white dark:bg-[#161a23] shadow-2xl flex flex-col animate-slide-in-right app-no-drag">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#232838] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">小财助手</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">AI 聊天记账 · 随时问我</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1d212c] transition-colors"
                title="清空对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1d212c] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-400 dark:text-blue-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-700 dark:text-gray-300">你好！我是小财 🤖</p>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">可以帮我记账，或者问我财务问题</p>
              </div>
              {/* Suggestions */}
              <div className="flex flex-col gap-1.5 w-full mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-left text-[12px] px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1d212c] text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg) => <MessageBubble key={msg.id} msg={msg} onExecute={executeChatAction} />)
          )}

          {/* Loading indicator */}
          {chatLoading && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#1d212c]">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-[#232838] shrink-0">
          {!apiKey && (
            <p className="text-[11px] text-amber-500 mb-2 text-center">请先在设置中配置 API Key</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              disabled={chatLoading || !apiKey}
              rows={1}
              className="input-field flex-1 rounded-xl px-3 py-2.5 text-[13px] resize-none max-h-24"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={chatLoading || !input.trim() || !apiKey}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

const MessageBubble: React.FC<{ msg: ChatMessage; onExecute: (id: string) => Promise<void> }> = ({ msg, onExecute }) => {
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-2 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-blue-500'
          : 'bg-gradient-to-br from-blue-500 to-purple-500'
      }`}>
        {isUser ? (
          <span className="text-[11px] font-medium text-white">我</span>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[280px] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
          isUser
            ? 'bg-blue-500 text-white rounded-tr-sm'
            : 'bg-gray-50 dark:bg-[#1d212c] text-gray-700 dark:text-gray-300 rounded-tl-sm'
        }`}>
          {msg.content}
        </div>

        {/* Action card */}
        {msg.action?.type === 'create_transaction' && msg.action.data && (
          <div className={`w-full rounded-xl border p-3 ${
            msg.actionExecuted
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5'
              : 'border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5'
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {msg.actionExecuted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              )}
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                {msg.actionExecuted ? '已记账' : '正在记账...'}
              </span>
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-500">金额</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatCentsToYuan(Math.round(msg.action.data.amountYuan * 100))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-500">商户</span>
                <span className="text-gray-700 dark:text-gray-300">{msg.action.data.payee}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-500">分类</span>
                <span className="text-gray-700 dark:text-gray-300">{msg.action.data.categoryName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-300 dark:text-gray-600 px-1">{time}</span>
      </div>
    </div>
  )
}
