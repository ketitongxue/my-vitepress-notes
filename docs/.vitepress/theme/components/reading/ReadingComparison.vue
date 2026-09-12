<script setup>
defineProps({
  label: { type: String, default: '方法对比' },
  beforeTitle: { type: String, default: '容易忽略' },
  afterTitle: { type: String, default: '建议关注' },
})
</script>

<template>
  <div class="reading-comparison" role="group" :aria-label="label">
    <section class="reading-comparison__panel reading-comparison__panel--before" :aria-label="beforeTitle">
      <p class="reading-comparison__label">{{ beforeTitle }}</p>
      <slot name="before" />
    </section>
    <section class="reading-comparison__panel reading-comparison__panel--after" :aria-label="afterTitle">
      <p class="reading-comparison__label">{{ afterTitle }}</p>
      <slot name="after" />
    </section>
  </div>
</template>
