<script setup>
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  color: { type: Array, default: () => [1, 1, 1] },
  speed: { type: Number, default: 1 },
  amplitude: { type: Number, default: 0.1 },
  mouseReact: { type: Boolean, default: true },
})

const container = ref(null)

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`

let renderer
let program
let animationFrame
let mousePosition

function resize() {
  if (!container.value || !renderer || !program) return
  const { width, height } = container.value.getBoundingClientRect()
  renderer.setSize(width, height)
  program.uniforms.uResolution.value.set([renderer.gl.canvas.width, renderer.gl.canvas.height, renderer.gl.canvas.width / renderer.gl.canvas.height])
}

function handlePointerMove(event) {
  if (!program || !mousePosition) return
  mousePosition[0] = event.clientX / window.innerWidth
  mousePosition[1] = 1 - event.clientY / window.innerHeight
}

function render(time) {
  if (!renderer || !program) return
  program.uniforms.uTime.value = time * 0.001
  program.uniforms.uMouse.value.set(mousePosition)
  renderer.render({ scene: renderer.mesh })
  animationFrame = requestAnimationFrame(render)
}

onMounted(() => {
  const oglRenderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2) })
  renderer = oglRenderer
  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)
  mousePosition = new Float32Array([0.5, 0.5])

  program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(...props.color) },
      uResolution: { value: new Float32Array([1, 1, 1]) },
      uMouse: { value: mousePosition },
      uAmplitude: { value: props.amplitude },
      uSpeed: { value: props.speed },
    },
  })

  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
  renderer.mesh = mesh
  container.value.appendChild(gl.canvas)
  resize()
  window.addEventListener('resize', resize)
  if (props.mouseReact) window.addEventListener('pointermove', handlePointerMove)
  animationFrame = requestAnimationFrame(render)
})

watch(() => props.color, (color) => {
  if (program) program.uniforms.uColor.value = new Color(...color)
}, { deep: true })

watch(() => props.speed, (speed) => {
  if (program) program.uniforms.uSpeed.value = speed
})

watch(() => props.amplitude, (amplitude) => {
  if (program) program.uniforms.uAmplitude.value = amplitude
})

watch(() => props.mouseReact, (enabled) => {
  if (enabled) window.addEventListener('pointermove', handlePointerMove)
  else window.removeEventListener('pointermove', handlePointerMove)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)
  renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext()
})
</script>

<template>
  <div ref="container" class="iridescence-container" aria-hidden="true" />
</template>

<style scoped>
.iridescence-container {
  position: fixed;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.72;
}

.iridescence-container canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>