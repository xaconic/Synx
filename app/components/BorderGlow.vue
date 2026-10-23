<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  edgeSensitivity: { type: Number, default: 30 },
  glowColor: { type: String, default: '24 82 58' },
  backgroundColor: { type: String, default: 'transparent' },
  borderRadius: { type: Number, default: 4 },
  glowRadius: { type: Number, default: 18 },
  glowIntensity: { type: Number, default: 0.72 },
  coneSpread: { type: Number, default: 25 },
  animated: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  colors: { type: Array, default: () => ['#f26a3d', '#77b6c4', '#e4bf5b'] },
  fillOpacity: { type: Number, default: 0.04 },
  className: { type: String, default: '' },
})

const root = ref(null)
const glowVars = computed(() => buildGlowVars(props.glowColor, props.glowIntensity))
const gradientVars = computed(() => buildGradientVars(props.colors))
const lightSurface = computed(() => isLightColor(props.backgroundColor))
const styleVariables = computed(() => ({
  '--card-bg': props.backgroundColor,
  '--border-radius': `${props.borderRadius}px`,
  '--glow-padding': `${props.glowRadius}px`,
  '--edge-sensitivity': props.edgeSensitivity,
  '--cone-spread': `${props.coneSpread}deg`,
  '--fill-opacity': props.fillOpacity,
  '--edge-proximity': 0,
  '--edge-opacity': 0,
  '--cursor-angle': '0deg',
  ...glowVars.value,
  ...gradientVars.value,
}))

let animationFrames = new Set()
let sweepTimer = null

function parseHsl(value) {
  const match = value.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/)
  if (!match) return { hue: 40, saturation: 80, lightness: 80 }
  return { hue: Number.parseFloat(match[1]), saturation: Number.parseFloat(match[2]), lightness: Number.parseFloat(match[3]) }
}

function buildGlowVars(color, intensity) {
  const { hue, saturation, lightness } = parseHsl(color)
  const opacities = [100, 60, 50, 40, 30, 20, 10]
  const suffixes = ['', '-60', '-50', '-40', '-30', '-20', '-10']
  return Object.fromEntries(opacities.map((opacity, index) => [
    `--glow-color${suffixes[index]}`,
    `hsl(${hue}deg ${saturation}% ${lightness}% / ${Math.min(opacity * intensity, 100)}%)`,
  ]))
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%']
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven']
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1]

function buildGradientVars(colors) {
  const palette = colors.length ? colors : ['#f26a3d']
  const variables = Object.fromEntries(GRADIENT_KEYS.map((key, index) => {
    const color = palette[Math.min(COLOR_MAP[index], palette.length - 1)]
    return [key, `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0, transparent 54%)`]
  }))
  variables['--gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`
  return variables
}

function isLightColor(color) {
  const value = color.trim().replace('#', '')
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false
  const hex = value.length === 3 ? value.split('').map((character) => character + character).join('') : value
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 180
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3)
}

function easeInCubic(value) {
  return value * value * value
}

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const startAt = performance.now() + delay
  const tick = (now) => {
    const elapsed = now - startAt
    if (elapsed < 0) {
      const frame = requestAnimationFrame(tick)
      animationFrames.add(frame)
      return
    }
    const progress = Math.min(elapsed / duration, 1)
    onUpdate(start + (end - start) * ease(progress))
    if (progress < 1) {
      const frame = requestAnimationFrame(tick)
      animationFrames.add(frame)
    } else if (onEnd) {
      onEnd()
    }
  }
  const frame = requestAnimationFrame(tick)
  animationFrames.add(frame)
}

function startSweep() {
  const card = root.value
  if (!props.animated || !card) return
  const angleStart = 110
  const angleEnd = 465
  card.classList.add('sweep-active')
  card.style.setProperty('--cursor-angle', `${angleStart}deg`)
  animateValue({ duration: 500, onUpdate: (value) => card.style.setProperty('--edge-proximity', String(value)) })
  animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: (value) => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`) })
  animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: (value) => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`) })
  animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0, onUpdate: (value) => card.style.setProperty('--edge-proximity', String(value)), onEnd: () => card.classList.remove('sweep-active') })
}

function handlePointerMove(event) {
  const card = root.value
  if (!card || !props.enabled) return
  const rect = card.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const dx = x - centerX
  const dy = y - centerY
  const edge = Math.min(Math.max(Math.max(Math.abs(dx) / Math.max(centerX, 1), Math.abs(dy) / Math.max(centerY, 1)), 0), 1)
  const angle = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360
  const sensitivity = Math.max(props.edgeSensitivity, 1)
  const opacity = Math.min(edge * 100 / sensitivity, 1)
  card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`)
  card.style.setProperty('--edge-opacity', opacity.toFixed(3))
  card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`)
}

watch(() => props.animated, (animated) => {
  if (animated) startSweep()
})

onMounted(startSweep)

onBeforeUnmount(() => {
  if (sweepTimer) clearTimeout(sweepTimer)
  for (const frame of animationFrames) cancelAnimationFrame(frame)
  animationFrames = new Set()
})
</script>

<template>
  <div
    ref="root"
    class="border-glow-card"
    :class="[className, { 'border-glow-card--light': lightSurface, 'border-glow-card--disabled': !props.enabled }]"
    :style="styleVariables"
    @pointermove="handlePointerMove"
  >
    <span class="edge-light" aria-hidden="true" />
    <div class="border-glow-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.border-glow-card {
  position: relative;
  z-index: 0;
  width: 100%;
  min-width: 0;
  isolation: isolate;
  border-radius: var(--border-radius);
  background: transparent;
}

.edge-light {
  position: absolute;
  z-index: 2;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--edge-opacity);
  filter: drop-shadow(0 0 var(--glow-padding) var(--glow-color-10));
  box-shadow: 0 0 calc(var(--edge-opacity) * var(--glow-padding)) var(--glow-color-10);
  transition: opacity 160ms ease;
}

.edge-light::before {
  position: absolute;
  content: '';
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(from var(--cursor-angle), transparent 0deg, var(--glow-color-60) var(--cone-spread), transparent calc(var(--cone-spread) * 2), transparent 360deg);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 1px;
}

.edge-light::after {
  position: absolute;
  content: '';
  inset: calc(var(--glow-padding) * -0.2);
  border-radius: inherit;
  background: var(--gradient-one), var(--gradient-two), var(--gradient-three), var(--gradient-four);
  filter: blur(calc(var(--glow-padding) * 0.25));
  opacity: 0.34;
  padding: calc(var(--glow-padding) * 0.2);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}

.border-glow-inner {
  position: relative;
  z-index: 1;
  display: flow-root;
  width: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--card-bg);
  color: inherit;
}

.border-glow-card--light {
  color: var(--ink, #171714);
}

.border-glow-card--disabled .edge-light {
  opacity: 0 !important;
}

@media (prefers-reduced-motion: reduce) {
  .edge-light {
    transition: none;
  }
}
</style>