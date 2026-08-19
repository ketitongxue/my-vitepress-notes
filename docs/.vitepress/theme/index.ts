import DefaultTheme from 'vitepress/theme'
import KnowledgeFactoryHome from './components/KnowledgeFactoryHome.vue'
import HomeAdmin from './components/HomeAdmin.vue'
import PersonalOsAdmin from './components/PersonalOsAdmin.vue'
import PrivateMarkdownAdmin from './components/PrivateMarkdownAdmin.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('KnowledgeFactoryHome', KnowledgeFactoryHome)
    app.component('HomeAdmin', HomeAdmin)
    app.component('PersonalOsAdmin', PersonalOsAdmin)
    app.component('PrivateMarkdownAdmin', PrivateMarkdownAdmin)
  },
}
