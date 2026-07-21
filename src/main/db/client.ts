import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import * as schema from './schema'
import { eq, desc, and, gte, lte, like } from 'drizzle-orm'
import type { Transaction, Category, Account, CsvTemplate, CategoryRule, TransactionType } from '../../shared/types'

let dbInstance: ReturnType<typeof drizzle> | null = null
let sqliteDb: Database.Database | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  return path.join(userDataPath, 'finance.sqlite')
}

export function initDatabase() {
  const dbPath = getDbPath()
  sqliteDb = new Database(dbPath)
  dbInstance = drizzle(sqliteDb, { schema })

  // 创建数据表结构
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      date TEXT NOT NULL,
      payee TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'normal',
      source TEXT NOT NULL DEFAULT 'manual',
      source_transaction_id TEXT,
      raw_data TEXT,
      is_refund INTEGER NOT NULL DEFAULT 0,
      original_transaction_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CNY'
    );

    CREATE TABLE IF NOT EXISTS csv_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mapping_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      category_id TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0
    );
  `)

  // 种子初始基础分类与基础账户
  seedDefaults()
  return dbInstance
}

function seedDefaults() {
  if (!dbInstance) return

  // 校验分类表是否有数据
  const existingCategories = dbInstance.select().from(schema.categories).all()
  if (existingCategories.length === 0) {
    const defaultCategories: (typeof schema.categories.$inferInsert)[] = [
      { id: 'cat_food', name: '餐饮美食', icon: 'Utensils', color: '#f59e0b', type: 'expense' },
      { id: 'cat_shopping', name: '购物消费', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
      { id: 'cat_transport', name: '交通出行', icon: 'Car', color: '#3b82f6', type: 'expense' },
      { id: 'cat_housing', name: '住房物业', icon: 'Home', color: '#8b5cf6', type: 'expense' },
      { id: 'cat_entertainment', name: '休闲娱乐', icon: 'Gamepad2', color: '#10b981', type: 'expense' },
      { id: 'cat_digital', name: '数码3C', icon: 'Laptop', color: '#6366f1', type: 'expense' },
      { id: 'cat_medical', name: '医疗健康', icon: 'Stethoscope', color: '#ef4444', type: 'expense' },
      { id: 'cat_other_exp', name: '其它支出', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense' },

      { id: 'cat_salary', name: '工资收入', icon: 'Wallet', color: '#10b981', type: 'income' },
      { id: 'cat_investment', name: '理财收益', icon: 'TrendingUp', color: '#059669', type: 'income' },
      { id: 'cat_refund', name: '退款收入', icon: 'RotateCcw', color: '#06b6d4', type: 'income' },
      { id: 'cat_other_inc', name: '其它收入', icon: 'Coins', color: '#84cc16', type: 'income' },
    ]
    for (const cat of defaultCategories) {
      dbInstance.insert(schema.categories).values(cat).run()
    }
  }

  // 校验账户表
  const existingAccounts = dbInstance.select().from(schema.accounts).all()
  if (existingAccounts.length === 0) {
    const defaultAccounts: (typeof schema.accounts.$inferInsert)[] = [
      { id: 'acc_wechat', name: '微信支付', type: 'wechat', balance: 0, currency: 'CNY' },
      { id: 'acc_alipay', name: '支付宝', type: 'alipay', balance: 0, currency: 'CNY' },
      { id: 'acc_bank', name: '银行卡', type: 'checking', balance: 0, currency: 'CNY' },
      { id: 'acc_cash', name: '现金账户', type: 'cash', balance: 0, currency: 'CNY' },
    ]
    for (const acc of defaultAccounts) {
      dbInstance.insert(schema.accounts).values(acc).run()
    }
  }

  // 种子自动分类规则
  const existingRules = dbInstance.select().from(schema.categoryRules).all()
  if (existingRules.length === 0) {
    const defaultRules: (typeof schema.categoryRules.$inferInsert)[] = [
      { id: 'rule_1', keyword: '美团', categoryId: 'cat_food', priority: 10 },
      { id: 'rule_2', keyword: '饿了么', categoryId: 'cat_food', priority: 10 },
      { id: 'rule_3', keyword: '麦当劳', categoryId: 'cat_food', priority: 10 },
      { id: 'rule_4', keyword: '肯德基', categoryId: 'cat_food', priority: 10 },
      { id: 'rule_5', keyword: '滴滴', categoryId: 'cat_transport', priority: 10 },
      { id: 'rule_6', keyword: '地铁', categoryId: 'cat_transport', priority: 10 },
      { id: 'rule_7', keyword: '淘宝', categoryId: 'cat_shopping', priority: 5 },
      { id: 'rule_8', keyword: '天猫', categoryId: 'cat_shopping', priority: 5 },
      { id: 'rule_9', keyword: '京东', categoryId: 'cat_shopping', priority: 5 },
      { id: 'rule_10', keyword: '退款', categoryId: 'cat_refund', priority: 20 },
    ]
    for (const rule of defaultRules) {
      dbInstance.insert(schema.categoryRules).values(rule).run()
    }
  }
}

export function getDb() {
  if (!dbInstance) {
    return initDatabase()
  }
  return dbInstance
}

export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
    dbInstance = null
  }
}

// Service helper methods
export async function getTransactionsService(filters?: {
  startDate?: string
  endDate?: string
  type?: TransactionType
  categoryId?: string
  search?: string
}): Promise<Transaction[]> {
  const db = getDb()
  const conditions = []

  if (filters?.startDate) {
    conditions.push(gte(schema.transactions.date, filters.startDate))
  }
  if (filters?.endDate) {
    conditions.push(lte(schema.transactions.date, filters.endDate))
  }
  if (filters?.type) {
    conditions.push(eq(schema.transactions.type, filters.type))
  }
  if (filters?.categoryId) {
    conditions.push(eq(schema.transactions.categoryId, filters.categoryId))
  }
  if (filters?.search) {
    conditions.push(like(schema.transactions.payee, `%${filters.search}%`))
  }

  const query = db
    .select()
    .from(schema.transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.transactions.date))

  const results = query.all()
  return results.map((row) => ({
    ...row,
    isRefund: Boolean(row.isRefund),
    sourceTransactionId: row.sourceTransactionId ?? undefined,
    rawData: row.rawData ?? undefined,
    originalTransactionId: row.originalTransactionId ?? undefined,
  }))
}

export async function saveTransactionsService(
  txs: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Transaction[]> {
  const db = getDb()
  const now = new Date().toISOString()
  const created: Transaction[] = []

  for (const item of txs) {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const newTx: Transaction = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.transactions)
      .values({
        id: newTx.id,
        amount: newTx.amount,
        type: newTx.type,
        categoryId: newTx.categoryId,
        accountId: newTx.accountId,
        date: newTx.date,
        payee: newTx.payee,
        notes: newTx.notes,
        paymentMethod: newTx.paymentMethod,
        status: newTx.status,
        source: newTx.source,
        sourceTransactionId: newTx.sourceTransactionId,
        rawData: newTx.rawData,
        isRefund: newTx.isRefund,
        originalTransactionId: newTx.originalTransactionId,
        createdAt: newTx.createdAt,
        updatedAt: newTx.updatedAt,
      })
      .run()

    created.push(newTx)
  }

  return created
}

export async function updateTransactionService(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const db = getDb()
  const now = new Date().toISOString()

  const existing = db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()
  if (!existing) {
    throw new Error(`Transaction with id ${id} not found`)
  }

  const updatedData = {
    ...updates,
    updatedAt: now,
  }

  db.update(schema.transactions)
    .set(updatedData)
    .where(eq(schema.transactions.id, id))
    .run()

  const result = db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()!
  return {
    ...result,
    isRefund: Boolean(result.isRefund),
    sourceTransactionId: result.sourceTransactionId ?? undefined,
    rawData: result.rawData ?? undefined,
    originalTransactionId: result.originalTransactionId ?? undefined,
  }
}

export async function deleteTransactionsService(ids: string[]): Promise<boolean> {
  const db = getDb()
  for (const id of ids) {
    db.delete(schema.transactions).where(eq(schema.transactions.id, id)).run()
  }
  return true
}

export async function getCategoriesService(): Promise<Category[]> {
  const db = getDb()
  return db.select().from(schema.categories).all()
}

export async function saveCategoryService(category: Omit<Category, 'id'>): Promise<Category> {
  const db = getDb()
  const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const item: Category = { ...category, id }
  db.insert(schema.categories).values(item).run()
  return item
}

export async function getAccountsService(): Promise<Account[]> {
  const db = getDb()
  return db.select().from(schema.accounts).all()
}

export async function saveAccountService(account: Omit<Account, 'id'>): Promise<Account> {
  const db = getDb()
  const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const item: Account = { ...account, id }
  db.insert(schema.accounts).values(item).run()
  return item
}

export async function getCsvTemplatesService(): Promise<CsvTemplate[]> {
  const db = getDb()
  return db.select().from(schema.csvTemplates).all()
}

export async function saveCsvTemplateService(template: Omit<CsvTemplate, 'id' | 'createdAt'>): Promise<CsvTemplate> {
  const db = getDb()
  const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const createdAt = new Date().toISOString()
  const item: CsvTemplate = { ...template, id, createdAt }
  db.insert(schema.csvTemplates).values(item).run()
  return item
}

export async function getCategoryRulesService(): Promise<CategoryRule[]> {
  const db = getDb()
  return db.select().from(schema.categoryRules).all()
}

export async function saveCategoryRuleService(rule: Omit<CategoryRule, 'id'>): Promise<CategoryRule> {
  const db = getDb()
  const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const item: CategoryRule = { ...rule, id }
  db.insert(schema.categoryRules).values(item).run()
  return item
}
