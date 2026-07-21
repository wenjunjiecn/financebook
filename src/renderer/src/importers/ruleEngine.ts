import type { CandidateTransaction, Transaction, CategoryRule } from '../../../shared/types'

export function applyAutoCategory(
  candidates: CandidateTransaction[],
  rules: CategoryRule[]
): CandidateTransaction[] {
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  return candidates.map((candidate) => {
    let matchedCatId = candidate.categoryId

    for (const rule of sortedRules) {
      if (!rule.keyword) continue
      const targetText = `${candidate.payee} ${candidate.notes}`
      if (targetText.toLowerCase().includes(rule.keyword.toLowerCase())) {
        matchedCatId = rule.categoryId
        break
      }
    }

    return {
      ...candidate,
      categoryId: matchedCatId,
    }
  })
}

export function detectDuplicates(
  candidates: CandidateTransaction[],
  existingTransactions: Transaction[]
): CandidateTransaction[] {
  return candidates.map((candidate) => {
    // 1. 强查重：匹配第三方平台订单号
    if (candidate.sourceTransactionId) {
      const matchByTxId = existingTransactions.find(
        (tx) => tx.sourceTransactionId && tx.sourceTransactionId === candidate.sourceTransactionId
      )
      if (matchByTxId) {
        return {
          ...candidate,
          status: 'duplicate',
          duplicateMatchId: matchByTxId.id,
          duplicateMatchReason: `存在相同第三方单号 (${candidate.sourceTransactionId})`,
          isSelected: false, // 重复项默认不选中
        }
      }
    }

    // 2. 软查重：相同金额 + 相同商户/收款方 + 日期相近(48小时内)
    const candidateTime = new Date(candidate.date).getTime()
    if (!isNaN(candidateTime)) {
      const softMatch = existingTransactions.find((tx) => {
        if (tx.amount !== candidate.amount) return false
        if (tx.payee.trim() !== candidate.payee.trim()) return false

        const txTime = new Date(tx.date).getTime()
        if (isNaN(txTime)) return false

        const diffHours = Math.abs(candidateTime - txTime) / (1000 * 60 * 60)
        return diffHours <= 48
      })

      if (softMatch) {
        return {
          ...candidate,
          status: 'duplicate',
          duplicateMatchId: softMatch.id,
          duplicateMatchReason: `检测到 48小时内 相同商户及金额相同的已入账交易`,
          isSelected: false,
        }
      }
    }

    return candidate
  })
}

export function detectRefunds(
  candidates: CandidateTransaction[],
  existingTransactions: Transaction[]
): CandidateTransaction[] {
  return candidates.map((candidate) => {
    if (candidate.isRefund || candidate.payee.includes('退款') || candidate.notes.includes('退款')) {
      // 在已有交易中搜索金额匹配的支出记录
      const originMatch = existingTransactions.find(
        (tx) => tx.type === 'expense' && tx.amount === candidate.amount && (tx.payee.includes(candidate.payee.replace('退款', '').trim()) || candidate.payee.includes(tx.payee))
      )

      if (originMatch) {
        return {
          ...candidate,
          status: 'refunded',
          refundMatchId: originMatch.id,
          originalTransactionId: originMatch.id,
          isRefund: true,
        }
      }
    }

    return candidate
  })
}

export function processImportCandidates(
  rawCandidates: CandidateTransaction[],
  existingTransactions: Transaction[],
  rules: CategoryRule[]
): CandidateTransaction[] {
  const categorized = applyAutoCategory(rawCandidates, rules)
  const deDuplicated = detectDuplicates(categorized, existingTransactions)
  const processed = detectRefunds(deDuplicated, existingTransactions)
  return processed
}
