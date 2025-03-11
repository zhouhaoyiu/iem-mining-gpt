<script setup>
import { Delete as deleteIcon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '~/stores/chatStore'

const chatStore = useChatStore()

function clearChat() {
  chatStore.chatHistory = [{ role: 'system', content: '欢迎使用东大智能采矿GPT，请输入您的问题。' }]
  ElMessage.success('对话已成功清空')
}
</script>

<template>
  <div class="chat-container">
    <div class="chat-messages">
      <div
        v-for="(message, index) in chatStore.chatHistory" :key="index"
        class="message" :class="[message.role]"
      >
        {{ message.content }}
      </div>
    </div>
    <div class="clear-chat-button" @click="clearChat">
      <el-icon><delete-icon /></el-icon>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--ep-bg-color);
  border-radius: 8px;
}

.message {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  max-width: 80%;
  text-align: left;
}

.message.system {
  background-color: #f2f2f2;
  align-self: center;
  color: #666;
}

.message.user {
  background-color: #e1f3ff;
  align-self: flex-end;
}

.message.assistant {
  background-color: #f0f9eb;
  align-self: flex-start;
}

.clear-chat-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  background-color: #ccc;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.clear-chat-button:hover {
  background-color: #bbb;
}
</style>
