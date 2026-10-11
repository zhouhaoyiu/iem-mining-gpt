import DOMPurify from 'dompurify'
import { marked } from 'marked'

export function renderMarkdown(content: string): string {
  const html = marked.parse(content, { breaks: true, gfm: true, async: false })
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'video', 'audio'],
    FORBID_ATTR: ['style'],
  })
}
