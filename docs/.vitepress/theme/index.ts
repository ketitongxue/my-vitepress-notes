import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent, h } from 'vue'
import CrispChat from './components/CrispChat.vue'
import { installCrispRouteGuard, isCrispConfigured } from './components/crispChatClient.mjs'
import { crispConfig } from './crispConfig.mjs'
import './custom.css'
import '../../public/assets/reading-components.css'

const KnowledgeFactoryHome = defineAsyncComponent(() => import('./components/KnowledgeFactoryHome.vue'))
const HomeAdmin = defineAsyncComponent(() => import('./components/HomeAdmin.vue'))
const PersonalOsAdmin = defineAsyncComponent(() => import('./components/PersonalOsAdmin.vue'))
const PrivateMarkdownAdmin = defineAsyncComponent(() => import('./components/PrivateMarkdownAdmin.vue'))
const ReadingInsight = defineAsyncComponent(() => import('./components/reading/ReadingInsight.vue'))
const ReadingSteps = defineAsyncComponent(() => import('./components/reading/ReadingSteps.vue'))
const ReadingComparison = defineAsyncComponent(() => import('./components/reading/ReadingComparison.vue'))
const ReadingCode = defineAsyncComponent(() => import('./components/reading/ReadingCode.vue'))

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(CrispChat) })
  },
  enhanceApp({ app, router }) {
    if (typeof window !== 'undefined' && isCrispConfigured(crispConfig)) {
      installCrispRouteGuard(router, window)
    }
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
