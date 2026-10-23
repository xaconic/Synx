                                                                                                                                                                                    <script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BorderGlow from '~/components/BorderGlow.vue'

const props = defineProps({
  flipped: { type: Boolean, default: undefined },
  defaultFlipped: { type: Boolean, default: false },
  axis: { type: String, default: 'y' },
  flipOnClick: { type: Boolean, default: true },
  draggable: { type: Boolean, default: true },
  dragDistance: { type: Number, default: 0 },
  tilt: { type: Boolean, default: true },
  tiltMax: { type: Number, default: 12 },
  glare: { type: Boolean, default: true },
  glareOpacity: { type: Number, default: 0.22 },
  hoverScale: { type: Number, default: 1.03 },
  perspective: { type: Number, default: 1100 },
  stiffness: { type: Number, default: 170 },
  damping: { type: Number, default: 20 },
  width: { type: [Number, String], default: '100%' },
  height: { type: [Number, String], default: 'auto' },
  radius: { type: Number, default: 0 },
  background: { type: String, default: '#27272a' },
  color: { type: String, default: '#f5f5f5' },
  shadow: { type: Boolean, default: true },
  shadowColor: { type: String, default: '#000000' },
  shadowOpacity: { type: Number, default: 0.25 },
  borderGlow: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Flip card' },
  className: { type: String, default: '' },
  eyebrow: { type: String, default: 'SYNX / REVERSE' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
})

const emit = defineEmits(['flip-change'])
const innerFlipped = ref(props.defaultFlipped)
const flipped = computed(() => props.flipped ?? innerFlipped.value)
const reducedMotion = ref(false)
const dragging = ref(false)
const hovered = ref(false)
const angle = ref(flipped.value ? 180 : 0)
const tiltX = ref(0)
const tiltY = ref(0)
const pointerX = ref(50)
const pointerY = ref(50)
const root = ref(null)
let drag = null
let suppressClick = false

const rootStyle = computed(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height
  const transform = reducedMotion.value
    ? 'none'
    : props.axis === 'x'
      ? `perspective(${props.perspective}px) rotateY(${tiltY.value}deg) rotateX(${tiltX.value}deg) scale(${hovered.value && !dragging.value ? props.hoverScale : 1})`
      : `perspective(${props.perspective}px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg) scale(${hovered.value && !dragging.value ? props.hoverScale : 1})`

  return {
    width,
    height,
    '--fc-radius': `${props.radius}px`,
    '--fc-bg': props.background,
    '--fc-color': props.color,
    '--fc-shadow-color': props.shadowColor,
    '--fc-shadow-opacity': props.shadowOpacity,
    '--fc-glare-opacity': props.glareOpacity,
    '--fc-pointer-x': `${pointerX.value}%`,
    '--fc-pointer-y': `${pointerY.value}%`,
    '--fc-perspective': `${props.perspective}px`,
    '--fc-transition': `${Math.max(180, Math.min(900, (props.damping / Math.max(1, props.stiffness)) * 4000))}ms`,
    transform: props.disabled ? 'none' : transform,
    '--fc-flip-rotation': props.axis === 'x' ? `rotateX(${angle.value}deg)` : `rotateY(${angle.value}deg)`,
  }
})

function setFlipped(next) {
  if (next === flipped.value) return
  if (props.flipped === undefined) innerFlipped.value = next
  angle.value = next ? 180 : 0
  emit('flip-change', next)
}

function flip() {
  setFlipped(!flipped.value)
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, [data-flip-ignore]'))
}

function onClick(event) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (props.disabled || !props.flipOnClick || isInteractiveTarget(event.target)) return
  flip()
}

function onKeyDown(event) {
  if (props.disabled || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  if (!event.repeat) flip()
}

function onPointerDown(event) {
  if (props.disabled || !props.draggable || reducedMotion.value || event.button !== 0 || isInteractiveTarget(event.target)) return
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startAngle: angle.value,
    moved: false,
    slop: event.pointerType === 'touch' ? 8 : 4,
  }
  root.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
  if (drag && drag.id === event.pointerId) {
    const delta = props.axis === 'x' ? drag.y - event.clientY : event.clientX - drag.x
    if (!drag.moved && (Math.abs(delta) < drag.slop || reducedMotion.value)) return
    drag.moved = true
    dragging.value = true
    tiltX.value = 0
    tiltY.value = 0
    const rect = root.value?.getBoundingClientRect()
    const span = props.dragDistance > 0 ? props.dragDistance : props.axis === 'x' ? rect?.height : rect?.width
    if (span) angle.value = drag.startAngle + (delta / span) * 180
    return
  }

  if (!props.tilt || props.disabled || reducedMotion.value || event.pointerType === 'touch') return
  hovered.value = true
  const rect = root.value?.getBoundingClientRect()
  if (!rect?.width || !rect.height) return
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  tiltX.value = (0.5 - y) * 2 * props.tiltMax
  tiltY.value = (x - 0.5) * 2 * props.tiltMax
  pointerX.value = x * 100
  pointerY.value = y * 100
}

function resetTilt() {
  hovered.value = false
  tiltX.value = 0
  tiltY.value = 0
  pointerX.value = 50
  pointerY.value = 50
}

function finishPointer(event, cancelled = false) {
  if (!drag || drag.id !== event.pointerId) return
  const didMove = drag.moved
  if (cancelled) angle.value = flipped.value ? 180 : 0
  else if (didMove) angle.value = Math.round(angle.value / 180) * 180
  drag = null
  dragging.value = false
  if (root.value?.hasPointerCapture(event.pointerId)) root.value.releasePointerCapture(event.pointerId)
  if (didMove) {
    suppressClick = true
    setFlipped(Math.abs(Math.round(angle.value / 180)) % 2 === 1)
  }
  if (event.pointerType === 'touch' || !root.value?.matches(':hover')) resetTilt()
}

watch(flipped, (next) => {
  angle.value = next ? 180 : 0
})

watch(() => props.disabled, (disabled) => {
  if (disabled) resetTilt()
})

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onBeforeUnmount(() => {
  drag = null
})
</script>

<template>
  <div
    ref="root"
    class="flip-card"
    :class="[className, { 'flip-card--flipped': flipped, 'flip-card--dragging': dragging, 'flip-card--disabled': disabled }]"
    :style="rootStyle"
    :role="'group'"
    :tabindex="disabled ? -1 : 0"
    :aria-label="ariaLabel"
    :aria-disabled="disabled || undefined"
    :aria-expanded="flipped"
    :data-axis="axis"
    :data-reduced-motion="reducedMotion"
    @click="onClick"
    @keydown="onKeyDown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finishPointer($event)"
    @pointercancel="finishPointer($event, true)"
    @lostpointercapture="finishPointer($event, true)"
    @pointerenter="hovered = !reducedMotion && !disabled"
    @pointerleave="resetTilt"
    @dragstart.prevent
  >
    <span v-if="shadow" class="flip-card__shadow" aria-hidden="true" />
    <div class="flip-card__rotor">
      <div class="flip-card__face flip-card__face--front" :aria-hidden="flipped" :inert="flipped">
        <BorderGlow class="flip-card__border-glow" :border-radius="radius" :enabled="borderGlow">
          <slot />
        </BorderGlow>
        <span v-if="glare" class="flip-card__glare" aria-hidden="true" />
      </div>
      <div class="flip-card__face flip-card__face--back" :aria-hidden="!flipped" :inert="!flipped">
        <BorderGlow class="flip-card__border-glow" :border-radius="radius" :enabled="borderGlow">
          <slot name="back">
            <div class="flip-card__default-back">
              <span class="flip-card__back-mark">{{ eyebrow }}</span>
              <h3 v-if="title">{{ title }}</h3>
              <p v-if="subtitle" class="flip-card__subtitle">{{ subtitle }}</p>
              <p v-if="description" class="flip-card__description">{{ description }}</p>
              <slot name="back-details" />
            </div>
          </slot>
        </BorderGlow>
        <span v-if="glare" class="flip-card__glare" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-card {
  position: relative;
  display: block;
  min-width: 0;
  border-radius: var(--fc-radius);
  outline: none;
  transform-style: preserve-3d;
  transition: transform var(--fc-transition) cubic-bezier(.2, .72, .2, 1);
  -webkit-tap-highlight-color: transparent;
}

.flip-card--dragging {
  transition: none;
  cursor: grabbing;
}

.flip-card:not(.flip-card--disabled) {
  cursor: pointer;
}

.flip-card:focus-visible {
  outline: 2px solid var(--orange, #f26a3d);
  outline-offset: 4px;
}

.flip-card__rotor {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: var(--fc-flip-rotation);
  transition: transform var(--fc-transition) cubic-bezier(.2, .72, .2, 1);
}

.flip-card--dragging .flip-card__rotor {
  transition: none;
}

.flip-card__face {
  position: relative;
  grid-area: 1 / 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--fc-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--fc-bg);
  color: var(--fc-color);
}

.flip-card__face--back {
  transform: rotateY(180deg);
}

.flip-card__border-glow {
  min-height: 100%;
}

.flip-card[data-axis='x'] .flip-card__face--back {
  transform: rotateX(180deg);
}

.flip-card__glare {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at var(--fc-pointer-x) var(--fc-pointer-y), rgba(255, 255, 255, .52), transparent 55%);
  opacity: var(--fc-glare-opacity);
  mix-blend-mode: screen;
}

.flip-card__shadow {
  position: absolute;
  z-index: -1;
  inset: 5% 4%;
  border-radius: var(--fc-radius);
  background: var(--fc-shadow-color);
  opacity: var(--fc-shadow-opacity);
  filter: blur(14px);
  transform: translateY(9px) translateZ(-1px);
}

.flip-card__default-back {
  display: flex;
  height: 100%;
  min-height: 150px;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--fc-bg), transparent 14%), var(--fc-bg));
}

.flip-card__back-mark {
  color: var(--orange, #f26a3d);
  font-family: var(--mono, monospace);
  font-size: 8px;
}

.flip-card__default-back h3 {
  margin: 0;
  font-family: var(--display, inherit);
  font-size: 28px;
  line-height: 0.95;
  overflow-wrap: anywhere;
}

.flip-card__subtitle,
.flip-card__description {
  margin: 0;
  color: color-mix(in srgb, var(--fc-color), transparent 30%);
  font-size: 10px;
  line-height: 1.5;
}

.flip-card[data-reduced-motion='true'] .flip-card__rotor {
  transform: none;
}

.flip-card[data-reduced-motion='true'] .flip-card__face {
  transition: opacity 160ms ease;
}

.flip-card[data-reduced-motion='true']:not(.flip-card--flipped) .flip-card__face--back,
.flip-card[data-reduced-motion='true'].flip-card--flipped .flip-card__face--front {
  opacity: 0;
}

.flip-card[data-reduced-motion='true'].flip-card--flipped .flip-card__face--back {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .flip-card,
  .flip-card__rotor,
  .flip-card__face {
    transition-duration: 0.01ms;
  }
}
</style>