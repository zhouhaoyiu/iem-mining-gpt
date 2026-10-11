<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, MessageSquare, Plus, Search, Settings2, Trash2, X, Bot } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { useMediaQuery } from '@vueuse/core'
import BaseHeader from './components/layouts/BaseHeader.vue'
import BaseFooter from './components/layouts/BaseFooter.vue'
import { useChatStore } from './stores/chatStore'

const chat = useChatStore()
const search = ref('')
const sidebarOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 760px)')
const settingsOpen = ref(false)
const tokenDraft = ref('')
const baseDraft = ref('')
const visibleConversations = computed(() => chat.conversations.filter(item => item.title.toLowerCase().includes(search.value.toLowerCase())))
function openSettings() {
  tokenDraft.value = chat.token
  baseDraft.value = chat.apiBase
  settingsOpen.value = true
}
async function saveSettings() {
  if (tokenDraft.value && !/^[\x21-\x7e]+$/.test(tokenDraft.value.trim())) {
    ElMessage.error('访问令牌应使用不含空格的 ASCII 字符。')
    return
  }
  const base = baseDraft.value.trim().replace(/\/$/, '')
  if (base) {
    try {
      const url = new URL(base)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error()
      if (location.protocol === 'https:' && url.protocol !== 'https:') throw new Error()
    } catch { ElMessage.error('请输入有效的 API 服务地址。'); return }
  }
  chat.apiBase = base
  chat.token = tokenDraft.value.trim()
  settingsOpen.value = false
  await chat.checkConnection()
}
function exportChat() {
  const conversation = chat.activeConversation
  const content = '# ' + conversation.title + '\n\n' + conversation.messages.map(message =>
    '## ' + (message.role === 'user' ? '用户' : 'IEM GPT') + '\n\n' + message.content +
    (message.error ? '\n\n> ' + message.error : '')).join('\n\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'IEM-GPT-' + new Date().toISOString().slice(0, 10) + '.md'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function selectConversation(id: string) { chat.activeId = id; sidebarOpen.value = false }
function newChat() { chat.newConversation(); sidebarOpen.value = false }
function removeChat(id: string) {
  if (window.confirm('删除这个对话？')) chat.deleteConversation(id)
}
onMounted(() => { void chat.checkConnection() })
</script>

<template>
  <el-config-provider namespace="ep">
    <div class="workspace">
      <button v-if="sidebarOpen" class="sidebar-backdrop" aria-label="关闭会话列表" @click="sidebarOpen = false" />
      <aside class="sidebar" :class="{ open: sidebarOpen }" :inert="isMobile && !sidebarOpen" @keydown.esc="sidebarOpen = false">
        <div class="brand"><span class="brand-mark"><Bot :size="22" /></span><span>IEM GPT</span>
          <button class="icon-button mobile-only" title="关闭会话列表" aria-label="关闭会话列表" @click="sidebarOpen = false"><X :size="18" /></button>
        </div>
        <button class="new-chat" @click="newChat"><Plus :size="18" /><span>新对话</span></button>
        <label class="conversation-search"><Search :size="15" /><input v-model="search" aria-label="搜索会话" placeholder="搜索会话" /></label>
        <div class="section-label">会话</div>
        <nav class="conversation-list" aria-label="会话列表">
          <div v-for="item in visibleConversations" :key="item.id" class="conversation-row" :class="{ selected: item.id === chat.activeId }">
            <button class="conversation-select" :title="item.title" :aria-current="item.id === chat.activeId ? 'page' : undefined" @click="selectConversation(item.id)">
              <MessageSquare :size="16" /><span>{{ item.title }}</span><span v-if="item.id === chat.generatingId" class="live-dot" />
            </button>
            <button class="icon-button conversation-delete" :title="'删除 ' + item.title" :aria-label="'删除 ' + item.title" @click="removeChat(item.id)"><Trash2 :size="14" /></button>
          </div>
          <p v-if="!visibleConversations.length" class="no-results">没有匹配的会话</p>
        </nav>
        <div class="sidebar-bottom">
          <button class="settings-button" @click="openSettings"><Settings2 :size="18" /><span>连接设置</span></button>
          <div class="sidebar-credit">周浩宇 <span>·</span> IEM</div>
        </div>
      </aside>
      <main class="chat-workspace" :inert="isMobile && sidebarOpen">
        <BaseHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" @settings="openSettings">
          <button class="icon-button" title="导出对话" aria-label="导出对话" :disabled="!chat.messages.length" @click="exportChat"><Download :size="18" /></button>
        </BaseHeader>
        <RouterView />
        <BaseFooter @settings="openSettings" />
      </main>
    </div>
    <el-dialog v-model="settingsOpen" title="连接设置" width="440px" class="connection-dialog" :close-on-click-modal="false" @closed="tokenDraft = ''">
      <form class="connection-form" @submit.prevent="saveSettings">
        <label>API 服务地址<input v-model="baseDraft" placeholder="同源 /api" type="url" autocomplete="off" /></label>
        <label>访问令牌<input v-model="tokenDraft" type="password" autocomplete="off" /></label>
        <div class="settings-status" :class="chat.connection">{{ chat.connection === 'ready' ? '服务已连接' : chat.connectionError || '正在检查连接' }}</div>
        <div class="dialog-actions"><button type="button" class="secondary-button" @click="settingsOpen = false">取消</button><button class="primary-button" type="submit">保存</button></div>
      </form>
    </el-dialog>
  </el-config-provider>
</template>
