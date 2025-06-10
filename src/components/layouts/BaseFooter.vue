<script lang="ts" setup>
import { Position } from '@element-plus/icons-vue'
import axios from 'axios'
import { ref } from 'vue'
import { useChatStore } from '../../stores/chatStore'

const inputMessage = ref('')
const chatStore = useChatStore()
const isSending = ref(false)

async function handleSend() {
  if (inputMessage.value.trim() === '')
    return

  const messageToSend = inputMessage.value
  chatStore.addMessage('user', messageToSend)
  chatStore.addMessage('assistant', '')

  isSending.value = true
  let assistantMessage = ''
  let lastProcessedLength = 0

  try {
    await axios.post('/api/chat', { message: messageToSend }, {
      responseType: 'text',
      onDownloadProgress: (progressEvent) => {
        const chunk = progressEvent.event.target?.response
        if (!chunk)
          return

        // 只处理新增的内容
        const newContent = chunk.slice(lastProcessedLength)
        lastProcessedLength = chunk.length

        const lines = newContent.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                assistantMessage += data.content
                chatStore.updateLastMessage('assistant', assistantMessage)
              }
            }
            catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      },
    })
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
          placeholder="输入消息，Enter 发送，Shift + Enter 换行"
          type="textarea"
          :rows="4"
          :disabled="isSending"
          resize="none"
          class="chat-input"
          @keyup.enter="handleSend"
          @keydown.shift.enter.prevent="inputMessage += '\n'"
        />
        <div class="button-wrapper">
          <el-button
            type="primary"
            :disabled="!inputMessage.trim() || isSending"
            :loading="isSending"
            class="send-button"
            @click="handleSend"
          >
            <el-icon v-if="!isSending">
              <Position />
            </el-icon>
            <span v-else>思考中...</span>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.footer {
  background-color: var(--ep-bg-color);
  padding: 1rem;
  border-top: 1px solid var(--ep-border-color-light);
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  background-color: var(--ep-bg-color);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--ep-border-color-light);

  .chat-input {
    width: 100%;

    :deep(.el-textarea__inner) {
      background-color: var(--ep-bg-color);
      border: none;
      color: var(--ep-text-color-primary);
      transition: all 0.3s ease;
      font-size: 0.9rem;
      line-height: 1.3;
      padding: 0.6rem;
      resize: none;
      box-shadow: none;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--ep-border-color) transparent;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background-color: var(--ep-border-color);
        border-radius: 3px;

        &:hover {
          background-color: var(--ep-border-color-darker);
        }
      }

      &:focus {
        box-shadow: none;
      }

      &:disabled {
        background-color: var(--ep-bg-color);
        cursor: not-allowed;
      }
    }
  }

  .button-wrapper {
    display: flex;
    justify-content: flex-end;
    padding: 0 0.5rem;
  }

  .send-button {
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    background-color: var(--ep-color-primary);
    border: none;
    font-size: 0.9rem;

    &:not(:disabled):hover {
      background-color: var(--ep-color-primary-dark-2);
      transform: translateY(-1px);
    }

    &.is-loading {
      background-color: var(--ep-color-primary-light-5);
    }
  }
}
</style>
