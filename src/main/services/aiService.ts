import type { RecognizedReceipt } from '../../shared/types'

export async function recognizeReceiptService(
  base64Image: string,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1'
): Promise<RecognizedReceipt> {
  if (!apiKey) {
    throw new Error('API Key 未配置，请先在设置中配置大模型 API Key。')
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '')
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  const prompt = `你是一个专业的记账票据识别助手。请分析上传的收据、小票或支付截图，提取以下字段并严格返回 JSON 格式：
- payee: 商户名称或收款方名字（字符串）
- amountYuan: 实际交易金额（数值，单位：元，例如 18.50）
- date: 交易日期和时间（格式为 "YYYY-MM-DD HH:mm:ss"，若无具体时间则默认为 "YYYY-MM-DD 12:00:00"）
- notes: 消费商品明细或备注说明（字符串）
- categoryName: 建议分类名称（如：餐饮美食、购物消费、交通出行、住房物业、休闲娱乐、数码3C、医疗健康、其它支出等）

严格只输出包含以上 JSON 字段的对象，不要包含 markdown code fence 或额外说明。`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`AI 服务接口请求失败 (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJsonStr)

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
