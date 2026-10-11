import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chatStore.ts'
const originalFetch = globalThis.fetch
beforeEach(() => { setActivePinia(createPinia()) })
afterEach(() => { globalThis.fetch = originalFetch })
const reply = (content, done = true) => new Response(`data: ${JSON.stringify({ content })}\n\n${done ? 'data: {"done":true}\n\n' : ''}`, { headers: { 'Content-Type': 'text/event-stream' } })

test('sends the token and full multi-turn context', async () => {
  const requests = []
  globalThis.fetch = async (_, options) => { requests.push(options); return reply('answer') }
  const store = useChatStore()
  store.token = 'test-token'
  assert.equal(await store.send('question one'), true)
  assert.equal(await store.send('followup'), true)
  assert.equal(requests[1].headers['X-Chat-Token'], 'test-token')
  assert.deepEqual(JSON.parse(requests[1].body).messages, [{ role: 'user', content: 'question one' }, { role: 'assistant', content: 'answer' }, { role: 'user', content: 'followup' }])
})
test('HTTP failures stay visible and retry does not duplicate user messages', async () => {
  globalThis.fetch = async () => new Response('{"error":"invalid token"}', { status: 401 })
  const store = useChatStore()
  assert.equal(await store.send('question'), false)
  assert.equal(store.messages.at(-1).status, 'error')
  assert.equal(store.messages.at(-1).error, 'invalid token')
  globalThis.fetch = async () => reply('retry answer')
  assert.equal(await store.retry(), true)
  assert.equal(store.messages.length, 2)
  assert.equal(store.messages.at(-1).content, 'retry answer')
})
test('upstream SSE errors retain the partial answer', async () => {
  globalThis.fetch = async () => new Response('data: {"content":"partial"}\n\ndata: {"error":"upstream failed"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
  const store = useChatStore()
  assert.equal(await store.send('question'), false)
  assert.equal(store.messages.at(-1).content, 'partial')
  assert.equal(store.messages.at(-1).error, 'upstream failed')
})
test('a truncated connection cannot appear as a complete response', async () => {
  globalThis.fetch = async () => reply('partial', false)
  const store = useChatStore()
  assert.equal(await store.send('question'), false)
  assert.equal(store.messages.at(-1).status, 'error')
})
test('UTF-8 characters and SSE frames survive byte-by-byte transport', async () => {
  const bytes = new TextEncoder().encode('data: {"content":"中文回复"}\n\ndata: {"done":true}\n\n')
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close() } }), { headers: { 'Content-Type': 'text/event-stream' } })
  const store = useChatStore()
  assert.equal(await store.send('question'), true)
  assert.equal(store.messages.at(-1).content, '中文回复')
})
test('switching conversations during generation does not mix replies', async () => {
  let streamController
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { streamController = controller } }), { headers: { 'Content-Type': 'text/event-stream' } })
  const store = useChatStore()
  const original = store.activeConversation
  const pending = store.send('old conversation')
  store.newConversation()
  streamController.enqueue(new TextEncoder().encode('data: {"content":"old reply"}\n\ndata: {"done":true}\n\n'))
  streamController.close()
  assert.equal(await pending, true)
  assert.equal(store.messages.length, 0)
  assert.equal(original.messages.at(-1).content, 'old reply')
})
test('stop cancels the request and concurrent sends are rejected', async () => {
  globalThis.fetch = async (_, options) => new Response(new ReadableStream({ start(controller) {
    options.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true })
  } }), { headers: { 'Content-Type': 'text/event-stream' } })
  const store = useChatStore()
  const pending = store.send('question')
  assert.equal(await store.send('duplicate'), false)
  store.stop()
  assert.equal(await pending, false)
  assert.equal(store.messages.at(-1).status, 'stopped')
  assert.equal(store.isSending, false)
})
test('removing the last conversation always leaves a usable blank conversation', () => {
  const store = useChatStore()
  store.deleteConversation(store.activeId)
  assert.equal(store.conversations.length, 1)
  assert.equal(store.messages.length, 0)
})
