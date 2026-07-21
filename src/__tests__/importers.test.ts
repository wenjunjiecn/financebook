import { describe, it, expect } from 'vitest'
import { parseAmountToCents } from '../renderer/src/importers/base'
import { WeChatImporter } from '../renderer/src/importers/wechatImporter'
import { AlipayImporter } from '../renderer/src/importers/alipayImporter'
import { detectDuplicates, detectRefunds } from '../renderer/src/importers/ruleEngine'
import type { Transaction, CandidateTransaction } from '../shared/types'

describe('Base Importer Utilities', () => {
  it('should parse floating point string amounts into exact integer cents', () => {
    expect(parseAmountToCents('12.34')).toBe(1234)
    expect(parseAmountToCents('¥100.50')).toBe(10050)
    expect(parseAmountToCents('0.01')).toBe(1)
    expect(parseAmountToCents('-45.00')).toBe(-4500)
  })
})

describe('WeChat & Alipay CSV Importers', () => {
  it('should skip WeChat header metadata and parse rows', () => {
    const mockWeChatCsv = `微信支付账单明细,,,,,,,,,,
----------------------微信支付账单明细--------------------,,,,,,,,,,
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-07-20 12:00:00,扫二维码付款,星巴克,咖啡,支出,¥35.00,零钱,支付成功,wx123456789,m123,
`
    const importer = new WeChatImporter()
    const candidates = importer.parse(mockWeChatCsv)

    expect(candidates.length).toBe(1)
    expect(candidates[0].payee).toBe('星巴克')
    expect(candidates[0].amount).toBe(3500)
    expect(candidates[0].type).toBe('expense')
    expect(candidates[0].sourceTransactionId).toBe('wx123456789')
  })

  it('should parse Alipay CSV rows correctly', () => {
    const mockAlipayCsv = `支付宝交易记录明细
------------------------------------------------------------------------------------
交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
2026-07-20 18:30:00,餐饮,麦当劳,kfc@qq.com,汉堡套餐,支出,42.50,花呗,交易成功,ali987654321,m987,
`
    const importer = new AlipayImporter()
    const candidates = importer.parse(mockAlipayCsv)

    expect(candidates.length).toBe(1)
    expect(candidates[0].payee).toBe('麦当劳')
    expect(candidates[0].amount).toBe(4250)
    expect(candidates[0].sourceTransactionId).toBe('ali987654321')
  })
})

describe('Rule Engine: Duplication & Refund Detection', () => {
  it('should mark duplicate candidates based on sourceTransactionId', () => {
    const existing: Transaction[] = [
      {
        id: 'tx_1',
        amount: 3500,
        type: 'expense',
        categoryId: 'cat_food',
        accountId: 'acc_wechat',
        date: '2026-07-20 12:00:00',
        payee: '星巴克',
        notes: '',
        paymentMethod: '微信',
        status: 'normal',
        source: 'wechat_csv',
        sourceTransactionId: 'wx123456789',
        isRefund: false,
        createdAt: '',
        updatedAt: '',
      },
    ]

    const candidates: CandidateTransaction[] = [
      {
        tempId: 'temp_1',
        amount: 3500,
        type: 'expense',
        categoryId: 'cat_food',
        accountId: 'acc_wechat',
        date: '2026-07-20 12:00:00',
        payee: '星巴克',
        notes: '',
        paymentMethod: '微信',
        status: 'normal',
        source: 'wechat_csv',
        sourceTransactionId: 'wx123456789',
        isRefund: false,
        isSelected: true,
      },
    ]

    const checked = detectDuplicates(candidates, existing)
    expect(checked[0].status).toBe('duplicate')
    expect(checked[0].isSelected).toBe(false)
  })

  it('should associate refund transactions to original expense', () => {
    const existing: Transaction[] = [
      {
        id: 'tx_origin',
        amount: 19900,
        type: 'expense',
        categoryId: 'cat_shopping',
        accountId: 'acc_alipay',
        date: '2026-07-15 10:00:00',
        payee: '优衣库',
        notes: '衣服',
        paymentMethod: '支付宝',
        status: 'normal',
        source: 'alipay_csv',
        isRefund: false,
        createdAt: '',
        updatedAt: '',
      },
    ]

    const candidates: CandidateTransaction[] = [
      {
        tempId: 'temp_refund',
        amount: 19900,
        type: 'income',
        categoryId: 'cat_refund',
        accountId: 'acc_alipay',
        date: '2026-07-16 11:00:00',
        payee: '优衣库退款',
        notes: '退款',
        paymentMethod: '支付宝',
        status: 'normal',
        source: 'alipay_csv',
        isRefund: true,
        isSelected: true,
      },
    ]

    const processed = detectRefunds(candidates, existing)
    expect(processed[0].status).toBe('refunded')
    expect(processed[0].originalTransactionId).toBe('tx_origin')
  })
})
