<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  value: { type: Number, default: undefined },
  defaultValue: { type: Number, default: 50 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  bars: { type: Number, default: 32 },
  height: { type: Number, default: 56 },
  restHeight: { type: Number, default: 12 },
  gap: { type: Number, default: 4 },
  fillColor: { type: String, default: '#f5f5f5' },
  trackColor: { type: String, default: '#27272a' },
  crestColor: { type: String, default: '' },
  sensitivity: { type: Number, default: 1 },
  reach: { type: Number, default: 6 },
  skew: { type: Number, default: 0.6 },
  disabled: { type: Boolean, default: false },
  showValue: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Value' },
  formatValue: { type: Function, default: null },
})

const emit = defineEmits(['update:value', 'change'])
const localValue = ref(props.defaultValue)
const reducedMotion = ref(false)
const wakeAmplitude = ref(0)
const wakeDirection = ref(1)
const headIndex = ref(0)
const trackElement = ref(null)
const handleElement = ref(null)
const value = computed(() => clamp(props.value ?? localValue.value, props.min, props.max))
const percentage = computed(() => props.max > props.min ? ((value.value - props.min) / (props.max - props.min)) * 100 : 0)
const restScale = computed(() => Math.min(props.restHeight, props.height - 1) / props.height)
const formattedValue = computed(() => props.formatValue?.(value.value) ?? `${Math.round(value.value)}%`)
const styleVariables = computed(() => ({
  '--ws-fill': props.fillColor,
  '--ws-track': props.trackColor,
  '--ws-crest': props.crestColor || props.fillColor,
  '--ws-height': `${props.height}px`,
  '--ws-gap': `${props.gap}px`,
  '--ws-rest': restScale.value,
}))

let activePointer = null
let wakeFrame = 0

function clamp(number, lower, upper) {
  return Math.min(upper, Math.max(lower, number))
}

function snap(number) {
  if (props.max <= props.min) return props.min
  if (props.step <= 0) return clamp(number, props.min, props.max)
  const lastStep = props.min + Math.floor((props.max - props.min) / props.step + 1e-6) * props.step
  const snapped = clamp(Math.round((number - props.min) / props.step) * props.step + props.min, props.min, lastStep)
  return +(Math.abs(number - props.max) < Math.abs(number - snapped) ? props.max : snapped).toFixed(6)
}

function animateWake(next, previous) {
  if (reducedMotion.value) return
  const range = Math.max(1, props.max - props.min)
  const movement = Math.abs(next - previous) / range
  if (!movement) return

  headIndex.value = (percentage.value / 100) * (Math.max(1, props.bars) - 1)
  wakeDirection.value = Math.sign(next - previous) || 1
  wakeAmplitude.value = clamp(movement * props.sensitivity * 20, 0.08, 1)
  cancelAnimationFrame(wakeFrame)

  const settle = () => {
    wakeAmplitude.value *= 0.9
    if (wakeAmplitude.value > 0.015) wakeFrame = requestAnimationFrame(settle)
    else wakeAmplitude.value = 0
  }

  wakeFrame = requestAnimationFrame(settle)
}

function commit(next) {
  const clean = snap(next)
  if (clean === value.value) return
  const previous = value.value
  if (props.value === undefined) localValue.value = clean
  emit('update:value', clean)
  emit('change', clean)
  animateWake(clean, previous)
}

function commitFromPointer(clientX) {
  const rect = trackElement.value?.getBoundingClientRect()
  if (!rect?.width) return
  let ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
  if (getComputedStyle(trackElement.value).direction === 'rtl') ratio = 1 - ratio
  commit(props.min + ratio * (props.max - props.min))
}

function onPointerDown(event) {
  if (props.disabled || activePointer !== null) return
  activePointer = event.pointerId
  trackElement.value.setPointerCapture(event.pointerId)
  handleElement.value?.focus({ preventScroll: true })
  commitFromPointer(event.clientX)
}

function onPointerMove(event) {
  if (event.pointerId === activePointer) commitFromPointer(event.clientX)
}

function onPointerEnd(event) {
  if (event.pointerId !== activePointer) return
  if (trackElement.value?.hasPointerCapture(event.pointerId)) trackElement.value.releasePointerCapture(event.pointerId)
  activePointer = null
}

function onKeyDown(event) {
  if (props.disabled) return
  const increments = {
    ArrowRight: props.step,
    ArrowUp: props.step,
    ArrowLeft: -props.step,
    ArrowDown: -props.step,
    PageUp: props.step * 10,
    PageDown: -props.step * 10,
  }
  if (event.key === 'Home') commit(props.min)
  else if (event.key === 'End') commit(props.max)
  else if (event.key in increments) commit(value.value + increments[event.key])
  else return
  event.preventDefault()
}

const bars = computed(() => {
  const count = Math.max(1, Math.floor(props.bars))
  const head = (percentage.value / 100) * (count - 1)
  const amplitude = reducedMotion.value ? 0 : wakeAmplitude.value
  const reach = 1.5 + (Math.max(1.5, props.reach) - 1.5) * amplitude
  const behind = reach * (1 + props.skew)
  const ahead = reach * (1 - 0.5 * props.skew)

  return Array.from({ length: count }, (_, index) => {
    const distance = index - head
    const radius = distance * wakeDirection.value < 0 ? behind : ahead
    const lift = Math.abs(distance) < radius
      ? amplitude * Math.cos((Math.PI * distance) / (2 * radius)) ** 2
      : 0

    return {
      active: index <= head,
      style: {
        transform: `scaleY(${restScale.value + lift * (1 - restScale.value)})`,
        '--ws-crest-opacity': lift,
      },
    }
  })
})

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onBeforeUnmount(() => cancelAnimationFrame(wakeFrame))
</script>

<template>
  <div class="wake-slider" :class="{ 'wake-slider--disabled': disabled }" :style="styleVariables">
    <div
      ref="trackElement"
      class="wake-slider__track"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @lostpointercapture="onPointerEnd"
    >
      <span
        v-for="(bar, index) in bars"
        :key="index"
        class="wake-slider__bar"
        :class="{ 'wake-slider__bar--active': bar.active }"
        :style="bar.style"
      >
        <span v-if="crestColor" class="wake-slider__crest" />
      </span>
      <button
        ref="handleElement"
        type="button"
        role="slider"
        class="wake-slider__handle"
        :style="{ left: `${percentage}%` }"
        :tabindex="disabled ? -1 : 0"
        :aria-label="ariaLabel"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="value"
        :aria-valuetext="formattedValue"
        :aria-disabled="disabled || undefined"
        @keydown="onKeyDown"
      />
    </div>
    <span v-if="showValue" class="wake-slider__value" aria-hidden="true">{{ formattedValue }}</span>
  </div>
</template>

<style scoped>
.wake-slider {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-width: 0;
  color: inherit;
  user-select: none;
}

.wake-slider__track {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: end;
  gap: var(--ws-gap);
  height: var(--ws-height);
  min-width: 0;
  cursor: pointer;
  touch-action: none;
}

.wake-slider__bar {
  position: relative;
  display: block;
  flex: 1 1 0;
  min-width: 1px;
  height: 100%;
  overflow: hidden;
  transform-origin: center bottom;
  background: var(--ws-track);
  transition: transform 90ms linear, background-color 120ms ease;
}

.wake-slider__bar--active {
  background: var(--ws-fill);
}

.wake-slider__crest {
  position: absolute;
  inset: 0;
  background: var(--ws-crest);
  opacity: var(--ws-crest-opacity, 0);
}

.wake-slider__handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  padding: 0;
  border: 2px solid var(--ws-fill);
  border-radius: 50%;
  background: var(--ws-track);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.wake-slider__value {
  flex: 0 0 28px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 8px;
  text-align: right;
}

.wake-slider--disabled {
  opacity: 0.45;
}

.wake-slider--disabled .wake-slider__track {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .wake-slider__bar {
    transition: none;
  }
}
</style>