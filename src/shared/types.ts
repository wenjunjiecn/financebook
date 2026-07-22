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
  anomalyWarning?: string
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

/** AI 智能分类请求 */
export interface AiCategorizeItem {
  payee: string
  notes: string
  amount: number // 单位：分
}

/** AI 智能分类结果 */
export interface AiCategorizeResult {
  categoryId: string
  categoryName: string
  confidence: number // 0-1
}

/** AI 自然语言记账解析结果 */
export interface AiParsedTransaction {
  amountYuan: number
  type: 'expense' | 'income' | 'transfer'
  payee: string
  categoryName: string
  date: string // YYYY-MM-DD HH:mm:ss
  notes: string
}

/** AI 异常检测结果 */
export interface AiAnomalyResult {
  index: number
  isAnomaly: boolean
  warning: string
  severity: 'low' | 'medium' | 'high'
}

/** 预算 */
export interface Budget {
  id: string
  categoryId: string
  monthlyLimit: number // 单位：分
  period: string // YYYY-MM
  createdAt: string
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  action?: {
    type: 'create_transaction'
    data: AiParsedTransaction
  }
  actionExecuted?: boolean
}

/** AI 聊天上下文（传给后端的财务摘要） */
export interface AiChatContext {
  yearMonth: string
  totalExpense: number // 分
  totalIncome: number // 分
  netIncome: number // 分
  txCount: number
  topCategories: Array<{ categoryName: string; amount: number; percentage: number }>
  recentTransactions: Array<{ payee: string; amount: number; type: string; categoryName: string; date: string }>
  budgets: Array<{ categoryName: string; limit: number; spent: number }>
  categoryList: string[] // 可选分类名称列表
}

/** AI 聊天返回结果 */
export interface AiChatResult {
  reply: string
  action?: {
    type: 'create_transaction'
    data: AiParsedTransaction
  }
}

/** AI 月度洞察报告上下文 */
export interface AiInsightsContext {
  yearMonth: string
  totalExpense: number // 单位：分
  totalIncome: number // 单位：分
  netIncome: number // 单位：分
  txCount: number
  categoryBreakdown: Array<{
    categoryName: string
    amount: number // 单位：分
    percentage: number
  }>
  dailyTrends: Array<{
    day: string
    expense: number
    income: number
  }>
  prevMonthExpense?: number // 上月总支出，用于对比
  prevMonthIncome?: number // 上月总收入
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

    getBudgets: (period?: string) => Promise<Budget[]>
    saveBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<Budget>
    deleteBudget: (id: string) => Promise<boolean>
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

  // LLM AI IPC
  ai: {
    recognizeReceipt: (base64Image: string, apiKey: string, baseUrl?: string) => Promise<RecognizedReceipt>
    categorizeTransactions: (items: AiCategorizeItem[], categories: Array<{ id: string; name: string; type: string }>, apiKey: string, baseUrl?: string) => Promise<AiCategorizeResult[]>
    parseTextTransaction: (text: string, apiKey: string, baseUrl?: string) => Promise<AiParsedTransaction>
    generateInsights: (context: AiInsightsContext, apiKey: string, baseUrl?: string) => Promise<string>
    detectAnomalies: (items: AiCategorizeItem[], recentHistory: AiCategorizeItem[], apiKey: string, baseUrl?: string) => Promise<AiAnomalyResult[]>
    suggestBudgets: (categoryStats: Array<{ categoryId: string; categoryName: string; avgMonthly: number }>, apiKey: string, baseUrl?: string) => Promise<Array<{ categoryId: string; suggestedLimit: number }>>
    chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, context: AiChatContext, apiKey: string, baseUrl?: string) => Promise<AiChatResult>
  }
}