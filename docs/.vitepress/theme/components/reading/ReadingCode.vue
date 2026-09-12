<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { installReadingCodeCopy } from './readingCodeCopy.mjs'

const props = defineProps({
  filename: { type: String, required: true },
  language: { type: String, default: 'text' },
})

const panel = ref(null)
const copyStatus = ref('')
let removeCopyHandler

onMounted(() => {
  removeCopyHandler = installReadingCodeCopy(panel.value, {
    filename: props.filename,
    onStatus: (status) => { copyStatus.value = status },
  })
})

onBeforeUnmount(() => removeCopyHandler?.())
</script>

<template>
  <figure ref="panel" class="reading-code">
    <figcaption class="reading-code__caption">
      <span class="reading-code__file">{{ filename }}</span>
      <span class="reading-code__language">{{ language }}</span>
      <span class="reading-code__status" role="status" aria-live="polite">{{ copyStatus }}</span>
    </figcaption>
    <!-- Keep a regular Markdown fence for VitePress highlighting and its single
         copy button; the local handler also reports clipboard failures. -->
    <slot />
  </figure>
</template>
