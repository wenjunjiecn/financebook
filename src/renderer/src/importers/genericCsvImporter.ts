import Papa from 'papaparse'
import type { CandidateTransaction } from '../../../shared/types'
import { parseAmountToCents } from './base'

export interface FieldMapping {
  dateColIndex: number
  payeeColIndex: number
  amountColIndex: number
  typeColIndex?: number
  notesColIndex?: number
  sourceTxIdColIndex?: number
  hasHeader: boolean
}

export class GenericCsvImporter {
  name = '通用 CSV 映射解析器'
  sourceKey = 'generic_csv' as const

  parseWithMapping(rawContent: string, mapping: FieldMapping): CandidateTransaction[] {
    const parsed = Papa.parse<string[]>(rawContent, {
      skipEmptyLines: true,
    })

    const rows = mapping.hasHeader ? parsed.data.slice(1) : parsed.data
    const results: CandidateTransaction[] = []

    for (const row of rows) {
      if (!row || row.length === 0) continue

      const date = row[mapping.dateColIndex]?.trim()
      const payee = row[mapping.payeeColIndex]?.trim()
      const rawAmount = row[mapping.amountColIndex]?.trim() || '0'
      const typeVal = mapping.typeColIndex !== undefined ? row[mapping.typeColIndex]?.trim() : ''
      const notes = mapping.notesColIndex !== undefined ? row[mapping.notesColIndex]?.trim() || '' : ''
      const sourceTxId = mapping.sourceTxIdColIndex !== undefined ? row[mapping.sourceTxIdColIndex]?.trim() : undefined

      if (!date || !payee) continue

      const amountCents = parseAmountToCents(rawAmount)
      let type: CandidateTransaction['type'] = 'expense'
      if (typeVal.includes('收') || typeVal.toLowerCase().includes('income')) {
        type = 'income'
      } else if (typeVal.includes('转') || typeVal.toLowerCase().includes('transfer')) {
        type = 'transfer'
      }

      const isRefund = notes.includes('退款') || payee.includes('退款')

      results.push({
        tempId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        amount: Math.abs(amountCents),
        type,
        categoryId: 'cat_other_exp',
        accountId: 'acc_bank',
        date,
        payee,
        notes,
        paymentMethod: '通用导入',
        status: 'normal',
        source: 'generic_csv',
        sourceTransactionId: sourceTxId,
        rawData: JSON.stringify(row),
        isRefund,
        isSelected: true,
      })
    }

    return results
  }
}
