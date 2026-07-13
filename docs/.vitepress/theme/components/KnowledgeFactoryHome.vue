<script setup>
import FactoryBoot from './FactoryBoot.vue'
import { ref } from 'vue'

const homeEntering = ref(false)

function handleReveal() {
  homeEntering.value = true
}

const modules = [
  { id: 'KB-01', systemLabel: 'AI ARCHIVE', title: 'AI 知识库', description: 'AI 编程、智能体工程、产品实践与工具工作流。', action: '浏览 AI 知识', href: '/wiki/' },
  { id: 'KB-02', systemLabel: 'FINANCE ARCHIVE', title: '金融知识库', description: '投资者、量化研究、市场结构与风险概念。', action: '浏览金融知识', href: '/finance/' },
  { id: 'QA-01', systemLabel: 'ASK CONSOLE', title: '知识库问答', description: '基于公开 AI 知识库检索并生成带来源引用的回答。', action: '向知识库提问', href: '/ask/', featured: true },
  { id: 'TOOL-01', systemLabel: 'FACTORY TOOLING', title: 'LLM Wiki Skill', description: '了解知识库原理、构建过程、安装方法与公开版本。', action: '查看构建工具', href: '/llm-wiki/' },
]
const logs = [
  { title: 'LLM Wiki Skill 公开指南', url: '/llm-wiki/', date: '2026-07-12' },
  { title: 'AI 知识库', url: '/wiki/', date: '2026-07-12' },
  { title: '金融知识库', url: '/finance/', date: '2026-07-08' },
]
</script>

<template>
  <FactoryBoot @reveal="handleReveal" />
  <main :class="['factory-home', { 'is-entering': homeEntering }]">
    <nav class="factory-status" aria-label="知识工厂快捷导航">
      <a class="factory-status__brand" href="/">AI 纪元</a>
      <span class="factory-status__system">PERSONAL KNOWLEDGE FACTORY</span>
      <span class="factory-status__state"><i aria-hidden="true" />SYSTEM ONLINE</span>
      <span class="factory-status__links"><a href="/wiki/">知识库</a><a href="/ask/">问答</a><a href="/about">关于</a></span>
    </nav>

    <section class="factory-hero" aria-labelledby="factory-title">
      <p class="factory-label">PERSONAL KNOWLEDGE FACTORY</p>
      <h1 id="factory-title" tabindex="-1">个人知识工厂</h1>
      <p class="factory-hero__hello">你好，这里是 AI 纪元。</p>
      <p>这里持续整理 AI、产品、工程与金融研究中值得长期保留的知识。</p>
      <div class="factory-actions"><a class="primary" href="/ask/">向知识库提问</a><a href="#knowledge-modules">浏览知识模块</a></div>
    </section>

    <section id="knowledge-modules" class="factory-modules" aria-labelledby="modules-title">
      <header><p class="factory-label">KNOWLEDGE MODULES</p><h2 id="modules-title">知识模块</h2></header>
      <div class="factory-modules__grid">
        <article v-for="module in modules" :key="module.id" :class="['factory-module', { 'is-featured': module.featured }]">
          <p><span>{{ module.id }}</span><span>{{ module.systemLabel }}</span></p><h3>{{ module.title }}</h3><p>{{ module.description }}</p>
          <a :href="module.href">{{ module.action }} <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>

    <section class="factory-lower">
      <div class="factory-log"><p class="factory-label">RECENT LOG</p><h2>最近更新</h2><ol><li v-for="item in logs" :key="item.url"><a :href="item.url">{{ item.title }}</a><time :datetime="item.date">{{ item.date }}</time></li></ol></div>
      <aside class="factory-notes"><p class="factory-label">FACTORY NOTES</p><h2>知识如何流动</h2><p>长期来源经过整理与互链成为公开知识，再由检索问答和 LLM Wiki Skill 支持持续复用。</p><a href="/about">了解 AI 纪元 <span aria-hidden="true">→</span></a></aside>
    </section>
  </main>
</template>
