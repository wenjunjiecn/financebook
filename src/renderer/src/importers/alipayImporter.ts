import Papa from 'papaparse'
import type { CandidateTransaction } from '../../../shared/types'
import { BillImporter, parseAmountToCents } from './base'

export class AlipayImporter implements BillImporter {
  name = '支付宝 CSV 账单'
  sourceKey = 'alipay_csv' as const

  parse(rawContent: string): CandidateTransaction[] {
    const lines = rawContent.split(/\r?\n/)
    let headerIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('交易时间') && lines[i].includes('交易对方') && lines[i].includes('金额')) {
        headerIndex = i
        break
      }
    }

    if (headerIndex === -1) {
      throw new Error('未识别到支付宝账单的格式表头，请确认文件是否为支付宝导出的 CSV 账单。')
    }

    const csvData = lines.slice(headerIndex).join('\n')
    const parsed = Papa.parse<Record<string, string>>(csvData, {
      header: true,
      skipEmptyLines: true,
    })

    const results: CandidateTransaction[] = []

    for (const row of parsed.data) {
      const date = row['交易时间']?.trim()
      const payee = row['交易对方']?.trim()
      const rawAmount = row['金额'] || row['金额（元）'] || '0'
      const typeStr = row['收/支']?.trim()
      const paymentMethod = row['收/付款方式']?.trim() || '支付宝'
      const notes = row['商品说明']?.trim() || row['备注']?.trim() || ''
      const sourceTxId = row['交易订单号']?.trim() || row['商家订单号']?.trim()

      if (!date || !payee) continue

      const amountCents = parseAmountToCents(rawAmount)
      let type: CandidateTransaction['type'] = 'expense'
      if (typeStr === '收入') {
        type = 'income'
      } else if (typeStr === '不计收支' || typeStr === '资金转移') {
        type = 'transfer'
      }

      const isRefund = notes.includes('退款') || payee.includes('退款') || (row['交易状态']?.includes('退款成功') ?? false)

      results.push({
        tempId: `alipay_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        amount: Math.abs(amountCents),
        type,
        categoryId: 'cat_other_exp',
        accountId: 'acc_alipay',
        date,
        payee,
        notes,
        paymentMethod,
        status: 'normal',
        source: 'alipay_csv',
        sourceTransactionId: sourceTxId,
        rawData: JSON.stringify(row),
        isRefund,
        isSelected: true,
      })
    }

    return results
  }
}
