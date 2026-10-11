export interface ChatEvent { content?: string; error?: string; done?: boolean }

export class SSEDecoder {
  private buffer = ''

  push(text: string): ChatEvent[] {
    this.buffer += text
    const events: ChatEvent[] = []
    let boundary: RegExpExecArray | null
    while ((boundary = /\r?\n\r?\n/.exec(this.buffer))) {
      const frame = this.buffer.slice(0, boundary.index)
      this.buffer = this.buffer.slice(boundary.index + boundary[0].length)
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, '')).join('\n')
      if (!data) continue
      if (data === '[DONE]') events.push({ done: true })
      else {
        const event: unknown = JSON.parse(data)
        if (!event || typeof event !== 'object') throw new Error('流式响应格式无效。')
        const value = event as ChatEvent
        if ((value.content !== undefined && typeof value.content !== 'string') ||
          (value.error !== undefined && typeof value.error !== 'string') ||
          (value.done !== undefined && typeof value.done !== 'boolean'))
          throw new Error('流式响应格式无效。')
        events.push(value)
      }
    }
    return events
  }
}
