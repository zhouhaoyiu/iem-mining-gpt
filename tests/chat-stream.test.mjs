import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SSEDecoder } from '../src/lib/chat-stream.ts'

test('retains an SSE event split at every possible character boundary', () => {
  const frame = 'data: {"content":"中文分段回复"}\n\n'
  for (let index = 1; index < frame.length; index++) {
    const decoder = new SSEDecoder()
    assert.deepEqual([...decoder.push(frame.slice(0, index)), ...decoder.push(frame.slice(index))], [{ content: '中文分段回复' }])
  }
})
test('accepts CRLF, heartbeats, multiple events and done markers', () => {
  const decoder = new SSEDecoder()
  assert.deepEqual(decoder.push(': keepalive\r\n\r\ndata: {"content":"A"}\r\n\r\ndata: {"done":true}\r\n\r\n'), [{ content: 'A' }, { done: true }])
  assert.deepEqual(decoder.push('data: [DONE]\n\n'), [{ done: true }])
})
test('preserves upstream errors', () => {
  assert.deepEqual(new SSEDecoder().push('data: {"error":"失败"}\n\n'), [{ error: '失败' }])
})
test('rejects malformed or wrongly typed complete frames', () => {
  for (const value of ['null', '{"content":1}', '{"done":"yes"}', '{broken}'])
    assert.throws(() => new SSEDecoder().push(`data: ${value}\n\n`))
})
