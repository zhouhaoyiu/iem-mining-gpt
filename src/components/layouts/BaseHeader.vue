<script setup lang="ts">
import { PanelLeft, Settings2 } from '@lucide/vue'
import { useChatStore } from '../../stores/chatStore'
defineEmits<{ 'toggle-sidebar': []; settings: [] }>()
const chat = useChatStore()
</script>
<template>
  <header class="chat-header">
    <button class="icon-button mobile-only" title="会话列表" aria-label="会话列表" @click="$emit('toggle-sidebar')"><PanelLeft :size="20" /></button>
    <div class="header-title"><span>{{ chat.activeConversation.title }}</span><span class="header-model">{{ chat.model || 'IEM GPT' }}</span></div>
    <div class="header-actions">
      <button class="connection-badge" :class="chat.connection" :title="chat.connectionError || chat.model" @click="$emit('settings')">
        <span class="status-dot" />{{ chat.connection === 'ready' ? '已连接' : chat.connection === 'checking' ? '连接中' : '未连接' }}
      </button>
      <slot />
      <button class="icon-button" title="连接设置" aria-label="连接设置" @click="$emit('settings')"><Settings2 :size="18" /></button>
    </div>
  </header>
</template>
