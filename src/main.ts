import { createApp } from 'vue'
import 'virtual:uno.css'
import './style.css'
import './theme.css'
import App from './App.vue'
import brandLogoUrl from './assets/Logo.png?url'

const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = brandLogoUrl
document.head.append(favicon)

createApp(App).mount('#app')
