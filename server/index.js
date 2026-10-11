import OpenAI from 'openai'
import { createChatApp } from './app.js'

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
if (!apiKey && process.env.NODE_ENV === 'production')
  throw new Error('Set DEEPSEEK_API_KEY or OPENAI_API_KEY in .env before starting the API server.')
const token = process.env.CHAT_API_TOKEN || ''
if (process.env.NODE_ENV === 'production' && !token)
  throw new Error('CHAT_API_TOKEN is required in production.')
if (token && !/^[\x21-\x7e]+$/.test(token))
  throw new Error('CHAT_API_TOKEN must use printable ASCII without spaces.')
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
const client = apiKey ? new OpenAI({ baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com', apiKey }) : undefined
const app = createChatApp({ client, model, token,
  origins: process.env.CORS_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean),
})
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'
app.listen(port, host, () => console.info(`IEM GPT API: http://${host}:${port}`))
