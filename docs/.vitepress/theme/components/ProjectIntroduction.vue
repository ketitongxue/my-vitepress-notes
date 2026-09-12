<script setup>
import { defineAsyncComponent, h, nextTick, ref, shallowRef } from 'vue'

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
      <p>{{ summary }}</p>
      <button
        ref="openButton"
        class="project-introduction__open"
        type="button"
        @click="openIntroduction"
      >{{ linkLabel }}</button>
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
  margin: 0 0 16px;
  white-space: pre-line;
}

.project-introduction__open {
  padding: 0;
  border: 0;
  background: transparent;
  color: #1e4dc0;
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
}

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
