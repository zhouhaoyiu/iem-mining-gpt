import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { SSEDecoder } from '../lib/chat-stream.ts'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'complete' | 'streaming' | 'error' | 'stopped'
  error?: string
}
export interface Conversation { id: string; title: string; messages: ChatMessage[]; updatedAt: string }
const makeId = () => crypto.randomUUID()
const freshConversation = (): Conversation => ({ id: makeId(), title: '新对话', messages: [], updatedAt: new Date().toISOString() })

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([freshConversation()])
  const activeId = ref(conversations.value[0].id)
  const token = ref('')
  const apiBase = ref(import.meta.env?.VITE_API_BASE_URL || '')
  const model = ref('')
  const requiresToken = ref(false)
  const connection = ref<'checking' | 'ready' | 'offline'>('checking')
  const connectionError = ref('')
  const generatingId = ref<string | null>(null)
  let controller: AbortController | null = null
  const activeConversation = computed(() => conversations.value.find(item => item.id === activeId.value) || conversations.value[0])
  const messages = computed(() => activeConversation.value.messages)
  const isSending = computed(() => generatingId.value !== null)

  if (typeof window !== 'undefined') {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem('iem-chat-v2') || 'null')
      if (Array.isArray(saved) && saved.length && saved.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && Array.isArray(item.messages) && item.messages.every((message: ChatMessage) => message && typeof message.id === 'string' && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string'))) {
        conversations.value = saved.map(item => ({ ...item, messages: item.messages.map((message: ChatMessage) => ({ ...message, status: message.status === 'streaming' ? 'stopped' : message.status })) }))
        activeId.value = conversations.value[0].id
      }
    } catch { /* Ignore unavailable or malformed tab storage. */ }
    watch(conversations, value => {
      try { sessionStorage.setItem('iem-chat-v2', JSON.stringify(value)) } catch { /* A full storage quota must not interrupt a reply. */ }
    }, { deep: true })
  }

  function endpoint(path: string) { return `${apiBase.value.replace(/\/$/, '')}${path}` }

  async function checkConnection() {
    connection.value = 'checking'
    connectionError.value = ''
    try {
      const response = await fetch(endpoint('/api/health'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error('无法连接聊天服务。')
      const health = await response.json()
      if (typeof health.model !== 'string' || typeof health.requiresToken !== 'boolean') throw new Error('服务响应格式无效。')
      if (!health.configured) throw new Error('模型 API 尚未配置。')
      model.value = health.model
      requiresToken.value = health.requiresToken
      connection.value = 'ready'
    } catch (error) {
      connection.value = 'offline'
      connectionError.value = error instanceof Error ? error.message : '无法连接聊天服务。'
    }
  }

  function newConversation() {
    const conversation = freshConversation()
    conversations.value.unshift(conversation)
    activeId.value = conversation.id
  }
  function stop() { controller?.abort() }
  function deleteConversation(id: string) {
    if (generatingId.value === id) stop()
    conversations.value = conversations.value.filter(item => item.id !== id)
    if (!conversations.value.length) conversations.value.push(freshConversation())
    if (activeId.value === id) activeId.value = conversations.value[0].id
  }

  async function generate(conversation: Conversation, userIndex: number) {
    if (isSending.value) return false
    const history = conversation.messages.slice(0, userIndex + 1)
      .filter(message => message.content.trim() && (message.role === 'user' || message.status === 'complete'))
      .map(({ role, content }) => ({ role, content }))
    const reply: ChatMessage = { id: makeId(), role: 'assistant', content: '', status: 'streaming' }
    conversation.messages.splice(userIndex + 1, conversation.messages.length, reply)
    // Stream callbacks target a stable reactive reply, never the last message globally.
    const target = conversation.messages[userIndex + 1]
    generatingId.value = conversation.id
    controller = new AbortController()
    let done = false
    try {
      const response = await fetch(endpoint('/api/chat'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token.value ? { 'X-Chat-Token': token.value } : {}) },
        body: JSON.stringify({ messages: history }), signal: controller.signal,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `请求失败（HTTP ${response.status}）。`)
      }
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('服务没有返回流式回复。')
      const reader = response.body.getReader()
      const textDecoder = new TextDecoder()
      const decoder = new SSEDecoder()
      try {
        while (true) {
          const chunk = await reader.read()
          const events = decoder.push(chunk.done ? textDecoder.decode() : textDecoder.decode(chunk.value, { stream: true }))
          for (const event of events) {
            if (event.error) throw new Error(event.error)
            if (event.content) target.content += event.content
            if (event.done) done = true
          }
          if (chunk.done) break
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
      if (!done) throw new Error('连接已中断，回复可能不完整。')
      if (!target.content.trim()) throw new Error('模型返回了空回复，请重试。')
      target.status = 'complete'
      connection.value = 'ready'
    } catch (error) {
      if (controller.signal.aborted) target.status = 'stopped'
      else { target.status = 'error'; target.error = error instanceof Error ? error.message : '发送失败，请重试。' }
    } finally {
      conversation.updatedAt = new Date().toISOString()
      generatingId.value = null
      controller = null
    }
    return target.status === 'complete'
  }

  async function send(content: string) {
    if (!content.trim() || isSending.value) return false
    const conversation = activeConversation.value
    if (!conversation.messages.length) conversation.title = content.trim().slice(0, 36)
    conversation.messages.push({ id: makeId(), role: 'user', content: content.trim(), status: 'complete' })
    return generate(conversation, conversation.messages.length - 1)
  }
  async function retry() {
    const conversation = activeConversation.value
    const index = conversation.messages.findLastIndex(message => message.role === 'user')
    if (index >= 0) return generate(conversation, index)
    return false
  }
  return { conversations, activeId, activeConversation, messages, token, apiBase, model, requiresToken,
    connection, connectionError, generatingId, isSending, checkConnection, newConversation, deleteConversation, send, retry, stop }
})
