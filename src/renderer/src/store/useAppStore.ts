import { create } from 'zustand'
import type { Transaction, Category, Account, CsvTemplate, CategoryRule, CandidateTransaction } from '../../../shared/types'
import { processImportCandidates } from '../importers/ruleEngine'

export type ActiveTab = 'overview' | 'transactions' | 'import' | 'accounts' | 'categories' | 'settings'

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

  isLoading: false,

  loadAllData: async () => {
    set({ isLoading: true })
    try {
      if (window.electronAPI) {
        const [txs, cats, accs, tpls, rls, key] = await Promise.all([
          window.electronAPI.db.getTransactions(get().filters),
          window.electronAPI.db.getCategories(),
          window.electronAPI.db.getAccounts(),
          window.electronAPI.db.getCsvTemplates(),
          window.electronAPI.db.getCategoryRules(),
          window.electronAPI.safeStorage.getApiKey('llm_api_key'),
        ])
        set({
          transactions: txs,
          categories: cats,
          accounts: accs,
          templates: tpls,
          rules: rls,
          apiKey: key || '',
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
