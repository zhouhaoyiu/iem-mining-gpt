import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const chatHistory = ref([
    { role: 'system', content: '欢迎使用NEU GPT，请输入您的问题。' },
  ])

  function addMessage(role: string, content: string): void {
    chatHistory.value.push({ role, content })
  }

  return { chatHistory, addMessage }
})
