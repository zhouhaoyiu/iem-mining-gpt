<script setup lang="ts">
import { ArrowUp, Square } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../../stores/chatStore'
defineEmits<{ settings: [] }>()
const chat = useChatStore()
const drafts = ref<Record<string, string>>({})
const input = computed({ get: () => drafts.value[chat.activeId] || '', set: value => { drafts.value[chat.activeId] = value } })
const inputElement = ref<HTMLTextAreaElement | null>(null)
const tokenMissing = computed(() => chat.requiresToken && !chat.token)
function resize() {
  if (!inputElement.value) return
  inputElement.value.style.height = 'auto'
  inputElement.value.style.height = Math.min(inputElement.value.scrollHeight, 180) + 'px'
}
watch(input, resize, { flush: 'post' })
watch(() => chat.activeId, () => { resize(); inputElement.value?.focus() }, { flush: 'post' })
async function handleSend() {
  if (!input.value.trim() || chat.isSending || tokenMissing.value) return
  const id = chat.activeId
  const text = input.value
  input.value = ''
  const success = await chat.send(text)
  if (!success && !drafts.value[id]) drafts.value[id] = text
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    void handleSend()
  }
}
</script>
<template>
  <footer class="composer-region">
    <div v-if="chat.connection === 'offline'" class="connection-notice" role="status">
      <span>{{ chat.connectionError || '无法连接聊天服务。' }}</span><button @click="$emit('settings')">连接设置</button>
    </div>
    <div v-else-if="tokenMissing" class="connection-notice" role="status"><span>需要访问令牌</span><button @click="$emit('settings')">连接设置</button></div>
    <form class="composer" @submit.prevent="handleSend">
      <textarea ref="inputElement" v-model="input" aria-label="消息" placeholder="输入消息…" rows="2" :disabled="chat.isSending" maxlength="20000" @keydown="onKeydown" />
      <div class="composer-toolbar">
        <span class="composer-state">{{ chat.isSending ? '正在生成' : 'IEM GPT' }}</span>
        <button v-if="chat.isSending" class="send-button stop-button" type="button" title="停止生成" aria-label="停止生成" @click="chat.stop"><Square :size="17" /></button>
        <button v-else class="send-button" type="submit" title="发送消息" aria-label="发送消息" :disabled="!input.trim() || tokenMissing"><ArrowUp :size="20" /></button>
      </div>
    </form>
  </footer>
</template>
