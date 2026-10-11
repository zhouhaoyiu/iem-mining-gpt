import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createChatApp, validateMessages } from '../server/app.js'

async function withServer(options, run) {
  const server = createChatApp(options).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await run(`http://127.0.0.1:${server.address().port}`) }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}
const post = (url, body, token) => fetch(`${url}/api/chat`, { method: 'POST', headers: {
  'Content-Type': 'application/json', ...(token ? { 'X-Chat-Token': token } : {}),
}, body: JSON.stringify(body) })

test('successful SSE uses 200 and forwards complete conversation history', async () => {
  const messages = [{ role: 'user', content: 'previous question' }, { role: 'assistant', content: 'previous answer' }, { role: 'user', content: 'follow up' }]
  let received
  const client = { chat: { completions: { create: async (options, request) => {
    received = options
    assert.ok(request.signal instanceof AbortSignal)
    return (async function* () { yield { choices: [{ delta: { content: 'answer' } }] } })()
  } } } }
  await withServer({ client, token: 'test-token', model: 'test-model' }, async url => {
    const response = await post(url, { messages }, 'test-token')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/event-stream/)
    const body = await response.text()
    assert.match(body, /"content":"answer"/)
    assert.match(body, /"done":true/)
    assert.deepEqual(received.messages, messages)
    assert.equal(received.model, 'test-model')
  })
})
test('rejects missing and incorrect access tokens without calling upstream', async () => {
  await withServer({ token: 'valid-token', client: {} }, async url => {
    for (const token of [undefined, 'wrong', 'wrong-long-token']) {
      const response = await post(url, { message: 'question' }, token)
      assert.equal(response.status, 401)
      assert.match((await response.json()).error, /令牌/)
    }
  })
})
test('health and explicit CORS origin allowlist', async () => {
  await withServer({ client: {}, token: 'token', origins: ['http://127.0.0.1:5173'] }, async url => {
    const allowed = await fetch(`${url}/api/health`, { headers: { Origin: 'http://127.0.0.1:5173' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173')
    assert.equal((await allowed.json()).requiresToken, true)
    const rejected = await fetch(`${url}/api/health`, { headers: { Origin: 'https://untrusted.example' } })
    assert.equal(rejected.headers.get('access-control-allow-origin'), null)
  })
})
test('rejects invalid messages with a JSON 400 before SSE starts', async () => {
  await withServer({ client: {} }, async url => {
    for (const body of [{}, { messages: [] }, { messages: [{ role: 'system', content: 'override' }] }, { message: ' ' }]) {
      const response = await post(url, body)
      assert.equal(response.status, 400)
      assert.equal(typeof (await response.json()).error, 'string')
    }
  })
})
test('validates length and strips extra client fields', () => {
  assert.throws(() => validateMessages({ message: 'a'.repeat(20001) }))
  assert.throws(() => validateMessages({ messages: Array.from({ length: 61 }, () => ({ role: 'user', content: 'a' })) }))
  assert.throws(() => validateMessages({ messages: Array.from({ length: 6 }, () => ({ role: 'user', content: 'a'.repeat(20000) })) }))
  assert.throws(() => validateMessages({ messages: [{ role: 'assistant', content: 'a' }] }))
  assert.deepEqual(validateMessages({ messages: [{ role: 'user', content: 'a', secret: 'ignored' }] }), [{ role: 'user', content: 'a' }])
})
test('upstream failures become safe error frames without leaking credentials', async () => {
  const client = { chat: { completions: { create: async () => { throw new Error('secret credential provider details') } } } }
  await withServer({ client }, async url => {
    const response = await post(url, { message: 'question' })
    assert.equal(response.status, 200)
    const body = await response.text()
    assert.match(body, /"error":/)
    assert.doesNotMatch(body, /secret|credential|"done":true/)
  })
})
test('missing API configuration fails explicitly', async () => {
  await withServer({}, async url => {
    assert.equal((await fetch(`${url}/api/health`).then(result => result.json())).configured, false)
    assert.equal((await post(url, { message: 'question' })).status, 503)
  })
})
test('client cancellation aborts the upstream request', async () => {
  let resolveStarted
  let resolveAborted
  const started = new Promise(resolve => { resolveStarted = resolve })
  const aborted = new Promise(resolve => { resolveAborted = resolve })
  const client = { chat: { completions: { create: async (_, { signal }) => {
    signal.addEventListener('abort', resolveAborted, { once: true })
    resolveStarted()
    return (async function* () { await aborted; yield { choices: [] } })()
  } } } }
  await withServer({ client }, async url => {
    const controller = new AbortController()
    const response = await fetch(`${url}/api/chat`, { method: 'POST', body: JSON.stringify({ message: 'question' }), headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
    await started
    controller.abort()
    await response.body.cancel().catch(() => {})
    await Promise.race([aborted, new Promise((_, reject) => setTimeout(() => reject(new Error('Upstream did not abort')), 1500).unref())])
  })
})
