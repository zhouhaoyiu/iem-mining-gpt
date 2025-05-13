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
  const { message } = ctx.request.body // 确保从 ctx.request.body 获取 message
  console.log(message)

  const responseMessage = await openai.chat.completions.create({
    messages: [{ role: 'user', content: message }],
    model: 'deepseek-reasoner',
  })
  console.log(responseMessage.choices[0].message.content)
  // const responseMessage = `您的问题是 ${message}，我们正在开发相关功能，敬请期待。`
  ctx.body = { reply: responseMessage.choices[0].message.content }
})

app.use(router.routes()).use(router.allowedMethods())

// 3.指定监听的端口
app.listen(3000)
