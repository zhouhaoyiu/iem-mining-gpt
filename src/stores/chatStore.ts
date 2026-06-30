import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const chatHistory = ref([
    { role: 'system', content: '欢迎使用IEM GPT，请输入您的问题。' },
  ])

  function addMessage(role: string, content: string): void {
    chatHistory.value.push({ role, content })
  }

  function updateLastMessage(role: string, content: string): void {
    const lastMessage = chatHistory.value[chatHistory.value.length - 1]
    if (lastMessage && lastMessage.role === role) {
      lastMessage.content = content
    } else {
      addMessage(role, content)
    }
  }

  return { chatHistory, addMessage, updateLastMessage }
})
