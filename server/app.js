import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { timingSafeEqual } from 'node:crypto'
import cors from '@koa/cors'
import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import serve from 'koa-static'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))

export function validateMessages(body) {
  const messages = body?.messages || (typeof body?.message === 'string' ? [{ role: 'user', content: body.message }] : null)
  if (!Array.isArray(messages) || !messages.length || messages.length > 60)
    throw new Error('对话必须包含 1 至 60 条消息。')
  let total = 0
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 20000)
      throw new Error('消息格式无效，或单条消息超过 20000 字符。')
    total += message.content.length
  }
  if (total > 100000 || messages.at(-1).role !== 'user')
    throw new Error('对话过长，或最后一条消息不是用户问题。')
  return messages.map(({ role, content }) => ({ role, content }))
}

function authorized(actual, expected) {
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function createChatApp({ client, model = 'deepseek-v4-pro', token = '', origins = [] }) {
  const app = new Koa()
  app.use(async (ctx, next) => {
    try { await next() }
    catch (error) {
      if (ctx.headerSent) return
      ctx.status = error.status || 500
      ctx.body = { error: ctx.status < 500 ? error.message : '服务暂时不可用。' }
    }
  })
  app.use(cors({ origin: ctx => origins.includes(ctx.get('Origin')) ? ctx.get('Origin') : '',
    allowMethods: ['GET', 'POST'], allowHeaders: ['Content-Type', 'X-Chat-Token'],
  }))
  app.use(bodyParser({ jsonLimit: '512kb' }))
  const router = new Router()
  router.get('/api/health', ctx => {
    ctx.body = { model, requiresToken: Boolean(token), configured: Boolean(client) }
  })
  router.post('/api/chat', async ctx => {
    if (token && !authorized(ctx.get('x-chat-token'), token)) {
      ctx.status = 401
      ctx.body = { error: '访问令牌无效，请检查连接设置。' }
      return
    }
    let messages
    try { messages = validateMessages(ctx.request.body) }
    catch (error) { ctx.status = 400; ctx.body = { error: error.message }; return }
    if (!client) { ctx.status = 503; ctx.body = { error: '模型 API 尚未配置。' }; return }

    const controller = new AbortController()
    const abort = () => controller.abort()
    ctx.res.once('close', abort)
    ctx.status = 200
    ctx.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', 'X-Content-Type-Options': 'nosniff' })
    ctx.respond = false
    const write = async data => {
      if (controller.signal.aborted) return
      if (!ctx.res.write(`data: ${JSON.stringify(data)}\n\n`))
        await once(ctx.res, 'drain', { signal: controller.signal })
    }
    const heartbeat = setInterval(() => {
      if (!ctx.res.destroyed) ctx.res.write(': keepalive\n\n')
    }, 15000)
    try {
      await write({ content: '' })
      const stream = await client.chat.completions.create({ messages, model, stream: true }, { signal: controller.signal })
      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        if (choice?.delta?.content) await write({ content: choice.delta.content })
        if (choice?.finish_reason === 'length') throw new Error('REPLY_TRUNCATED')
      }
      await write({ done: true })
    }
    catch (error) {
      if (!controller.signal.aborted) {
        console.error('Chat upstream error:', error.status || error.name)
        await write({ error: error.message === 'REPLY_TRUNCATED' ? '回复达到模型长度限制，请继续提问。' : '模型服务请求失败，请稍后重试。' })
      }
    }
    finally {
      clearInterval(heartbeat)
      ctx.res.off('close', abort)
      if (!ctx.res.destroyed) ctx.res.end()
    }
  })
  app.use(router.routes()).use(router.allowedMethods())
  app.use(serve(dist))
  app.use(async ctx => {
    if (ctx.method === 'GET' && !ctx.path.startsWith('/api/')) {
      try { ctx.type = 'html'; ctx.body = await readFile(`${dist}/index.html`, 'utf8') }
      catch { ctx.status = 404 }
    }
  })
  return app
}
