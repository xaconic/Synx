<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  fontSize: { type: [String, Number], default: 'clamp(2rem, 8vw, 8rem)' },
  fontWeight: { type: Number, default: 900 },
  fontFamily: { type: String, default: 'inherit' },
  color: { type: String, default: '#fff' },
  enableHover: { type: Boolean, default: true },
  baseIntensity: { type: Number, default: 0.18 },
  hoverIntensity: { type: Number, default: 0.5 },
  fuzzRange: { type: Number, default: 30 },
  fps: { type: Number, default: 60 },
  direction: { type: String, default: 'horizontal' },
  transitionDuration: { type: Number, default: 0 },
  clickEffect: { type: Boolean, default: false },
  glitchMode: { type: Boolean, default: false },
  glitchInterval: { type: Number, default: 2000 },
  glitchDuration: { type: Number, default: 200 },
  gradient: { type: Array, default: null },
  letterSpacing: { type: Number, default: 0 },
})

const canvasRef = ref(null)
const slots = useSlots()
let animationFrameId = null
let isCancelled = false
let glitchTimeoutId = null
let glitchEndTimeoutId = null
let clickTimeoutId = null

const resolvedText = computed(() => {
  if (props.text) return props.text

  const nodes = slots.default?.() ?? []
  const walk = (node) => {
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(walk).join('')
    if (!node) return ''

    if (typeof node.children === 'string') return node.children
    if (Array.isArray(node.children)) return node.children.map(walk).join('')

    return ''
  }

  return nodes.map(walk).join('')
})

const buildText = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const text = resolvedText.value.trim()
  if (!text) return

  const computedFontFamily = props.fontFamily === 'inherit'
    ? window.getComputedStyle(canvas).fontFamily || 'sans-serif'
    : props.fontFamily

  const fontSizeValue = typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize
  const fontString = `${props.fontWeight} ${fontSizeValue} ${computedFontFamily}`

  try {
    document.fonts?.load(fontString)
  } catch {
    document.fonts?.ready
  }

  const offscreen = document.createElement('canvas')
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return

  offCtx.font = fontString
  offCtx.textBaseline = 'alphabetic'

  let totalWidth = 0
  if (props.letterSpacing !== 0) {
    for (const char of text) {
      totalWidth += offCtx.measureText(char).width + props.letterSpacing
    }
    totalWidth -= props.letterSpacing
  } else {
    totalWidth = offCtx.measureText(text).width
  }

  const metrics = offCtx.measureText(text)
  const numericFontSize = Number.parseFloat(fontSizeValue) || 32
  const actualLeft = metrics.actualBoundingBoxLeft ?? 0
  const actualRight = props.letterSpacing !== 0 ? totalWidth : (metrics.actualBoundingBoxRight ?? metrics.width)
  const actualAscent = metrics.actualBoundingBoxAscent ?? numericFontSize
  const actualDescent = metrics.actualBoundingBoxDescent ?? (numericFontSize * 0.2)
  const textBoundingWidth = Math.ceil(props.letterSpacing !== 0 ? totalWidth : actualLeft + actualRight)
  const tightHeight = Math.ceil(actualAscent + actualDescent)

  const horizontalMargin = props.fuzzRange + 20
  const verticalMargin = 0
  const extraWidthBuffer = 10
  const offscreenWidth = textBoundingWidth + extraWidthBuffer

  offscreen.width = offscreenWidth
  offscreen.height = tightHeight

  offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
  offCtx.font = fontString
  offCtx.textBaseline = 'alphabetic'

  if (props.gradient && Array.isArray(props.gradient) && props.gradient.length >= 2) {
    const grad = offCtx.createLinearGradient(0, 0, offscreenWidth, 0)
    props.gradient.forEach((color, index) => {
      const ratio = props.gradient.length > 1 ? index / (props.gradient.length - 1) : 0
      grad.addColorStop(ratio, color)
    })
    offCtx.fillStyle = grad
  } else {
    offCtx.fillStyle = props.color
  }

  const xOffset = extraWidthBuffer / 2
  if (props.letterSpacing !== 0) {
    let xPos = xOffset
    for (const char of text) {
      offCtx.fillText(char, xPos, actualAscent)
      xPos += offCtx.measureText(char).width + props.letterSpacing
    }
  } else {
    offCtx.fillText(text, xOffset - actualLeft, actualAscent)
  }

  canvas.width = offscreenWidth + horizontalMargin * 2
  canvas.height = tightHeight + verticalMargin * 2
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.translate(horizontalMargin, verticalMargin)

  const interactiveLeft = horizontalMargin + xOffset
  const interactiveTop = verticalMargin
  const interactiveRight = interactiveLeft + textBoundingWidth
  const interactiveBottom = interactiveTop + tightHeight

  let isHovering = false
  let isClicking = false
  let isGlitching = false
  let currentIntensity = props.baseIntensity
  let targetIntensity = props.baseIntensity
  let lastFrameTime = 0
  const frameDuration = 1000 / props.fps

  const startGlitchLoop = () => {
    if (!props.glitchMode || isCancelled) return
    glitchTimeoutId = window.setTimeout(() => {
      if (isCancelled) return
      isGlitching = true
      glitchEndTimeoutId = window.setTimeout(() => {
        isGlitching = false
        startGlitchLoop()
      }, props.glitchDuration)
    }, props.glitchInterval)
  }

  if (props.glitchMode) startGlitchLoop()

  const step = timestamp => {
    if (isCancelled) return

    if (timestamp - lastFrameTime < frameDuration) {
      animationFrameId = window.requestAnimationFrame(step)
      return
    }

    lastFrameTime = timestamp
    ctx.clearRect(-props.fuzzRange - 20, -props.fuzzRange - 10, offscreenWidth + 2 * (props.fuzzRange + 20), tightHeight + 2 * (props.fuzzRange + 10))

    if (isClicking) {
      targetIntensity = 1
    } else if (isGlitching) {
      targetIntensity = 1
    } else if (isHovering) {
      targetIntensity = props.hoverIntensity
    } else {
      targetIntensity = props.baseIntensity
    }

    if (props.transitionDuration > 0) {
      const stepSize = 1 / (props.transitionDuration / frameDuration)
      if (currentIntensity < targetIntensity) {
        currentIntensity = Math.min(currentIntensity + stepSize, targetIntensity)
      } else if (currentIntensity > targetIntensity) {
        currentIntensity = Math.max(currentIntensity - stepSize, targetIntensity)
      }
    } else {
      currentIntensity = targetIntensity
    }

    if (props.direction === 'horizontal') {
      for (let y = 0; y < tightHeight; y += 1) {
        const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * props.fuzzRange)
        ctx.drawImage(offscreen, 0, y, offscreenWidth, 1, dx, y, offscreenWidth, 1)
      }
    } else if (props.direction === 'vertical') {
      for (let x = 0; x < offscreenWidth; x += 1) {
        const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * props.fuzzRange)
        ctx.drawImage(offscreen, x, 0, 1, tightHeight, x, dy, 1, tightHeight)
      }
    } else {
      for (let y = 0; y < tightHeight; y += 1) {
        const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * props.fuzzRange)
        ctx.drawImage(offscreen, 0, y, offscreenWidth, 1, dx, y, offscreenWidth, 1)
      }

      for (let x = 0; x < offscreenWidth; x += 1) {
        const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * props.fuzzRange * 0.5)
        ctx.drawImage(offscreen, x, 0, 1, tightHeight, x, dy, 1, tightHeight)
      }
    }

    animationFrameId = window.requestAnimationFrame(step)
  }

  animationFrameId = window.requestAnimationFrame(step)

  const isInsideTextArea = (x, y) => x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom

  const handleMouseMove = (event) => {
    if (!props.enableHover) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    isHovering = isInsideTextArea(x, y)
  }

  const handleMouseLeave = () => {
    isHovering = false
  }

  const handleClick = () => {
    if (!props.clickEffect) return
    isClicking = true
    window.clearTimeout(clickTimeoutId)
    clickTimeoutId = window.setTimeout(() => {
      isClicking = false
    }, 150)
  }

  const handleTouchMove = (event) => {
    if (!props.enableHover) return
    event.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const touch = event.touches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    isHovering = isInsideTextArea(x, y)
  }

  const handleTouchEnd = () => {
    isHovering = false
  }

  if (props.enableHover) {
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)
  }

  if (props.clickEffect) {
    canvas.addEventListener('click', handleClick)
  }

  canvas.cleanupFuzzyText = () => {
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
    if (glitchTimeoutId) window.clearTimeout(glitchTimeoutId)
    if (glitchEndTimeoutId) window.clearTimeout(glitchEndTimeoutId)
    if (clickTimeoutId) window.clearTimeout(clickTimeoutId)

    if (props.enableHover) {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }

    if (props.clickEffect) {
      canvas.removeEventListener('click', handleClick)
    }
  }
}

onMounted(() => {
  buildText()
})

onBeforeUnmount(() => {
  isCancelled = true
  if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
  if (glitchTimeoutId) window.clearTimeout(glitchTimeoutId)
  if (glitchEndTimeoutId) window.clearTimeout(glitchEndTimeoutId)
  if (clickTimeoutId) window.clearTimeout(clickTimeoutId)
  const canvas = canvasRef.value
  if (canvas && canvas.cleanupFuzzyText) canvas.cleanupFuzzyText()
})
</script>

<template>
  <canvas ref="canvasRef" class="fuzzy-text" aria-label="Decorative text" />
</template>

<style scoped>
.fuzzy-text {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  pointer-events: none;
}
</style>
