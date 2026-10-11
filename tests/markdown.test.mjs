import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
const window = new JSDOM('').window
globalThis.window = window
const { renderMarkdown } = await import('../src/lib/markdown.ts')

test('removes dangerous Markdown links and HTML event handlers', () => {
  const html = renderMarkdown('[click](javascript:alert(1)) <img src=x onerror="alert(1)"><svg onload="alert(1)"></svg><script>alert(1)</script>')
  assert.doesNotMatch(html, /javascript:|onerror|onload|<script|<svg|<img/i)
})
test('blocks remote tracking media while keeping useful Markdown', () => {
  const html = renderMarkdown('![track](https://untrusted.example/pixel)\n\n[reference](https://example.com)\n\n| A | B |\n|---|---|\n| 1 | 2 |')
  assert.doesNotMatch(html, /<img|untrusted/)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.match(html, /<table>/)
})
test('code remains escaped instead of executing HTML', () => {
  const html = renderMarkdown('```html\n<script>alert(1)</script>\n```')
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})
