<script setup lang="ts">
const props = defineProps<{ now: Date }>()

const time = computed(() => formatTime(props.now))
const longDate = computed(() => formatLongDate(props.now))
</script>

<template>
  <div>
    <p class="font-display text-[clamp(4.75rem,24vw,8.5rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-ink tabular-nums">
      <time :datetime="now.toISOString()">{{ time }}</time>
    </p>
    <p class="mt-4 text-lg text-ink-muted md:text-xl">{{ longDate }}</p>
  </div>
</template>
