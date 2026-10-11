import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import '~/styles/index.scss'
import 'uno.css'

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })
createApp(App).use(createPinia()).use(router).mount('#app')
