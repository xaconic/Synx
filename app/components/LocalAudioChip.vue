<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'unverified' },
  path: { type: String, default: '' },
})

const label = computed(() => {
  if (props.status === 'available') return '♪ LOCAL MP3'
  if (props.status === 'missing') return 'NO LOCAL FILE'
  if (props.status === 'invalid') return 'BAD LOCAL FILE'
  if (props.status === 'unconfigured') return ''
  return 'CHECKING LOCAL'
})

const tone = computed(() => {
  if (props.status === 'available') return 'ok'
  if (props.status === 'missing' || props.status === 'invalid') return 'warn'
  return 'pending'
})

const hint = computed(() => {
  if (props.status === 'available') return `Verified local MP3 at ${props.path}`
  if (props.status === 'missing') return `Add your authorized MP3 at public${props.path || '/music/<filename>.mp3'}`
  if (props.status === 'invalid') return `Replace the file at public${props.path} with a valid MP3`
  if (props.status === 'unconfigured') return 'No local audio path is configured for this song'
  return 'Checking the local audio file…'
})
</script>

<template>
  <span v-if="label" class="local-audio-chip" :class="`local-audio-${tone}`" :title="hint" role="status">{{ label }}</span>
</template>
