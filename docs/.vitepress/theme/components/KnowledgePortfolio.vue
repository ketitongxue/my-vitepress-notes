<script setup>
import { knowledgeSections } from './personalOsContent.mjs'
</script>

<template>
  <main class="knowledge-portfolio" aria-labelledby="knowledge-portfolio-title">
    <section
      v-for="section in knowledgeSections"
      :key="section.id"
      class="knowledge-portfolio__section"
      :class="`knowledge-portfolio__section--${section.id}`"
      :data-knowledge-section="section.id"
      :aria-labelledby="section.id === 'intro' ? 'knowledge-portfolio-title' : `knowledge-${section.id}-title`"
    >
      <header class="knowledge-portfolio__header">
        <p class="knowledge-portfolio__eyebrow">{{ section.label }}</p>
        <template v-if="section.id === 'intro'">
          <h1 id="knowledge-portfolio-title">JuZX / AI 纪元</h1>
          <p class="knowledge-portfolio__intro-title">{{ section.title }}</p>
        </template>
        <template v-else>
          <h2 :id="`knowledge-${section.id}-title`">{{ section.title }}</h2>
        </template>
        <p class="knowledge-portfolio__summary">{{ section.summary }}</p>
      </header>

      <article v-if="section.id === 'intro'" class="knowledge-portfolio__introduction">
        <p>这里连接工业数字化经验、持续学习和可复用的知识工程实践。</p>
      </article>

      <article
        class="knowledge-portfolio__feature"
        v-else-if="section.id === 'llm-wiki' || section.id === 'finance'"
      >
        <p v-if="section.id === 'llm-wiki'">围绕 AI、Agent 与知识工程，建立可检索、可连接、可持续更新的知识网络。</p>
        <p v-else>沉淀金融、量化研究与市场结构笔记，让概念、人物和策略形成清晰关联。</p>
        <a v-if="section.id === 'llm-wiki'" href="/wiki/">进入 LLM Wiki →</a>
        <a v-else href="/finance/">进入 Finance Wiki →</a>
      </article>

      <article class="knowledge-portfolio__callout" v-else-if="section.id === 'qa'">
        <p>先检索已发布知识，再基于相关材料回答；回答范围受知识库内容约束。</p>
        <a href="/ask/">开始知识问答 →</a>
      </article>

      <article class="knowledge-portfolio__method" v-else-if="section.id === 'skill'">
        <p>llm-wiki Skill 将知识库维护固化为可复用流程：</p>
        <ol class="knowledge-portfolio__workflow">
          <li>来源接收与分流</li>
          <li>结构化摄取</li>
          <li>验证与链接检查</li>
          <li>发布与更新</li>
        </ol>
        <nav class="knowledge-portfolio__guide-links" aria-label="llm-wiki 方法资料">
          <a href="/llm-wiki/">方法概览</a>
          <a href="/llm-wiki/principles">设计原理</a>
          <a href="/llm-wiki/build">构建过程</a>
          <a href="https://github.com/ketitongxue/llm-wiki-skill">GitHub 仓库</a>
        </nav>
      </article>

    </section>
  </main>
</template>
