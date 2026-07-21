import { useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'financebook-theme'

/**
 * 获取系统当前是否为暗色模式
 */
const getSystemDark = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 从 localStorage 读取已保存的主题偏好
 */
const getStoredTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* ignore */
  }
  return 'system'
}

/**
 * 将主题模式应用为 document 上的 class
 */
const applyThemeClass = (mode: ThemeMode) => {
  const isDark = mode === 'dark' || (mode === 'system' && getSystemDark())
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export interface UseThemeReturn {
  /** 当前用户选择的主题模式 */
  themeMode: ThemeMode
  /** 当前实际生效的是否为暗色（system 模式下会跟随系统） */
  isDark: boolean
  /** 设置主题模式并持久化 */
  setThemeMode: (mode: ThemeMode) => void
  /** 在 light / dark 之间快速切换 */
  toggleTheme: () => void
}

/**
 * 明暗主题管理 hook。
 *
 * - 支持 `light` / `dark` / `system` 三种模式
 * - 通过 localStorage 持久化用户选择
 * - 在 `system` 模式下实时监听系统主题变化
 * - 应用启动时立即应用主题，避免闪烁
 */
export const useTheme = (): UseThemeReturn => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredTheme())
  const [isDark, setIsDark] = useState<boolean>(() => {
    const mode = getStoredTheme()
    return mode === 'dark' || (mode === 'system' && getSystemDark())
  })

  // 应用主题到 DOM
  useEffect(() => {
    applyThemeClass(themeMode)
    setIsDark(themeMode === 'dark' || (themeMode === 'system' && getSystemDark()))
  }, [themeMode])

  // 监听系统主题变化（仅在 system 模式下需要更新 isDark 与 DOM）
  useEffect(() => {
    if (themeMode !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      if (e.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      root.style.colorScheme = e.matches ? 'dark' : 'light'
      setIsDark(e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
    setThemeModeState(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = isDark ? 'light' : 'dark'
    setThemeMode(next)
  }, [isDark])

  return { themeMode, isDark, setThemeMode, toggleTheme }
}

/**
 * 在应用挂载前提前应用主题，避免首屏闪烁。
 * 应在 main.tsx 中渲染前调用一次。
 */
export const initializeTheme = (): void => {
  applyThemeClass(getStoredTheme())
}
