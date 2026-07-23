#!/bin/bash
set -e

# ============================================================
#  FinanceBook — macOS 一键打包 + 安装 + 启动脚本
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="FinanceBook"
APP_BUNDLE="FinanceBook.app"
INSTALL_DIR="/Applications"

cd "$PROJECT_DIR"

echo ""
echo "🟦 FinanceBook — macOS Build & Install"
echo "──────────────────────────────────────────"
echo ""

# ── Step 0: 清理旧构建 ─────────────────────────────────────
echo "🧹 [0/4] 清理旧构建产物..."
rm -rf "$PROJECT_DIR/dist" "$PROJECT_DIR/dist-electron" "$PROJECT_DIR/release"
echo "  ✅ 已清理"
echo ""

# ── Step 1: Build ──────────────────────────────────────────
echo "📦 [1/4] 构建应用 (tsc + vite + electron-builder)..."
echo ""

# TypeScript 类型检查
npx tsc --noEmit
echo "  ✅ 类型检查通过"

# Vite 构建（renderer + electron main/preload）
npx vite build 2>&1 | grep -E "built|error|✓" | tail -5
echo "  ✅ Vite 构建完成"

# electron-builder 打包 macOS（跳过签名）
npx electron-builder --mac 2>&1 | grep -v "^$" | tail -15
echo "  ✅ electron-builder 打包完成"
echo ""

# ── Step 2: 定位安装包 (.dmg 或 .app) ─────────────────────
echo "🔍 [2/4] 查找安装包..."

# 优先查找 .dmg
DMG_PATH=$(find "$PROJECT_DIR/release" -name "*.dmg" -type f 2>/dev/null | head -1)

# 也查找直接生成的 .app
APP_BUILT=$(find "$PROJECT_DIR/release" -name "$APP_BUNDLE" -type d 2>/dev/null | head -1)

if [ -n "$DMG_PATH" ]; then
  INSTALL_MODE="dmg"
  echo "  ✅ 找到 DMG: $(basename "$DMG_PATH")"
elif [ -n "$APP_BUILT" ]; then
  INSTALL_MODE="app"
  echo "  ✅ 找到 APP: $APP_BUILT"
else
  echo "  ❌ 未找到安装包，请检查 release/ 目录"
  exit 1
fi
echo ""

# ── Step 3: 安装到 /Applications ───────────────────────────
echo "📥 [3/4] 安装到 $INSTALL_DIR..."

# 关闭正在运行的旧版本
if [ -d "$INSTALL_DIR/$APP_BUNDLE" ] || pgrep -f "$APP_BUNDLE" >/dev/null 2>&1; then
  echo "  · 检测到旧版本，正在替换..."
  osascript -e "tell application \"$APP_NAME\" to quit" 2>/dev/null || true
  sleep 1
  rm -rf "$INSTALL_DIR/$APP_BUNDLE"
fi

if [ "$INSTALL_MODE" = "dmg" ]; then
  # 通过 DMG 安装
  MOUNT_POINT=$(hdiutil attach "$DMG_PATH" -nobrowse -quiet | grep "/Volumes/" | awk '{print $NF}')
  if [ -z "$MOUNT_POINT" ]; then
    MOUNT_POINT=$(hdiutil attach "$DMG_PATH" -nobrowse | grep "Volumes" | sed 's/.*\/Volumes/\/Volumes/' | xargs)
  fi
  if [ -z "$MOUNT_POINT" ]; then
    echo "  ❌ DMG 挂载失败"
    exit 1
  fi
  echo "  · 挂载点: $MOUNT_POINT"

  APP_SOURCE=$(find "$MOUNT_POINT" -name "$APP_BUNDLE" -maxdepth 1 -type d | head -1)
  if [ -z "$APP_SOURCE" ]; then
    echo "  ❌ 在 DMG 中未找到 $APP_BUNDLE"
    hdiutil detach "$MOUNT_POINT" -quiet
    exit 1
  fi

  cp -R "$APP_SOURCE" "$INSTALL_DIR/"
  hdiutil detach "$MOUNT_POINT" -quiet
  echo "  · 已卸载 DMG"
else
  # 直接从构建目录复制 .app
  cp -R "$APP_BUILT" "$INSTALL_DIR/"
fi

# 清理扩展属性（避免 quarantine 问题）
find "$INSTALL_DIR/$APP_BUNDLE" -exec xattr -c {} \; 2>/dev/null || true

echo "  ✅ 已安装到 $INSTALL_DIR/$APP_BUNDLE"
echo ""

# ── Step 4: 启动应用 ──────────────────────────────────────
echo "🚀 [4/4] 启动 FinanceBook..."
open "$INSTALL_DIR/$APP_BUNDLE"
echo "  ✅ 应用已启动"
echo ""

echo "──────────────────────────────────────────"
echo "✅ 全部完成！FinanceBook 已安装并运行。"
echo ""
