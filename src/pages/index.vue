<script setup lang="ts">
import { Bot, Check, ChevronDown, Copy, RotateCcw, User } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '~/stores/chatStore'
import { renderMarkdown } from '~/lib/markdown'
const chat = useChatStore()
const scroller = ref<HTMLElement | null>(null)
const atBottom = ref(true)
const copied = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
const lastId = computed(() => chat.messages.at(-1)?.id)
function scrollBottom(smooth = false) {
  const element = scroller.value
  if (element) element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}
function onScroll() {
  const element = scroller.value
  if (element) atBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight < 80
}
watch(() => chat.messages.map(message => message.content + message.status).join(''), async () => {
  if (atBottom.value) { await nextTick(); scrollBottom() }
})
watch(() => chat.activeId, async () => { atBottom.value = true; await nextTick(); scrollBottom() })
async function copyMessage(id: string, content: string) {
  try {
    await navigator.clipboard.writeText(content)
    copied.value = id
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { ElMessage.error('复制失败，请检查浏览器剪贴板权限。') }
}
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>
<template>
  <section ref="scroller" class="message-scroller" aria-label="聊天消息" @scroll="onScroll">
    <div v-if="!chat.messages.length" class="empty-chat"><span class="empty-mark"><Bot :size="38" /></span><h1>IEM GPT</h1></div>
    <div v-else class="message-thread">
      <article v-for="message in chat.messages" :key="message.id" class="message" :class="message.role" :data-status="message.status">
        <div class="message-avatar"><Bot v-if="message.role === 'assistant'" :size="18" /><User v-else :size="17" /></div>
        <div class="message-body">
          <div class="message-author">{{ message.role === 'assistant' ? 'IEM GPT' : '你' }}<span v-if="message.status === 'streaming'" class="generating-label">生成中</span></div>
          <div v-if="message.role === 'assistant'" class="markdown" v-html="renderMarkdown(message.content)" />
          <div v-else class="user-content">{{ message.content }}</div>
          <span v-if="message.status === 'streaming' && !message.content" class="thinking-indicator"><span /><span /><span /></span>
          <div v-if="message.status === 'error'" class="message-error" role="alert">{{ message.error }}</div>
          <div v-if="message.status === 'stopped'" class="message-stopped">已停止生成</div>
          <div class="message-actions">
            <button v-if="message.content" class="icon-button" :title="copied === message.id ? '已复制' : '复制消息'" :aria-label="copied === message.id ? '已复制' : '复制消息'" @click="copyMessage(message.id, message.content)"><Check v-if="copied === message.id" :size="15" /><Copy v-else :size="15" /></button>
            <button v-if="message.role === 'assistant' && message.id === lastId && !chat.isSending" class="icon-button" title="重新生成" aria-label="重新生成" @click="chat.retry"><RotateCcw :size="15" /></button>
          </div>
        </div>
      </article>
    </div>
    <button v-if="!atBottom && chat.messages.length" class="scroll-bottom icon-button" title="跳到最新消息" aria-label="跳到最新消息" @click="scrollBottom(true)"><ChevronDown :size="18" /></button>
  </section>
</template>
