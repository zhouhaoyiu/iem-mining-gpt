import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import serve from 'koa-static'
import OpenAI from 'openai'

// 2.创建服务端实例对象
const app = new Koa()

// 使用 bodyParser 中间件
app.use(bodyParser())
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (ctx) => {
    const origin = ctx.get('Origin')
    return origin && allowedOrigins.includes(origin) ? origin : ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的请求方法
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Chat-Token'], // 允许的请求头
}))

const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
const chatApiToken = process.env.CHAT_API_TOKEN
const requireChatToken = process.env.NODE_ENV === 'production' || Boolean(chatApiToken)

if (!apiKey)
  throw new Error('DEEPSEEK_API_KEY or OPENAI_API_KEY is required')

const openai = new OpenAI({
  baseURL: deepseekBaseUrl,
  apiKey,
})
const router = new Router()
// 静态资源中间件
app.use(serve('public')) // 注册处理静态资源的中间件

// 对话路由
router.post('/api/chat', async (ctx) => {
  if (requireChatToken && (!chatApiToken || ctx.get('x-chat-token') !== chatApiToken)) {
    ctx.status = 401
    ctx.body = 'Unauthorized'
    return
  }

  const { message } = ctx.request.body
  console.log(message)

  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
  })

  // 立即发送一个空响应，让客户端知道连接已建立
  ctx.res.write('data: {"content":""}\n\n')

  try {
    const stream = await openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: deepseekModel,
      stream: true,
      temperature: 0.7, // 降低温度以加快响应
      max_tokens: 1000, // 限制最大token数
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        ctx.res.write(`data: ${JSON.stringify({ content })}\n\n`)
      }
    }
  }
  catch (error) {
    console.error('DeepSeek request failed:', error)
    ctx.res.write(`data: ${JSON.stringify({ error: 'Upstream connection failed' })}\n\n`)
  }
  finally {
    ctx.res.end()
  }
})

app.use(router.routes()).use(router.allowedMethods())

// 3.指定监听的端口
app.listen(3000)
