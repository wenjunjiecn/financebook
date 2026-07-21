import { safeStorage, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function getStoragePath(keyName: string): string {
  const dir = path.join(app.getPath('userData'), 'secure_keys')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, `${keyName}.enc`)
}

export function setApiKeyService(keyName: string, value: string): boolean {
  try {
    const file = getStoragePath(keyName)
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value)
      fs.writeFileSync(file, encrypted)
    } else {
      // Fallback base64 simple buffer storage if safeStorage unavailable
      const encoded = Buffer.from(value).toString('base64')
      fs.writeFileSync(file, encoded, 'utf-8')
    }
    return true
  } catch (err) {
    console.error('Failed to set API Key in safeStorage:', err)
    return false
  }
}

export function getApiKeyService(keyName: string): string | null {
  try {
    const file = getStoragePath(keyName)
    if (!fs.existsSync(file)) return null

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = fs.readFileSync(file)
      return safeStorage.decryptString(encrypted)
    } else {
      const content = fs.readFileSync(file, 'utf-8')
      return Buffer.from(content, 'base64').toString('utf-8')
    }
  } catch (err) {
    console.error('Failed to decrypt API Key from safeStorage:', err)
    return null
  }
}

export function hasApiKeyService(keyName: string): boolean {
  const file = getStoragePath(keyName)
  return fs.existsSync(file)
}
