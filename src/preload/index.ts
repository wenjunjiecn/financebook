import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const electronAPI: ElectronAPI = {
  db: {
    getTransactions: (filters) => ipcRenderer.invoke('db:getTransactions', filters),
    saveTransactions: (transactions) => ipcRenderer.invoke('db:saveTransactions', transactions),
    updateTransaction: (id, updates) => ipcRenderer.invoke('db:updateTransaction', id, updates),
    deleteTransactions: (ids) => ipcRenderer.invoke('db:deleteTransactions', ids),

    getCategories: () => ipcRenderer.invoke('db:getCategories'),
    saveCategory: (category) => ipcRenderer.invoke('db:saveCategory', category),

    getAccounts: () => ipcRenderer.invoke('db:getAccounts'),
    saveAccount: (account) => ipcRenderer.invoke('db:saveAccount', account),

    getCsvTemplates: () => ipcRenderer.invoke('db:getCsvTemplates'),
    saveCsvTemplate: (template) => ipcRenderer.invoke('db:saveCsvTemplate', template),

    getCategoryRules: () => ipcRenderer.invoke('db:getCategoryRules'),
    saveCategoryRule: (rule) => ipcRenderer.invoke('db:saveCategoryRule', rule),

    getBudgets: (period) => ipcRenderer.invoke('db:getBudgets', period),
    saveBudget: (budget) => ipcRenderer.invoke('db:saveBudget', budget),
    deleteBudget: (id) => ipcRenderer.invoke('db:deleteBudget', id),
  },

  safeStorage: {
    setApiKey: (keyName, value) => ipcRenderer.invoke('safeStorage:setApiKey', keyName, value),
    getApiKey: (keyName) => ipcRenderer.invoke('safeStorage:getApiKey', keyName),
    hasApiKey: (keyName) => ipcRenderer.invoke('safeStorage:hasApiKey', keyName),
  },

  file: {
    openFileDialog: (options) => ipcRenderer.invoke('file:openFileDialog', options),
    readTextFile: (filePath) => ipcRenderer.invoke('file:readTextFile', filePath),
    exportCsv: (filename, content) => ipcRenderer.invoke('file:exportCsv', filename, content),
    backupDatabase: () => ipcRenderer.invoke('file:backupDatabase'),
    restoreDatabase: () => ipcRenderer.invoke('file:restoreDatabase'),
  },

  ai: {
    recognizeReceipt: (base64Image, apiKey, baseUrl) => ipcRenderer.invoke('ai:recognizeReceipt', base64Image, apiKey, baseUrl),
    categorizeTransactions: (items, categories, apiKey, baseUrl) => ipcRenderer.invoke('ai:categorizeTransactions', items, categories, apiKey, baseUrl),
    parseTextTransaction: (text, apiKey, baseUrl) => ipcRenderer.invoke('ai:parseTextTransaction', text, apiKey, baseUrl),
    generateInsights: (context, apiKey, baseUrl) => ipcRenderer.invoke('ai:generateInsights', context, apiKey, baseUrl),
    detectAnomalies: (items, recentHistory, apiKey, baseUrl) => ipcRenderer.invoke('ai:detectAnomalies', items, recentHistory, apiKey, baseUrl),
    suggestBudgets: (categoryStats, apiKey, baseUrl) => ipcRenderer.invoke('ai:suggestBudgets', categoryStats, apiKey, baseUrl),
    chat: (message, history, context, apiKey, baseUrl) => ipcRenderer.invoke('ai:chat', message, history, context, apiKey, baseUrl),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
