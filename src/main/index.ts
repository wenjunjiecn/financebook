import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import {
  initDatabase,
  getTransactionsService,
  saveTransactionsService,
  updateTransactionService,
  deleteTransactionsService,
  getCategoriesService,
  saveCategoryService,
  getAccountsService,
  saveAccountService,
  getCsvTemplatesService,
  saveCsvTemplateService,
  getCategoryRulesService,
  saveCategoryRuleService,
  getBudgetsService,
  saveBudgetService,
  deleteBudgetService,
  getDbPath,
  closeDatabase,
} from './db/client'
import { setApiKeyService, getApiKeyService, hasApiKeyService } from './services/safeStorage'
import {
  recognizeReceiptService,
  categorizeTransactionsService,
  parseTextTransactionService,
  generateInsightsService,
  detectAnomaliesService,
  suggestBudgetsService,
  chatService,
} from './services/aiService'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发环境加载 Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 注册 IPC Handlers
function setupIpcHandlers() {
  // DB IPC
  ipcMain.handle('db:getTransactions', (_, filters) => getTransactionsService(filters))
  ipcMain.handle('db:saveTransactions', (_, txs) => saveTransactionsService(txs))
  ipcMain.handle('db:updateTransaction', (_, id, updates) => updateTransactionService(id, updates))
  ipcMain.handle('db:deleteTransactions', (_, ids) => deleteTransactionsService(ids))

  ipcMain.handle('db:getCategories', () => getCategoriesService())
  ipcMain.handle('db:saveCategory', (_, cat) => saveCategoryService(cat))

  ipcMain.handle('db:getAccounts', () => getAccountsService())
  ipcMain.handle('db:saveAccount', (_, acc) => saveAccountService(acc))

  ipcMain.handle('db:getCsvTemplates', () => getCsvTemplatesService())
  ipcMain.handle('db:saveCsvTemplate', (_, tpl) => saveCsvTemplateService(tpl))

  ipcMain.handle('db:getCategoryRules', () => getCategoryRulesService())
  ipcMain.handle('db:saveCategoryRule', (_, rule) => saveCategoryRuleService(rule))

  ipcMain.handle('db:getBudgets', (_, period) => getBudgetsService(period))
  ipcMain.handle('db:saveBudget', (_, budget) => saveBudgetService(budget))
  ipcMain.handle('db:deleteBudget', (_, id) => deleteBudgetService(id))

  // SafeStorage IPC
  ipcMain.handle('safeStorage:setApiKey', (_, name, val) => setApiKeyService(name, val))
  ipcMain.handle('safeStorage:getApiKey', (_, name) => getApiKeyService(name))
  ipcMain.handle('safeStorage:hasApiKey', (_, name) => hasApiKeyService(name))

  // File IPC
  ipcMain.handle('file:openFileDialog', async (_, options) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options?.filters || [{ name: 'CSV & Image Files', extensions: ['csv', 'txt', 'png', 'jpg', 'jpeg'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:readTextFile', async (_, filePath: string) => {
    return fs.readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('file:exportCsv', async (_, filename: string, content: string) => {
    if (!mainWindow) return false
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return false
    fs.writeFileSync(saveResult.filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('file:backupDatabase', async () => {
    if (!mainWindow) return null
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `FinanceBackup_${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return null
    const currentDbPath = getDbPath()
    fs.copyFileSync(currentDbPath, saveResult.filePath)
    return saveResult.filePath
  })

  ipcMain.handle('file:restoreDatabase', async () => {
    if (!mainWindow) return false
    const openResult = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    })
    if (openResult.canceled || !openResult.filePaths[0]) return false
    closeDatabase()
    const currentDbPath = getDbPath()
    fs.copyFileSync(openResult.filePaths[0], currentDbPath)
    initDatabase()
    return true
  })

  // AI IPC
  ipcMain.handle('ai:recognizeReceipt', (_, base64Image, apiKey, baseUrl) =>
    recognizeReceiptService(base64Image, apiKey, baseUrl)
  )

  ipcMain.handle('ai:categorizeTransactions', (_, items, categories, apiKey, baseUrl) =>
    categorizeTransactionsService(items, categories, apiKey, baseUrl)
  )

  ipcMain.handle('ai:parseTextTransaction', (_, text, apiKey, baseUrl) =>
    parseTextTransactionService(text, apiKey, baseUrl)
  )

  ipcMain.handle('ai:generateInsights', (_, context, apiKey, baseUrl) =>
    generateInsightsService(context, apiKey, baseUrl)
  )

  ipcMain.handle('ai:detectAnomalies', (_, items, recentHistory, apiKey, baseUrl) =>
    detectAnomaliesService(items, recentHistory, apiKey, baseUrl)
  )

  ipcMain.handle('ai:suggestBudgets', (_, categoryStats, apiKey, baseUrl) =>
    suggestBudgetsService(categoryStats, apiKey, baseUrl)
  )

  ipcMain.handle('ai:chat', (_, message, history, context, apiKey, baseUrl) =>
    chatService(message, history, context, apiKey, baseUrl)
  )
}

app.whenReady().then(() => {
  initDatabase()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
