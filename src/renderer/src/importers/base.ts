import type { CandidateTransaction } from '../../../shared/types'

export interface BillImporter {
  name: string
  sourceKey: CandidateTransaction['source']
  parse(rawContent: string): CandidateTransaction[]
}

/**
 * 金额转换帮助函数：将字符串格式的金额（如 "12.34" 或 "¥1,200.50"）无损转化为整数分
 */
export function parseAmountToCents(amountStr: string): number {
  if (!amountStr) return 0
  const cleaned = amountStr.replace(/[^\d.-]/g, '').trim()
  if (!cleaned) return 0
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}
