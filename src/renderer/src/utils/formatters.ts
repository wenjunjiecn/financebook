/**
 * 格式化整数分转化为标准人民币金额字符串（如：1234 -> "¥12.34"）
 */
export function formatCentsToYuan(cents: number): string {
  const yuan = cents / 100
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(yuan)
}

/**
 * 纯数字格式化（不带货币符号）
 */
export function formatCentsToNumber(cents: number): string {
  return (cents / 100).toFixed(2)
}
