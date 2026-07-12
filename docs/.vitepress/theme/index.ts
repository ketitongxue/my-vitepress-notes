import DefaultTheme from 'vitepress/theme'
import KnowledgeFactoryHome from './components/KnowledgeFactoryHome.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('KnowledgeFactoryHome', KnowledgeFactoryHome)
  },
}
