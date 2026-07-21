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
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
