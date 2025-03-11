import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const chatHistory = ref([
    { role: 'system', content: '欢迎使用东大智能采矿GPT，请输入您的问题。' },
  ])

  function addMessage(role: string, content: string) {
    chatHistory.value.push({ role, content })
  }

  return { chatHistory, addMessage }
})
