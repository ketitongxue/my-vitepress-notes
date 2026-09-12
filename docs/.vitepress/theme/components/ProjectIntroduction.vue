<script setup>
import { defineAsyncComponent, h, nextTick, ref, shallowRef } from 'vue'
import { IconTerminal2 } from '@tabler/icons-vue'

defineProps({
  summary: { type: String, default: '' },
  linkLabel: { type: String, default: '查看 go-tiny-claw 项目介绍' },
})

const isOpen = ref(false)
const openButton = ref(null)
const readerHeading = ref(null)
const article = shallowRef(null)

async function openIntroduction() {
  // A fresh wrapper lets returning to the summary and opening again retry a
  // failed download. The Markdown module itself is cached after a successful load.
  article.value = defineAsyncComponent({
    loader: () => import('../../../projects/go-tiny-claw.md'),
    loadingComponent: {
      render: () => h('p', { role: 'status' }, '正在加载项目介绍…'),
    },
    errorComponent: {
      render: () => h('p', { role: 'alert' }, '项目介绍暂时无法加载，请返回摘要后重试。'),
    },
    delay: 150,
    timeout: 15000,
  })
  isOpen.value = true
  await nextTick()
  readerHeading.value?.focus({ preventScroll: true })
}

async function returnToSummary() {
  isOpen.value = false
  await nextTick()
  openButton.value?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="project-introduction">
    <div v-show="!isOpen" class="project-introduction__summary">
      <article class="project-card" aria-label="go-tiny-claw 项目">
        <div class="project-card__heading">
          <span class="project-card__icon" aria-hidden="true"><IconTerminal2 :size="26" :stroke="1.6" /></span>
          <div>
            <p class="project-card__eyebrow">个人项目 · 01</p>
            <h2>go-tiny-claw</h2>
          </div>
        </div>
        <p class="project-card__description">{{ summary }}</p>
        <ul class="project-card__tags" aria-label="项目技术与主题">
          <li>Go</li>
          <li>Agent runtime</li>
          <li>工具调用</li>
          <li>执行追踪</li>
        </ul>
        <div class="project-card__focus">
          <span>探索方向</span>
          <p>执行循环、上下文管理与可验证的工程边界。</p>
        </div>
        <button
          ref="openButton"
          class="project-introduction__open"
          type="button"
          @click="openIntroduction"
        >{{ linkLabel }}</button>
      </article>
    </div>

    <section v-if="isOpen" class="project-introduction__reader" aria-label="go-tiny-claw 项目介绍">
      <div class="project-introduction__toolbar">
        <button type="button" class="project-introduction__back" @click="returnToSummary">
          <span aria-hidden="true">←</span> 返回项目摘要
        </button>
        <h2 ref="readerHeading" tabindex="-1">go-tiny-claw 项目介绍</h2>
      </div>
      <div class="project-introduction__article vp-doc" tabindex="0" aria-label="项目介绍正文">
        <component :is="article" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.project-introduction {
  display: flex;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.project-introduction__summary {
  flex: 1;
  min-width: 0;
  padding: 24px 28px;
  overflow: auto;
  overscroll-behavior: contain;
}

.project-introduction__summary p {
  white-space: pre-line;
}

.project-card {
  padding: clamp(20px, 4vw, 32px);
  border: 1px solid #d9e3ed;
  border-radius: 16px;
  background: #fffdf7;
  box-shadow: 0 8px 24px rgb(40 90 135 / 5%);
}

.project-card__heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-card__heading > div { min-width: 0; }
.project-card__heading h2 { margin: 4px 0 0; color: #1e2430; font-size: clamp(23px, 3vw, 28px); line-height: 1.3; letter-spacing: -0.02em; }
.project-card__eyebrow { margin: 0; color: #69707d; font-size: 12px; letter-spacing: 0.08em; }
.project-card__icon { display: grid; flex: 0 0 52px; height: 52px; place-items: center; border-radius: 12px; background: #edf3fa; color: #285a87; }
.project-card__description { margin: 24px 0 18px; color: #485465; font-size: 15px; line-height: 1.85; }
.project-card__tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.project-card__tags li { padding: 4px 10px; border: 1px solid #d9e3ed; border-radius: 999px; color: #285a87; background: #f3f7fb; font-size: 12px; line-height: 1.6; }
.project-card__focus { margin: 24px 0; padding: 16px 0; border-top: 1px dashed #d9e3ed; border-bottom: 1px dashed #d9e3ed; }
.project-card__focus > span { color: #69707d; font-size: 12px; }
.project-card__focus p { margin: 4px 0 0; color: #485465; font-size: 14px; line-height: 1.7; }

.project-introduction__open {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #285a87;
  border-radius: 8px;
  background: #285a87;
  color: #fffdf7;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  text-align: left;
  line-height: 1.6;
  transition: background-color 150ms ease;
}

.project-introduction__open:hover { background: #17447f; }
@media (prefers-reduced-motion: reduce) { .project-introduction__open { transition: none; } }

.project-introduction__reader {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.project-introduction__toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 12px 18px;
  border-bottom: 1px dashed rgb(64 125 180 / 30%);
  background: #fffdf6;
}

.project-introduction__toolbar h2 {
  margin: 0;
  color: #485465;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.project-introduction__back {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid rgb(64 125 180 / 30%);
  border-radius: 6px;
  background: #edf3fa;
  color: #285a87;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.project-introduction__back:hover {
  background: #e1ecf8;
}

.project-introduction__article {
  --vp-c-text-1: #1e2430;
  --vp-c-text-2: #485465;
  --vp-c-brand-1: #1e4dc0;
  --vp-c-brand-2: #17447f;
  --vp-c-divider: #cfd6df;
  --vp-code-color: #285a87;
  --vp-code-bg: #edf1f5;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 24px 28px 32px;
  overflow: auto;
  overscroll-behavior: contain;
  color: var(--vp-c-text-1);
  font-size: 15px;
}

.project-introduction__article :deep(h1) {
  margin: 0 0 20px;
  font-size: 26px;
  line-height: 1.5;
}

.project-introduction__article :deep(h2) {
  margin-top: 32px;
  font-size: 22px;
}

.project-introduction__article :deep(h3) {
  font-size: 18px;
}

.project-introduction__article :deep(a) {
  color: var(--vp-c-brand-1);
}

/* These permalinks belong to the standalone article, not the desktop route. */
.project-introduction__article :deep(.header-anchor) {
  display: none;
}

.project-introduction__article:focus-visible,
.project-introduction__toolbar h2:focus-visible,
.project-introduction :where(a, button):focus-visible {
  outline: 3px solid #315efb;
  outline-offset: -3px;
}

@media (max-width: 767px) {
  .project-introduction__summary {
    padding: 20px;
  }

  .project-introduction__toolbar {
    padding: 10px 12px;
  }

  .project-introduction__back {
    min-height: 44px;
  }

  .project-introduction__article {
    padding: 20px;
  }

  .project-introduction__article :deep(h1) {
    font-size: 23px;
  }
}
</style>
