import Previewer from 'element-plus';
import { createPinia } from 'pinia';
// import "~/styles/element/index.scss";
// import ElementPlus from "element-plus";
// import all element css, uncommented next line
// import "element-plus/dist/index.css";
// or use cdn, uncomment cdn link in `index.html`
import { ViteSSG } from 'vite-ssg';
import { routes } from 'vue-router/auto-routes';
import App from './App.vue';
import '~/styles/index.scss';
import 'uno.css';
// If you want to use ElMessage, import it.
import 'element-plus/theme-chalk/src/message.scss';
import 'element-plus/theme-chalk/src/message-box.scss';
export const createApp = ViteSSG(App, {
    routes,
    base: import.meta.env.BASE_URL,
}, (ctx) => {
    Object.values(import.meta.glob('./modules/*.ts', { eager: true }))
        .forEach(i => i.install?.(ctx));
    const pinia = createPinia();
    ctx.app.use(pinia);
    ctx.app.use(Previewer);
});
//# sourceMappingURL=main.js.map