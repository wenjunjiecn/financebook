import { create } from 'zustand'
import type { Transaction, Category, Account, CsvTemplate, CategoryRule, CandidateTransaction, AiCategorizeItem, AiParsedTransaction, AiInsightsContext, AiAnomalyResult, Budget, ChatMessage, AiChatContext } from '../../../shared/types'
import { processImportCandidates } from '../importers/ruleEngine'

export type ActiveTab = 'overview' | 'transactions' | 'import' | 'accounts' | 'categories' | 'budget' | 'settings'

interface AppState {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void

  transactions: Transaction[]
  selectedTransaction: Transaction | null
  setSelectedTransaction: (tx: Transaction | null) => void

  candidates: CandidateTransaction[]
  setCandidates: (candidates: CandidateTransaction[]) => void
  updateCandidate: (tempId: string, updates: Partial<CandidateTransaction>) => void
  toggleCandidateSelected: (tempId: string) => void
  toggleAllCandidatesSelected: (selected: boolean) => void

  categories: Category[]
  accounts: Account[]
  templates: CsvTemplate[]
  rules: CategoryRule[]

  filters: {
    startDate?: string
    endDate?: string
    type?: Transaction['type']
    categoryId?: string
    search?: string
  }
  setFilters: (filters: AppState['filters']) => void

  apiKey: string
  setApiKey: (key: string) => void

  // AI 功能状态
  aiInsights: string
  aiInsightsLoading: boolean
  generateAiInsights: () => Promise<void>
  aiCategorizeCandidates: () => Promise<void>
  aiCategorizing: boolean
  parseTextToTransaction: (text: string) => Promise<AiParsedTransaction | null>
  aiDetectAnomalies: () => Promise<void>
  aiAnomalyDetecting: boolean
  aiSuggestBudgets: () => Promise<void>
  aiBudgetSuggesting: boolean

  // 预算
  budgets: Budget[]
  loadBudgets: () => Promise<void>
  saveBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>

  // 聊天
  chatMessages: ChatMessage[]
  chatOpen: boolean
  chatLoading: boolean
  setChatOpen: (open: boolean) => void
  sendChatMessage: (text: string) => Promise<void>
  executeChatAction: (messageId: string) => Promise<void>
  clearChat: () => void

  isLoading: boolean
  loadAllData: () => Promise<void>
  commitImportCandidates: () => Promise<number>
  saveManualTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>
  deleteTransactions: (ids: string[]) => Promise<void>
  addCategoryRule: (rule: Omit<CategoryRule, 'id'>) => Promise<CategoryRule>
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category>
  addAccount: (account: Omit<Account, 'id'>) => Promise<Account>
  addCsvTemplate: (template: Omit<CsvTemplate, 'id' | 'createdAt'>) => Promise<CsvTemplate>
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  transactions: [],
  selectedTransaction: null,
  setSelectedTransaction: (tx) => set({ selectedTransaction: tx }),

  candidates: [],
  setCandidates: (rawCandidates) => {
    const { transactions, rules } = get()
    const processed = processImportCandidates(rawCandidates, transactions, rules)
    set({ candidates: processed })
  },

  updateCandidate: (tempId, updates) => {
    set((state) => ({
      candidates: state.candidates.map((c) => (c.tempId === tempId ? { ...c, ...updates } : c)),
    }))
  },

  toggleCandidateSelected: (tempId) => {
    set((state) => ({
      candidates: state.candidates.map((c) => (c.tempId === tempId ? { ...c, isSelected: !c.isSelected } : c)),
    }))
  },

  toggleAllCandidatesSelected: (selected) => {
    set((state) => ({
      candidates: state.candidates.map((c) => ({ ...c, isSelected: selected })),
    }))
  },

  categories: [],
  accounts: [],
  templates: [],
  rules: [],

  filters: {},
  setFilters: (newFilters) => {
    set({ filters: newFilters })
    get().loadAllData()
  },

  apiKey: '',
  setApiKey: (key) => set({ apiKey: key }),

  // AI 功能实现
  aiInsights: '',
  aiInsightsLoading: false,
  aiCategorizing: false,
  aiAnomalyDetecting: false,
  aiBudgetSuggesting: false,

  budgets: [],

  // 聊天状态
  chatMessages: [],
  chatOpen: false,
  chatLoading: false,

  generateAiInsights: async () => {
    const { transactions, categories, apiKey } = get()
    if (!apiKey) return
    set({ aiInsightsLoading: true })
    try {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthStart = `${yearMonth}-01 00:00:00`
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01 00:00:00`

      // 当月交易
      const monthTx = transactions.filter((tx) => tx.date >= monthStart && tx.date < monthEnd)
      let totalExpense = 0
      let totalIncome = 0
      const categoryMap: Record<string, number> = {}
      const dailyMap: Record<string, { expense: number; income: number }> = {}

      for (const tx of monthTx) {
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

      // 上月数据对比
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`
      const prevMonthTx = transactions.filter((tx) => tx.date >= prevMonthStart && tx.date < monthStart)
      const prevMonthExpense = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const prevMonthIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

      const categoryBreakdown = Object.keys(categoryMap)
        .map((catId) => {
          const cat = categories.find((c) => c.id === catId)
          return {
            categoryName: cat?.name || '未分类',
            amount: categoryMap[catId],
            percentage: totalExpense > 0 ? (categoryMap[catId] / totalExpense) * 100 : 0,
          }
        })
        .sort((a, b) => b.amount - a.amount)

      const dailyTrends = Object.keys(dailyMap).sort().map((day) => ({
        day,
        expense: dailyMap[day].expense,
        income: dailyMap[day].income,
      }))

      const context: AiInsightsContext = {
        yearMonth,
        totalExpense,
        totalIncome,
        netIncome: totalIncome - totalExpense,
        txCount: monthTx.length,
        categoryBreakdown,
        dailyTrends,
        prevMonthExpense: prevMonthExpense > 0 ? prevMonthExpense : undefined,
        prevMonthIncome: prevMonthIncome > 0 ? prevMonthIncome : undefined,
      }

      const result = await window.electronAPI.ai.generateInsights(context, apiKey)
      set({ aiInsights: result })
    } catch (err: any) {
      console.error('AI Insights Error:', err)
      set({ aiInsights: `生成失败: ${err.message || err}` })
    } finally {
      set({ aiInsightsLoading: false })
    }
  },

  aiCategorizeCandidates: async () => {
    const { candidates, categories, apiKey } = get()
    if (!apiKey || candidates.length === 0) return
    set({ aiCategorizing: true })
    try {
      // 只对未命中规则（categoryId 为默认值或空）且被选中的候选项进行 AI 分类
      const items: AiCategorizeItem[] = candidates.map((c) => ({
        payee: c.payee,
        notes: c.notes,
        amount: c.amount,
      }))
      const catList = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))
      const results = await window.electronAPI.ai.categorizeTransactions(items, catList, apiKey)

      // 将结果应用回 candidates
      set((state) => ({
        candidates: state.candidates.map((c, i) => {
          const result = results[i]
          if (result && result.categoryId && result.confidence >= 0.5) {
            return { ...c, categoryId: result.categoryId }
          }
          return c
        }),
      }))
    } catch (err: any) {
      console.error('AI Categorize Error:', err)
    } finally {
      set({ aiCategorizing: false })
    }
  },

  parseTextToTransaction: async (text: string) => {
    const { apiKey } = get()
    if (!apiKey) return null
    try {
      return await window.electronAPI.ai.parseTextTransaction(text, apiKey)
    } catch (err: any) {
      console.error('AI Parse Text Error:', err)
      return null
    }
  },

  aiDetectAnomalies: async () => {
    const { candidates, transactions, apiKey } = get()
    if (!apiKey || candidates.length === 0) return
    set({ aiAnomalyDetecting: true })
    try {
      const items: AiCategorizeItem[] = candidates.map((c) => ({
        payee: c.payee,
        notes: c.notes,
        amount: c.amount,
      }))
      const recentHistory: AiCategorizeItem[] = transactions.slice(0, 50).map((t) => ({
        payee: t.payee,
        notes: t.notes,
        amount: t.amount,
      }))
      const results: AiAnomalyResult[] = await window.electronAPI.ai.detectAnomalies(items, recentHistory, apiKey)

      set((state) => ({
        candidates: state.candidates.map((c, i) => {
          const result = results[i]
          if (result && result.isAnomaly) {
            return { ...c, anomalyWarning: result.warning }
          }
          return { ...c, anomalyWarning: undefined }
        }),
      }))
    } catch (err: any) {
      console.error('AI Anomaly Detection Error:', err)
    } finally {
      set({ aiAnomalyDetecting: false })
    }
  },

  aiSuggestBudgets: async () => {
    const { transactions, categories, apiKey } = get()
    if (!apiKey) return
    set({ aiBudgetSuggesting: true })
    try {
      // 计算过去3个月各分类的平均月支出
      const now = new Date()
      const categoryTotals: Record<string, number> = {}
      let monthCount = 0

      for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
        const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01 00:00:00`

        const monthTx = transactions.filter((tx) => tx.date >= monthStart && tx.date < monthEnd && tx.type === 'expense')
        if (monthTx.length > 0) monthCount++
        for (const tx of monthTx) {
          categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amount
        }
      }

      if (monthCount === 0) return

      const categoryStats = Object.keys(categoryTotals)
        .map((catId) => {
          const cat = categories.find((c) => c.id === catId)
          return {
            categoryId: catId,
            categoryName: cat?.name || '未分类',
            avgMonthly: Math.round(categoryTotals[catId] / monthCount),
          }
        })
        .filter((s) => s.avgMonthly > 0)

      if (categoryStats.length === 0) return

      const suggestions = await window.electronAPI.ai.suggestBudgets(categoryStats, apiKey)

      // 自动保存到预算表
      const now2 = new Date()
      const period = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`
      for (const s of suggestions) {
        if (s.suggestedLimit > 0) {
          await window.electronAPI.db.saveBudget({
            categoryId: s.categoryId,
            monthlyLimit: s.suggestedLimit,
            period,
          })
        }
      }
      await get().loadBudgets()
    } catch (err: any) {
      console.error('AI Budget Suggestion Error:', err)
    } finally {
      set({ aiBudgetSuggesting: false })
    }
  },

  loadBudgets: async () => {
    try {
      const now = new Date()
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const budgets = await window.electronAPI.db.getBudgets(period)
      set({ budgets })
    } catch (err) {
      console.error('Failed to load budgets:', err)
    }
  },

  saveBudget: async (budget) => {
    const created = await window.electronAPI.db.saveBudget(budget)
    await get().loadBudgets()
    return created
  },

  deleteBudget: async (id) => {
    await window.electronAPI.db.deleteBudget(id)
    await get().loadBudgets()
  },

  setChatOpen: (open) => set({ chatOpen: open }),

  clearChat: () => set({ chatMessages: [] }),

  sendChatMessage: async (text: string) => {
    const { apiKey, transactions, categories, budgets, chatMessages } = get()
    if (!apiKey || !text.trim()) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }
    set({ chatMessages: [...chatMessages, userMsg], chatLoading: true })

    try {
      // 构建财务上下文
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthStart = `${yearMonth}-01 00:00:00`
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01 00:00:00`

      const monthTx = transactions.filter((tx) => tx.date >= monthStart && tx.date < monthEnd)
      let totalExpense = 0
      let totalIncome = 0
      const categoryMap: Record<string, number> = {}
      for (const tx of monthTx) {
        if (tx.type === 'expense') {
          totalExpense += tx.amount
          categoryMap[tx.categoryId] = (categoryMap[tx.categoryId] || 0) + tx.amount
        } else if (tx.type === 'income') {
          totalIncome += tx.amount
        }
      }

      const topCategories = Object.keys(categoryMap)
        .map((catId) => {
          const cat = categories.find((c) => c.id === catId)
          return {
            categoryName: cat?.name || '未分类',
            amount: categoryMap[catId],
            percentage: totalExpense > 0 ? (categoryMap[catId] / totalExpense) * 100 : 0,
          }
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const recentTransactions = transactions.slice(0, 10).map((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId)
        return {
          payee: tx.payee,
          amount: tx.amount,
          type: tx.type,
          categoryName: cat?.name || '未分类',
          date: tx.date,
        }
      })

      const budgetSummary = budgets.map((b) => {
        const cat = categories.find((c) => c.id === b.categoryId)
        const spent = monthTx.filter((t) => t.type === 'expense' && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
        return { categoryName: cat?.name || '未分类', limit: b.monthlyLimit, spent }
      })

      const context: AiChatContext = {
        yearMonth,
        totalExpense,
        totalIncome,
        netIncome: totalIncome - totalExpense,
        txCount: monthTx.length,
        topCategories,
        recentTransactions,
        budgets: budgetSummary,
        categoryList: categories.map((c) => c.name),
      }

      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }))
      const result = await window.electronAPI.ai.chat(text.trim(), history, context, apiKey)

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        action: result.action,
      }
      set({ chatMessages: [...get().chatMessages, assistantMsg] })

      // 如果有记账动作，自动执行
      if (result.action?.type === 'create_transaction' && result.action.data) {
        await get().executeChatAction(assistantMsg.id)
      }
    } catch (err: any) {
      console.error('Chat Error:', err)
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `抱歉，出错了：${err.message || err}`,
        timestamp: Date.now(),
      }
      set({ chatMessages: [...get().chatMessages, errorMsg] })
    } finally {
      set({ chatLoading: false })
    }
  },

  executeChatAction: async (messageId: string) => {
    const { chatMessages, categories, accounts } = get()
    const msg = chatMessages.find((m) => m.id === messageId)
    if (!msg?.action || msg.actionExecuted) return

    const data = msg.action.data
    const cents = Math.round(data.amountYuan * 100)
    const matchedCat = categories.find(
      (c) => c.name.includes(data.categoryName) || data.categoryName.includes(c.name)
    )

    await window.electronAPI.db.saveTransactions([{
      amount: cents,
      type: data.type,
      categoryId: matchedCat?.id || categories[0]?.id || 'cat_other_exp',
      accountId: accounts[0]?.id || 'acc_wechat',
      date: data.date,
      payee: data.payee,
      notes: data.notes || '',
      paymentMethod: 'AI 聊天记账',
      status: 'normal',
      source: 'manual',
      isRefund: false,
    }])

    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === messageId ? { ...m, actionExecuted: true } : m
      ),
    }))
    await get().loadAllData()
  },

  isLoading: false,

  loadAllData: async () => {
    set({ isLoading: true })
    try {
      if (window.electronAPI) {
      const [txs, cats, accs, tpls, rls, key, buds] = await Promise.all([
        window.electronAPI.db.getTransactions(get().filters),
        window.electronAPI.db.getCategories(),
        window.electronAPI.db.getAccounts(),
        window.electronAPI.db.getCsvTemplates(),
        window.electronAPI.db.getCategoryRules(),
        window.electronAPI.safeStorage.getApiKey('llm_api_key'),
        window.electronAPI.db.getBudgets(),
      ])
      set({
        transactions: txs,
        categories: cats,
        accounts: accs,
        templates: tpls,
        rules: rls,
        apiKey: key || '',
        budgets: buds,
      })
      }
    } catch (err) {
      console.error('Failed to load data from Electron SQLite:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  commitImportCandidates: async () => {
    const { candidates, loadAllData } = get()
    const selected = candidates.filter((c) => c.isSelected)
    if (selected.length === 0) return 0

    const payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = selected.map((c) => ({
      amount: c.amount,
      type: c.type,
      categoryId: c.categoryId,
      accountId: c.accountId,
      date: c.date,
      payee: c.payee,
      notes: c.notes,
      paymentMethod: c.paymentMethod,
      status: c.status,
      source: c.source,
      sourceTransactionId: c.sourceTransactionId,
      rawData: c.rawData,
      isRefund: c.isRefund,
      originalTransactionId: c.originalTransactionId,
    }))

    await window.electronAPI.db.saveTransactions(payload)
    set({ candidates: [] })
    await loadAllData()
    return payload.length
  },

  saveManualTransaction: async (tx) => {
    const [saved] = await window.electronAPI.db.saveTransactions([tx])
    await get().loadAllData()
    return saved
  },

  updateTransaction: async (id, updates) => {
    const updated = await window.electronAPI.db.updateTransaction(id, updates)
    await get().loadAllData()
    if (get().selectedTransaction?.id === id) {
      set({ selectedTransaction: updated })
    }
    return updated
  },

  deleteTransactions: async (ids) => {
    await window.electronAPI.db.deleteTransactions(ids)
    if (get().selectedTransaction && ids.includes(get().selectedTransaction!.id)) {
      set({ selectedTransaction: null })
    }
    await get().loadAllData()
  },

  addCategoryRule: async (rule) => {
    const created = await window.electronAPI.db.saveCategoryRule(rule)
    await get().loadAllData()
    return created
  },

  addCategory: async (cat) => {
    const created = await window.electronAPI.db.saveCategory(cat)
    await get().loadAllData()
    return created
  },

  addAccount: async (acc) => {
    const created = await window.electronAPI.db.saveAccount(acc)
    await get().loadAllData()
    return created
  },

  addCsvTemplate: async (tpl) => {
    const created = await window.electronAPI.db.saveCsvTemplate(tpl)
    await get().loadAllData()
    return created
  },
}))
