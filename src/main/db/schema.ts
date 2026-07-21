import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  amount: integer('amount').notNull(), // 单位：分
  type: text('type').$type<'expense' | 'income' | 'transfer'>().notNull(),
  categoryId: text('category_id').notNull(),
  accountId: text('account_id').notNull(),
  date: text('date').notNull(), // ISO YYYY-MM-DD HH:mm:ss
  payee: text('payee').notNull(),
  notes: text('notes').notNull().default(''),
  paymentMethod: text('payment_method').notNull().default(''),
  status: text('status').$type<'normal' | 'refunded' | 'transferred' | 'duplicate'>().notNull().default('normal'),
  source: text('source').$type<'manual' | 'wechat_csv' | 'alipay_csv' | 'generic_csv' | 'ai_image'>().notNull().default('manual'),
  sourceTransactionId: text('source_transaction_id'),
  rawData: text('raw_data'),
  isRefund: integer('is_refund', { mode: 'boolean' }).notNull().default(false),
  originalTransactionId: text('original_transaction_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  type: text('type').$type<'expense' | 'income'>().notNull(),
  parentId: text('parent_id'),
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<'checking' | 'credit' | 'alipay' | 'wechat' | 'cash'>().notNull(),
  balance: integer('balance').notNull().default(0), // 单位：分
  currency: text('currency').notNull().default('CNY'),
})

export const csvTemplates = sqliteTable('csv_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mappingJson: text('mapping_json').notNull(),
  createdAt: text('created_at').notNull(),
})

export const categoryRules = sqliteTable('category_rules', {
  id: text('id').primaryKey(),
  keyword: text('keyword').notNull(),
  categoryId: text('category_id').notNull(),
  priority: integer('priority').notNull().default(0),
})
