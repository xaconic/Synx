<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => ['Ambient', 'House', 'Techno', 'Jazz', 'Lo-Fi', 'Synthwave', 'Trance', 'Funk', 'Disco', 'Hip-Hop', 'Chillwave', 'Drum & Bass'] },
  modelValue: { type: Number, default: undefined },
  defaultSelected: { type: Number, default: 3 },
  textColor: { type: String, default: '#a6a6a6' },
  activeColor: { type: String, default: '#ffffff' },
  side: { type: String, default: 'left' },
  fontSize: { type: Number, default: 3 },
  spacing: { type: Number, default: 1.4 },
  curve: { type: Number, default: 1 },
  tilt: { type: Number, default: 6 },
  blur: { type: Number, default: 2 },
  fade: { type: Number, default: 0.25 },
  minOpacity: { type: Number, default: 0.05 },
  smoothing: { type: Number, default: 200 },
  inset: { type: Number, default: 80 },
  loop: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  soundUrl: { type: String, default: '' },
  soundVolume: { type: Number, default: 0.5 },
  className: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrapIndex = (index, count) => count ? ((index % count) + count) % count : 0
const initialIndex = clamp(props.modelValue ?? props.defaultSelected, 0, Math.max(props.items.length - 1, 0))
const localSelection = ref(initialIndex)
const selectedIndex = computed(() => wrapIndex(props.modelValue ?? localSelection.value, props.items.length))
const itemElements = []
const root = ref(null)
const isDragging = ref(false)
const rootRem = ref(16)
let position = initialIndex
let targetPosition = initialIndex
let currentSelected = initialIndex
let frameId = null
let lastFrame = 0
let wheelTimer = null
let drag = null
let dragMoved = false
let audio = null
let audioUrl = ''
let lastTick = 0

const rowHeight = computed(() => Math.max(props.fontSize * props.spacing * rootRem.value, 1))
const rootStyle = computed(() => ({
  '--ow-text-color': props.textColor,
  '--ow-active-color': props.activeColor,
  '--ow-font-size': `${props.fontSize}rem`,
  '--ow-inset': `${props.inset}px`,
  '--ow-height': `${Math.max(props.inset * 2, rowHeight.value * 2)}px`,
  '--ow-side': props.side === 'right' ? -1 : 1,
}))

function playTick() {
  if (!props.soundUrl) return
  const now = performance.now()
  if (now - lastTick < 70) return
  lastTick = now
  if (!audio || audioUrl !== props.soundUrl) {
    audio = new Audio(props.soundUrl)
    audio.preload = 'auto'
    audioUrl = props.soundUrl
  }
  audio.volume = clamp(props.soundVolume, 0, 1)
  audio.currentTime = 0
  audio.play()?.catch(() => {})
}

function updateTarget(value, snap = false) {
  const count = props.items.length
  if (!count) return
  let next = props.loop ? value : clamp(value, 0, count - 1)
  if (snap) next = Math.round(next)
  targetPosition = next

  const index = props.loop ? wrapIndex(Math.round(next), count) : clamp(Math.round(next), 0, count - 1)
  if (index !== currentSelected) {
    currentSelected = index
    if (props.modelValue === undefined) localSelection.value = index
    emit('update:modelValue', index)
    emit('change', index, props.items[index])
    playTick()
  }
  startLoop()
}

function renderFrame(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now
  const smoothing = Math.max(props.smoothing, 1) / 1000
  const amount = 1 - Math.exp(-delta / smoothing)
  let next = position + (targetPosition - position) * amount
  const settled = Math.abs(targetPosition - next) < 0.001
  if (settled) next = targetPosition
  position = next

  const count = props.items.length
  const mirror = props.side === 'right' ? -1 : 1
  const tiltRadians = (props.tilt * Math.PI) / 180
  const radius = tiltRadians > 0.0005 ? rowHeight.value / tiltRadians : 0

  for (let index = 0; index < count; index += 1) {
    const element = itemElements[index]
    if (!element) continue
    let distance = index - next
    if (props.loop && count > 1) {
      distance = ((distance % count) + count) % count
      if (distance > count / 2) distance -= count
    }

    const absoluteDistance = Math.abs(distance)
    let x = 0
    let y = distance * rowHeight.value
    let rotation = 0
    if (radius > 0) {
      const angle = clamp(distance * tiltRadians, -Math.PI / 2, Math.PI / 2)
      y = radius * Math.sin(angle)
      x = -mirror * radius * (1 - Math.cos(angle)) * props.curve
      rotation = (mirror * angle * 180) / Math.PI
    }

    element.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`
    element.style.opacity = String(Math.max(props.minOpacity, 1 - absoluteDistance * props.fade))
    element.style.filter = props.blur > 0 ? `blur(${(absoluteDistance * props.blur).toFixed(2)}px)` : 'none'
    element.style.setProperty('--ow-progress', Math.max(0, 1 - Math.min(absoluteDistance, 1)).toFixed(4))
  }

  frameId = settled ? null : requestAnimationFrame(renderFrame)
}

function startLoop() {
  if (frameId !== null) cancelAnimationFrame(frameId)
  lastFrame = performance.now()
  frameId = requestAnimationFrame(renderFrame)
}

function onWheel(event) {
  event.preventDefault()
  const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY
  const step = clamp(delta / rowHeight.value, -1, 1)
  updateTarget(targetPosition + step)
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => updateTarget(targetPosition, true), 140)
}

function onPointerDown(event) {
  if (!props.draggable || event.button !== 0) return
  drag = { y: event.clientY, start: targetPosition, id: event.pointerId }
  dragMoved = false
  isDragging.value = true
}

function onPointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return
  const deltaY = event.clientY - drag.y
  if (!dragMoved && Math.abs(deltaY) > 4) {
    dragMoved = true
    root.value?.setPointerCapture(event.pointerId)
  }
  if (dragMoved) updateTarget(drag.start - deltaY / rowHeight.value)
}

function onPointerEnd() {
  if (!drag) return
  drag = null
  isDragging.value = false
  if (dragMoved) updateTarget(targetPosition, true)
}

function onItemClick(index) {
  if (dragMoved || !props.items.length) return
  let distance = index - wrapIndex(Math.round(targetPosition), props.items.length)
  if (props.loop && props.items.length > 1) {
    if (distance > props.items.length / 2) distance -= props.items.length
    else if (distance < -props.items.length / 2) distance += props.items.length
  }
  updateTarget(targetPosition + distance, true)
}

function onKeyDown(event) {
  let delta = null
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') delta = -1
  else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') delta = 1
  if (delta === null) return
  event.preventDefault()
  updateTarget(Math.round(targetPosition) + delta, true)
}

function measureRem() {
  rootRem.value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

onMounted(() => {
  measureRem()
  updateTarget(targetPosition)
  root.value?.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', measureRem)
})

watch(() => props.modelValue, (value) => {
  if (value !== undefined && wrapIndex(value, props.items.length) !== currentSelected) {
    currentSelected = wrapIndex(value, props.items.length)
    updateTarget(value, true)
  }
})

watch(() => [props.items, props.fontSize, props.spacing, props.curve, props.tilt, props.blur, props.fade, props.minOpacity, props.side, props.loop, props.smoothing], () => {
  if (!props.items.length) return
  updateTarget(targetPosition)
}, { deep: true })

onBeforeUnmount(() => {
  if (frameId !== null) cancelAnimationFrame(frameId)
  clearTimeout(wheelTimer)
  root.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', measureRem)
  audio?.pause()
})
</script>

<template>
  <div
    ref="root"
    class="option-wheel"
    :class="[className, { 'option-wheel--right': side === 'right', 'option-wheel--dragging': isDragging }]"
    :style="rootStyle"
    role="listbox"
    tabindex="0"
    aria-label="Sound style"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @keydown="onKeyDown"
  >
    <div
      v-for="(item, index) in items"
      :key="`${item}-${index}`"
      :ref="element => { itemElements[index] = element }"
      class="option-wheel__item"
      :class="{ 'option-wheel__item--selected': selectedIndex === index }"
      role="option"
      :aria-selected="selectedIndex === index"
      @click="onItemClick(index)"
    >
      {{ item }}
    </div>
    <span class="option-wheel__selection-line" aria-hidden="true" />
  </div>
</template>

<style scoped>
.option-wheel {
  position: relative;
  width: 100%;
  height: var(--ow-height);
  overflow: hidden;
  outline: none;
  color: var(--ow-text-color);
  cursor: grab;
  user-select: none;
  touch-action: pan-x;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%);
}

.option-wheel:focus-visible {
  outline: 1px solid var(--orange, #f26a3d);
  outline-offset: 3px;
}

.option-wheel--dragging {
  cursor: grabbing;
}

.option-wheel__item {
  position: absolute;
  top: 50%;
  right: var(--ow-inset);
  left: var(--ow-inset);
  z-index: 1;
  color: var(--ow-text-color);
  font-family: var(--display, sans-serif);
  font-size: var(--ow-font-size);
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  transform-origin: center;
  transition: color 140ms ease, text-shadow 140ms ease;
}

.option-wheel__item--selected {
  color: var(--ow-active-color);
  text-shadow: 0 0 16px color-mix(in srgb, var(--orange, #f26a3d), transparent 52%);
}

.option-wheel__selection-line {
  position: absolute;
  top: 50%;
  right: var(--ow-inset);
  left: var(--ow-inset);
  z-index: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--orange, #f26a3d), transparent);
  opacity: 0.42;
}

@media (prefers-reduced-motion: reduce) {
  .option-wheel__item {
    transition: none;
  }
}
</style>