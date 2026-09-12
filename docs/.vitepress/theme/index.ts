import DefaultTheme from 'vitepress/theme'
import KnowledgeFactoryHome from './components/KnowledgeFactoryHome.vue'
import HomeAdmin from './components/HomeAdmin.vue'
import PersonalOsAdmin from './components/PersonalOsAdmin.vue'
import PrivateMarkdownAdmin from './components/PrivateMarkdownAdmin.vue'
import ReadingInsight from './components/reading/ReadingInsight.vue'
import ReadingSteps from './components/reading/ReadingSteps.vue'
import ReadingComparison from './components/reading/ReadingComparison.vue'
import ReadingCode from './components/reading/ReadingCode.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('KnowledgeFactoryHome', KnowledgeFactoryHome)
    app.component('HomeAdmin', HomeAdmin)
    app.component('PersonalOsAdmin', PersonalOsAdmin)
    app.component('PrivateMarkdownAdmin', PrivateMarkdownAdmin)
    app.component('ReadingInsight', ReadingInsight)
    app.component('ReadingSteps', ReadingSteps)
    app.component('ReadingComparison', ReadingComparison)
    app.component('ReadingCode', ReadingCode)
  },
}
