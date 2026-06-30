// src/stores/chatStore.d.ts
declare module 'stores/chatStore' {
  export function useChatStore(): {
    // 在这里定义 useChatStore 返回对象的类型
    // 例如:
    messages: string[]
    sendMessage: (message: string) => void
  }
}
