import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import serve from 'koa-static'

// 2.创建服务端实例对象
const app = new Koa()

// 使用 bodyParser 中间件
app.use(bodyParser())

// 自定义 CORS 配置
app.use(cors({
  origin: '*', // 允许所有来源
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的请求方法
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'], // 允许的请求头
}))

const router = new Router()
// 静态资源中间件
app.use(serve('public')) // 注册处理静态资源的中间件

// 对话路由
router.post('/api/chat', async (ctx) => {
  const { message } = ctx.request.body // 确保从 ctx.request.body 获取 message
  // 模拟AI回复
  const responseMessage = `您的问题是 ${message}，我们正在开发相关功能，敬请期待。`
  ctx.body = { reply: responseMessage }
})

app.use(router.routes()).use(router.allowedMethods())

// 3.指定监听的端口
app.listen(3000)
