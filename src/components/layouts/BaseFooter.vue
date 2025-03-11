<script lang="ts" setup>
import axios from 'axios'
import { ref } from 'vue'
import { useChatStore } from '~/stores/chatStore'

const inputMessage = ref('')
const chatStore = useChatStore()
const isSending = ref(false)

async function handleSend() {
  if (inputMessage.value.trim() === '')
    return

  const messageToSend = inputMessage.value
  chatStore.addMessage('user', messageToSend)

  isSending.value = true

  try {
    const response = await axios.post('/api/chat', { message: messageToSend })
    chatStore.addMessage('assistant', response.data.reply)
  }
  catch (error) {
    console.error('Error sending message:', error)
  }
  finally {
    isSending.value = false
  }

  inputMessage.value = ''
}
</script>

<template>
  <div class="footer">
    <div class="footer-content">
      <div class="input-area">
        <el-input
          v-model="inputMessage"
          placeholder="请输入您的问题..."
          type="textarea"
          :rows="2"
          :disabled="isSending"
          @keyup.enter.ctrl="handleSend"
        />
        <el-button type="primary" :disabled="!inputMessage.trim() || isSending" @click="handleSend">
          发送
        </el-button>
      </div>
      <span class="title">
        created by zhy
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.footer {
  background-color: var(--router-view-bg-color);
  height: 5rem;
  padding: 0 1rem;

  .footer-content {
    max-width: 800px;
    height: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .input-area {
    display: flex;
    gap: 1rem;
    width: 100%;
    margin-bottom: 0.5rem;
    justify-content: center;
    align-items: center;

    .el-textarea {
      flex: 1;
    }

    .el-button {
      align-self: flex-end;
    }
  }

  .title {
    font-size: 1rem;
    color: var(--ep-text-color-secondary);
  }
}
</style>
