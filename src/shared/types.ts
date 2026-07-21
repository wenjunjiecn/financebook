export type TransactionType = 'expense' | 'income' | 'transfer'
export type TransactionStatus = 'normal' | 'refunded' | 'transferred' | 'duplicate'
export type TransactionSource = 'manual' | 'wechat_csv' | 'alipay_csv' | 'generic_csv' | 'ai_image'

export interface Transaction {
  id: string
  amount: number // 整数，单位：分
  type: TransactionType
  categoryId: string
  accountId: string
  date: string // ISO date string YYYY-MM-DD HH:mm:ss
  payee: string
  notes: string
  paymentMethod: string
  status: TransactionStatus
  source: TransactionSource
  sourceTransactionId?: string
  rawData?: string
  isRefund: boolean
  originalTransactionId?: string
  createdAt: string
  updatedAt: string
}

export interface CandidateTransaction extends Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string
  tempId: string
  duplicateMatchId?: string
  duplicateMatchReason?: string
  refundMatchId?: string
  isSelected: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
  parentId?: string | null
}

export interface Account {
  id: string
  name: string
  type: 'checking' | 'credit' | 'alipay' | 'wechat' | 'cash'
  balance: number // 单位：分
  currency: string
}

export interface CsvTemplate {
  id: string
  name: string
  mappingJson: string // stringified Record<string, number> mapping standard keys to column index
  createdAt: string
}

export interface CategoryRule {
  id: string
  keyword: string
  categoryId: string
  priority: number
}

export interface MonthlyStats {
  yearMonth: string // YYYY-MM
  totalExpense: number // 单位：分
  totalIncome: number // 单位：分
  netIncome: number // 单位：分
  categoryBreakdown: Array<{
    categoryId: string
    categoryName: string
    color: string
    amount: number
  }>
  dailyTrends: Array<{
    day: string
    expense: number
    income: number
  }>
}

export interface RecognizedReceipt {
  payee: string
  amount: number // 单位：分
  date: string
  notes: string
  categoryName?: string
  rawText?: string
}

export interface ElectronAPI {
  // DB IPC
  db: {
    getTransactions: (filters?: {
      startDate?: string
      endDate?: string
      type?: TransactionType
      categoryId?: string
      search?: string
    }) => Promise<Transaction[]>
    saveTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<Transaction[]>
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>
    deleteTransactions: (ids: string[]) => Promise<boolean>

    getCategories: () => Promise<Category[]>
    saveCategory: (category: Omit<Category, 'id'>) => Promise<Category>

    getAccounts: () => Promise<Account[]>
    saveAccount: (account: Omit<Account, 'id'>) => Promise<Account>

    getCsvTemplates: () => Promise<CsvTemplate[]>
    saveCsvTemplate: (template: Omit<CsvTemplate, 'id' | 'createdAt'>) => Promise<CsvTemplate>

    getCategoryRules: () => Promise<CategoryRule[]>
    saveCategoryRule: (rule: Omit<CategoryRule, 'id'>) => Promise<CategoryRule>
  }

  // SafeStorage Keychain IPC
  safeStorage: {
    setApiKey: (keyName: string, value: string) => Promise<boolean>
    getApiKey: (keyName: string) => Promise<string | null>
    hasApiKey: (keyName: string) => Promise<boolean>
  }

  // File IPC
  file: {
    openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
    readTextFile: (filePath: string) => Promise<string>
    exportCsv: (filename: string, content: string) => Promise<boolean>
    backupDatabase: () => Promise<string | null>
    restoreDatabase: () => Promise<boolean>
  }

  // LLM Image AI IPC
  ai: {
    recognizeReceipt: (base64Image: string, apiKey: string, baseUrl?: string) => Promise<RecognizedReceipt>
  }
}
