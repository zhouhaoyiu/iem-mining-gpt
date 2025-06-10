import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import serve from 'koa-static'
import OpenAI from 'openai'
import { apiKey } from './apikey.js'

// 2.创建服务端实例对象
const app = new Koa()

// 使用 bodyParser 中间件
app.use(bodyParser())
// 在 当前目录的apikey.js文件 自定义的话请手动创建如下面格式的文件
// let apiKey = "sk-********************************"
// export { apiKey }

app.use(cors({
  origin: '*', // 允许所有来源
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的请求方法
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'], // 允许的请求头
}))

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey,
})
const router = new Router()
// 静态资源中间件
app.use(serve('public')) // 注册处理静态资源的中间件

// 对话路由
router.post('/api/chat', async (ctx) => {
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

  const stream = await openai.chat.completions.create({
    messages: [{ role: 'user', content: message }],
    model: 'deepseek-reasoner',
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

  ctx.res.end()
})

app.use(router.routes()).use(router.allowedMethods())

// 3.指定监听的端口
app.listen(3000)
