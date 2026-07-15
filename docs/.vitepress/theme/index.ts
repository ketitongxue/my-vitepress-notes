import DefaultTheme from 'vitepress/theme'
import KnowledgeFactoryHome from './components/KnowledgeFactoryHome.vue'
import PersonalOsAdmin from './components/PersonalOsAdmin.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('KnowledgeFactoryHome', KnowledgeFactoryHome)
    app.component('PersonalOsAdmin', PersonalOsAdmin)
  },
}
