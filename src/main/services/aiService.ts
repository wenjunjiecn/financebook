import type {
  RecognizedReceipt,
  AiCategorizeItem,
  AiCategorizeResult,
  AiParsedTransaction,
  AiInsightsContext,
  AiAnomalyResult,
  AiChatContext,
  AiChatResult,
} from '../../shared/types'

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

function buildEndpoint(baseUrl?: string, path = '/chat/completions'): string {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return `${base}${path}`
}

function checkApiKey(apiKey: string): void {
  if (!apiKey) {
    throw new Error('API Key 未配置，请先在设置中配置大模型 API Key。')
  }
}

/** 统一的 OpenAI 兼容 chat completions 请求 */
async function chatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  baseUrl?: string
): Promise<string> {
  const endpoint = buildEndpoint(baseUrl)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...body }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI 服务接口请求失败 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content || ''
  return content
}

/** 去掉 markdown code fence，安全 parse JSON */
function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  return JSON.parse(cleaned) as T
}

// ---------------------------------------------------------------------------
// 1. 图片识别票据（已有功能，保持不变）
// ---------------------------------------------------------------------------

export async function recognizeReceiptService(
  base64Image: string,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1'
): Promise<RecognizedReceipt> {
  checkApiKey(apiKey)

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '')

  const prompt = `你是一个专业的记账票据识别助手。请分析上传的收据、小票或支付截图，提取以下字段并严格返回 JSON 格式：
- payee: 商户名称或收款方名字（字符串）
- amountYuan: 实际交易金额（数值，单位：元，例如 18.50）
- date: 交易日期和时间（格式为 "YYYY-MM-DD HH:mm:ss"，若无具体时间则默认为 "YYYY-MM-DD 12:00:00"）
- notes: 消费商品明细或备注说明（字符串）
- categoryName: 建议分类名称（如：餐饮美食、购物消费、交通出行、住房物业、休闲娱乐、数码3C、医疗健康、其它支出等）

严格只输出包含以上 JSON 字段的对象，不要包含 markdown code fence 或额外说明。`

  try {
    const content = await chatCompletion(
      apiKey,
      {
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
              },
            ],
          },
        ],
      },
      baseUrl
    )

    const parsed = parseJsonResponse<{
      payee?: string
      amountYuan?: number
      date?: string
      notes?: string
      categoryName?: string
    }>(content)

    const amountInCents = Math.round(Number(parsed.amountYuan || 0) * 100)

    return {
      payee: parsed.payee || '未知名单/商户',
      amount: amountInCents,
      date: parsed.date || new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: parsed.notes || 'AI 识图识别',
      categoryName: parsed.categoryName || '其它支出',
      rawText: content,
    }
  } catch (err: any) {
    console.error('AI Recognition Error:', err)
    throw new Error(`AI 图片识别失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 2. AI 智能批量分类
// ---------------------------------------------------------------------------

export async function categorizeTransactionsService(
  items: AiCategorizeItem[],
  categories: Array<{ id: string; name: string; type: string }>,
  apiKey: string,
  baseUrl?: string
): Promise<AiCategorizeResult[]> {
  checkApiKey(apiKey)

  if (items.length === 0) return []

  const categoryList = categories.map((c) => `${c.id}(${c.name})`).join('、')

  const prompt = `你是一个专业的记账分类助手。请根据每笔交易的商户名称和备注，从以下分类列表中选择最匹配的分类。

可选分类列表（格式为 id(名称)）：
${categoryList}

待分类交易列表：
${JSON.stringify(
  items.map((it, i) => ({
    index: i,
    payee: it.payee,
    notes: it.notes,
    amountYuan: (it.amount / 100).toFixed(2),
  })),
  null,
  0
)}

请严格返回 JSON 数组，每个元素包含：
- index: 对应交易序号（数字）
- categoryId: 从分类列表中选择的分类 ID（字符串）
- categoryName: 对应分类名称（字符串）
- confidence: 置信度 0-1（数字）

只输出 JSON 数组，不要包含 markdown code fence 或额外说明。`

  try {
    const content = await chatCompletion(
      apiKey,
      { temperature: 0.1, messages: [{ role: 'user', content: prompt }] },
      baseUrl
    )

    const parsed = parseJsonResponse<
      Array<{ index: number; categoryId: string; categoryName: string; confidence: number }>
    >(content)

    // 构建结果，保证与输入 items 长度一致
    const results: AiCategorizeResult[] = new Array(items.length).fill(null).map(() => ({
      categoryId: '',
      categoryName: '',
      confidence: 0,
    }))

    for (const item of parsed) {
      if (typeof item.index === 'number' && item.index >= 0 && item.index < items.length) {
        results[item.index] = {
          categoryId: item.categoryId || '',
          categoryName: item.categoryName || '',
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        }
      }
    }

    return results
  } catch (err: any) {
    console.error('AI Categorize Error:', err)
    throw new Error(`AI 智能分类失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 3. AI 自然语言记账解析
// ---------------------------------------------------------------------------

export async function parseTextTransactionService(
  text: string,
  apiKey: string,
  baseUrl?: string
): Promise<AiParsedTransaction> {
  checkApiKey(apiKey)

  const now = new Date()
  const nowStr = now.toISOString().replace('T', ' ').substring(0, 19)

  const prompt = `你是一个专业的记账助手。请将用户的自然语言描述解析为结构化交易信息。

用户输入：「${text}」

当前时间：${nowStr}

请提取以下字段并严格返回 JSON 格式：
- amountYuan: 交易金额（数值，单位：元，例如 35.50）
- type: 交易类型，"expense"（支出）、"income"（收入）或 "transfer"（转账）
- payee: 商户或交易对方名称（字符串）
- categoryName: 建议分类（如：餐饮美食、购物消费、交通出行、住房物业、休闲娱乐、数码3C、医疗健康、工资收入、理财收益、退款收入、其它支出、其它收入）
- date: 交易日期时间（格式 "YYYY-MM-DD HH:mm:ss"，若用户说"今天"用当前日期，"昨天"用当前日期减一天，未提及时间默认 12:00:00）
- notes: 备注（字符串，可从用户输入中提取关键信息）

注意：
1. 如果用户没有明确金额，返回 amountYuan 为 0
2. 如果用户说"花了""消费""买了"等，type 为 expense
3. 如果用户说"收到""到账""工资"等，type 为 income

只输出 JSON 对象，不要包含 markdown code fence 或额外说明。`

  try {
    const content = await chatCompletion(
      apiKey,
      { temperature: 0.1, messages: [{ role: 'user', content: prompt }] },
      baseUrl
    )

    const parsed = parseJsonResponse<AiParsedTransaction>(content)

    return {
      amountYuan: Number(parsed.amountYuan) || 0,
      type: parsed.type === 'income' ? 'income' : parsed.type === 'transfer' ? 'transfer' : 'expense',
      payee: parsed.payee || '未知商户',
      categoryName: parsed.categoryName || '其它支出',
      date: parsed.date || nowStr,
      notes: parsed.notes || text,
    }
  } catch (err: any) {
    console.error('AI Parse Text Error:', err)
    throw new Error(`AI 自然语言解析失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 4. AI 月度财务洞察报告
// ---------------------------------------------------------------------------

export async function generateInsightsService(
  context: AiInsightsContext,
  apiKey: string,
  baseUrl?: string
): Promise<string> {
  checkApiKey(apiKey)

  const formatYuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`

  const categoryText = context.categoryBreakdown
    .map((c) => `  - ${c.categoryName}: ${formatYuan(c.amount)} (${c.percentage.toFixed(1)}%)`)
    .join('\n')

  const trendText = context.dailyTrends
    .map((d) => `  ${d.day}: 支出${formatYuan(d.expense * 100)}, 收入${formatYuan(d.income * 100)}`)
    .join('\n')

  let comparison = ''
  if (context.prevMonthExpense !== undefined || context.prevMonthIncome !== undefined) {
    comparison = '\n\n上月对比数据：'
    if (context.prevMonthExpense !== undefined) {
      const change = context.prevMonthExpense > 0
        ? ((context.totalExpense - context.prevMonthExpense) / context.prevMonthExpense * 100).toFixed(1)
        : '0'
      comparison += `\n  上月支出: ${formatYuan(context.prevMonthExpense)} (本月变化: ${change}%)`
    }
    if (context.prevMonthIncome !== undefined) {
      const change = context.prevMonthIncome > 0
        ? ((context.totalIncome - context.prevMonthIncome) / context.prevMonthIncome * 100).toFixed(1)
        : '0'
      comparison += `\n  上月收入: ${formatYuan(context.prevMonthIncome)} (本月变化: ${change}%)`
    }
  }

  const prompt = `你是一位专业的个人财务顾问。请根据以下用户的月度财务数据，生成一份简洁、有洞察力的中文财务分析报告。

【${context.yearMonth} 月度财务数据】
- 总支出: ${formatYuan(context.totalExpense)}
- 总收入: ${formatYuan(context.totalIncome)}
- 净结余: ${formatYuan(context.netIncome)}
- 交易笔数: ${context.txCount}
- 储蓄率: ${context.totalIncome > 0 ? ((context.netIncome / context.totalIncome) * 100).toFixed(1) : '0'}%

分类支出明细：
${categoryText || '  暂无数据'}

每日收支趋势：
${trendText || '  暂无数据'}${comparison}

请生成报告，包含以下部分（用 markdown 格式）：

1. **总览**（1-2句话总结本月财务状况）
2. **消费分析**（分析主要支出方向，指出占比最高的 2-3 个分类）
3. **趋势洞察**（指出消费趋势中的规律，如周末消费偏高、某天异常大额等）
4. **环比对比**（如果有上月数据，分析变化趋势和原因推测）
5. **建议**（2-3 条具体可执行的理财建议）

要求：
- 语气专业但亲切，像朋友间的财务建议
- 使用具体数字支撑观点
- 建议要具体可执行，不要空话套话
- 总字数控制在 300-400 字`

  try {
    const content = await chatCompletion(
      apiKey,
      { temperature: 0.7, messages: [{ role: 'user', content: prompt }] },
      baseUrl
    )
    return content.trim()
  } catch (err: any) {
    console.error('AI Insights Error:', err)
    throw new Error(`AI 洞察报告生成失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 5. AI 异常交易检测
// ---------------------------------------------------------------------------

export async function detectAnomaliesService(
  items: AiCategorizeItem[],
  recentHistory: AiCategorizeItem[],
  apiKey: string,
  baseUrl?: string
): Promise<AiAnomalyResult[]> {
  checkApiKey(apiKey)

  if (items.length === 0) return []

  // 限制历史数据量，避免 token 过多
  const historySample = recentHistory.slice(0, 50)

  const prompt = `你是一个专业的财务风控助手。请分析以下待检测交易是否存在异常。

待检测交易：
${JSON.stringify(
    items.map((it, i) => ({
      index: i,
      payee: it.payee,
      notes: it.notes,
      amountYuan: (it.amount / 100).toFixed(2),
    })),
    null,
    0
  )}

用户近期历史交易（用于参考正常消费水平）：
${JSON.stringify(
    historySample.map((h) => ({
      payee: h.payee,
      notes: h.notes,
      amountYuan: (h.amount / 100).toFixed(2),
    })),
    null,
    0
  )}

请判断每笔待检测交易是否异常。异常包括：
1. 金额远超该用户日常消费水平（如平时消费几十元，突然出现上千元）
2. 商户名称看起来可疑或异常
3. 深夜大额消费（但需从交易信息中判断）
4. 可能的重复扣款（不同商户名但金额相同且可疑）

请严格返回 JSON 数组，每个元素包含：
- index: 对应交易序号（数字）
- isAnomaly: 是否异常（布尔值）
- warning: 异常说明（字符串，正常则为空字符串 ""）
- severity: 严重程度 "low"/"medium"/"high"（正常则为 "low"）

只输出 JSON 数组，不要包含 markdown code fence 或额外说明。`

  try {
    const content = await chatCompletion(
      apiKey,
      { temperature: 0.1, messages: [{ role: 'user', content: prompt }] },
      baseUrl
    )

    const parsed = parseJsonResponse<Array<{ index: number; isAnomaly: boolean; warning: string; severity: string }>>(content)

    const results: AiAnomalyResult[] = new Array(items.length).fill(null).map((_, i) => ({
      index: i,
      isAnomaly: false,
      warning: '',
      severity: 'low' as const,
    }))

    for (const item of parsed) {
      if (typeof item.index === 'number' && item.index >= 0 && item.index < items.length) {
        results[item.index] = {
          index: item.index,
          isAnomaly: Boolean(item.isAnomaly),
          warning: item.warning || '',
          severity: (['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'low') as 'low' | 'medium' | 'high',
        }
      }
    }

    return results
  } catch (err: any) {
    console.error('AI Anomaly Detection Error:', err)
    throw new Error(`AI 异常检测失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 6. AI 预算建议
// ---------------------------------------------------------------------------

export async function suggestBudgetsService(
  categoryStats: Array<{ categoryId: string; categoryName: string; avgMonthly: number }>,
  apiKey: string,
  baseUrl?: string
): Promise<Array<{ categoryId: string; suggestedLimit: number }>> {
  checkApiKey(apiKey)

  if (categoryStats.length === 0) return []

  const prompt = `你是一个专业的财务规划师。请根据用户过去几个月的平均消费数据，为每个分类建议合理的月度预算限额。

各分类月均消费数据（amountYuan 为月均金额，单位：元）：
${JSON.stringify(
    categoryStats.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      avgMonthlyYuan: (c.avgMonthly / 100).toFixed(2),
    })),
    null,
    0
  )}

请为每个分类建议一个合理的月度预算限额。建议原则：
1. 预算限额通常略高于月均消费（上浮 10-20%），留出合理弹性
2. 对必要支出（如住房、餐饮）适当宽松
3. 对非必要支出（如娱乐、购物）可适当收紧
4. 金额单位为元

请严格返回 JSON 数组，每个元素包含：
- categoryId: 分类 ID（字符串）
- suggestedLimit: 建议月度预算限额（数值，单位：元）

只输出 JSON 数组，不要包含 markdown code fence 或额外说明。`

  try {
    const content = await chatCompletion(
      apiKey,
      { temperature: 0.3, messages: [{ role: 'user', content: prompt }] },
      baseUrl
    )

    const parsed = parseJsonResponse<Array<{ categoryId: string; suggestedLimit: number }>>(content)

    return categoryStats.map((c) => {
      const suggestion = parsed.find((p) => p.categoryId === c.categoryId)
      return {
        categoryId: c.categoryId,
        suggestedLimit: suggestion ? Math.round(Number(suggestion.suggestedLimit) * 100) : Math.round(c.avgMonthly * 1.15),
      }
    })
  } catch (err: any) {
    console.error('AI Budget Suggestion Error:', err)
    throw new Error(`AI 预算建议生成失败: ${err.message || err}`)
  }
}

// ---------------------------------------------------------------------------
// 7. AI 聊天记账助手
// ---------------------------------------------------------------------------

export async function chatService(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: AiChatContext,
  apiKey: string,
  baseUrl?: string
): Promise<AiChatResult> {
  checkApiKey(apiKey)

  const formatYuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`

  const now = new Date()
  const nowStr = now.toISOString().replace('T', ' ').substring(0, 19)

  const systemPrompt = `你是「小财」，一个专业、亲切的个人记账助手。用户正在使用一个桌面记账应用 FinanceBook，你可以帮用户记账、查询财务数据、提供理财建议。

当前时间：${nowStr}
当前月份：${context.yearMonth}

【用户本月财务概况】
- 总支出：${formatYuan(context.totalExpense)}
- 总收入：${formatYuan(context.totalIncome)}
- 净结余：${formatYuan(context.netIncome)}
- 交易笔数：${context.txCount}

【本月支出 Top 分类】
${context.topCategories.map((c) => `  - ${c.categoryName}：${formatYuan(c.amount)}（${c.percentage.toFixed(1)}%）`).join('\n') || '  暂无数据'}

【最近交易记录】
${context.recentTransactions.map((t) => `  - ${t.date} | ${t.payee} | ${formatYuan(t.amount)} | ${t.type === 'expense' ? '支出' : '收入'} | ${t.categoryName}`).join('\n') || '  暂无记录'}

【当前预算执行情况】
${context.budgets.map((b) => `  - ${b.categoryName}：预算 ${formatYuan(b.limit)}，已花 ${formatYuan(b.spent)}（${b.limit > 0 ? ((b.spent / b.limit) * 100).toFixed(0) : 0}%）`).join('\n') || '  暂无预算'}

【可选分类列表】
${context.categoryList.join('、')}

你的职责：
1. **记账**：当用户描述一笔消费/收入时（如"今天午饭花了35"、"昨天收到工资8000"），解析出结构化交易信息并返回 action
2. **查询**：当用户询问财务数据时（如"这个月花了多少"、"最近有什么大额消费"），基于上述数据回答
3. **建议**：当用户寻求建议时（如"怎么省钱"、"预算够不够"），给出具体可执行的建议
4. **闲聊**：友好地回应用户的日常交流

回复格式要求：
当你需要帮用户记账时，返回 JSON 格式：
{
  "reply": "自然的回复语，如：好的，已帮你记了一笔餐饮支出 ¥35.00，在星巴克。",
  "action": {
    "type": "create_transaction",
    "data": {
      "amountYuan": 35.00,
      "type": "expense",
      "payee": "星巴克",
      "categoryName": "餐饮美食",
      "date": "2024-01-15 12:00:00",
      "notes": "午饭"
    }
  }
}

当不需要记账时，只返回：
{"reply": "你的回复内容"}

注意：
- reply 字段始终要有，用中文自然对话
- categoryName 必须从可选分类列表中选择最接近的
- date 格式为 "YYYY-MM-DD HH:mm:ss"，"今天"用当前日期，"昨天"减一天
- 如果用户说的信息不完整（如没说金额），在 reply 中询问
- 回复要简洁，不要长篇大论

只输出 JSON，不要包含 markdown code fence 或额外说明。`

  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ]

    const content = await chatCompletion(
      apiKey,
      { temperature: 0.4, messages },
      baseUrl
    )

    const parsed = parseJsonResponse<{ reply: string; action?: { type: 'create_transaction'; data: AiParsedTransaction } }>(content)

    return {
      reply: parsed.reply || '抱歉，我没理解你的意思，能再说一遍吗？',
      action: parsed.action || undefined,
    }
  } catch (err: any) {
    console.error('AI Chat Error:', err)
    // 如果 JSON 解析失败，尝试直接返回原始文本
    try {
      const rawContent = err.message?.includes('JSON') ? '抱歉，处理出错了，请重试。' : String(err.message || err)
      return { reply: rawContent }
    } catch {
      throw new Error(`AI 聊天失败: ${err.message || err}`)
    }
  }
}
