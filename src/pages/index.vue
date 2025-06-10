<script setup>
import { Delete as deleteIcon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import { ref, watch } from 'vue'
import { useChatStore } from '~/stores/chatStore'

const chatStore = useChatStore()
const lastMessageRef = ref(null)

// 配置 marked 选项
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true, // 支持 GitHub 风格的 Markdown
  headerIds: false, // 禁用标题 ID
  mangle: false, // 禁用标题 ID 混淆
})

// 监听新消息，自动滚动到底部
watch(() => chatStore.chatHistory.length, () => {
  setTimeout(() => {
    if (lastMessageRef.value) {
      lastMessageRef.value.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
})

function clearChat() {
  chatStore.chatHistory = [{ role: 'system', content: '欢迎使用工力所GPT，请输入您的问题。' }]
  ElMessage.success('对话已成功清空')
}

// 自定义渲染器
const renderer = new marked.Renderer()
renderer.code = (code, language) => {
  return `<pre class="code-block"><code class="language-${language}">${code}</code></pre>`
}
marked.use({ renderer })
</script>

<template>
  <div class="chat-container">
    <div class="chat-messages">
      <div
        v-for="(message, index) in chatStore.chatHistory"
        :key="index"
        :ref="index === chatStore.chatHistory.length - 1 ? lastMessageRef : null"
        class="message"
        :class="[message.role]"
      >
        <div v-if="message.role === 'assistant'" class="message-content" v-html="marked(message.content)" />
        <div v-else class="message-content">
          {{ message.content }}
        </div>
      </div>
    </div>
    <el-tooltip content="清空对话" placement="top" :show-after="500">
      <el-button
        type="danger"
        :icon="deleteIcon"
        circle
        class="clear-button"
        @click="clearChat"
      />
    </el-tooltip>
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
  background-color: var(--ep-bg-color);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
}

.message {
  max-width: 65%;
  transition: all 0.3s ease;
  animation: messageAppear 0.3s ease;
}

.message-content {
  /* line-height: 1.3; */
  word-wrap: break-word;
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
  text-align: left;
}

.message.user {
  align-self: flex-end;

  .message-content {
    background-color: var(--ep-color-primary);
    color: white;
    text-align: left;
  }
}

.message.assistant .message-content {
  background-color: var(--ep-fill-color-darker);
  color: var(--ep-text-color-primary);
  line-height: 1.3;
  text-align: left;
}

.message.system {
  align-self: center;
  color: var(--ep-text-color-secondary);
  font-size: 0.85em;
  background-color: transparent;
  text-align: center;
  padding: 0.4rem 0;
}

.message-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 0.6rem;
  margin: 0.4rem 0;
  overflow-x: auto;
}

.message-content :deep(code) {
  font-family: 'Fira Code', monospace;
  font-size: 0.85em;
}

.message-content :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 1rem 0;
  padding-left: 1.2rem;
}

.message-content :deep(li) {
  margin: 0.5rem 0;
}

.message-content :deep(blockquote) {
  border-left: 3px solid var(--ep-color-primary);
  margin: 0.3rem 0;
  padding: 0.2rem 0 0.2rem 0.8rem;
  color: var(--ep-text-color-secondary);
  background-color: var(--ep-fill-color-light);
}

@keyframes messageAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clear-button {
  position: fixed;
  bottom: 14rem;
  right: 1rem;
  opacity: 0.9;
  transition: all 0.3s ease;
  background-color: var(--ep-color-danger);
  border: none;
  color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    opacity: 1;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

:deep(.el-tooltip__trigger) {
  outline: none;
}
</style>
