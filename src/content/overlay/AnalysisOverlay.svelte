<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { analysisStore } from '../store/AnalysisStore';
  import { fade } from 'svelte/transition';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let rafId: number;

  let isVisible = false;
  let audioData: any = null;
  let visualData: any = null;
  let fps = 0;

  // Unsubscribe functions
  const unsubs: (() => void)[] = [];

  onMount(() => {
    unsubs.push(
      analysisStore.isVisible.subscribe(v => isVisible = v),
      analysisStore.audioData.subscribe(d => audioData = d),
      analysisStore.visualData.subscribe(d => visualData = d),
      analysisStore.fps.subscribe(f => fps = f)
    );

    if (canvas) {
      ctx = canvas.getContext('2d');
      startLoop();
    }
  });

  onDestroy(() => {
    unsubs.forEach(u => u());
    cancelAnimationFrame(rafId);
  });

  function startLoop() {
    function loop() {
      if (isVisible && ctx && canvas) {
        draw();
      }
      rafId = requestAnimationFrame(loop);
    }
    loop();
  }

  function draw() {
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Audio Spectrum (FFT)
    if (audioData && audioData.frequencyData) {
      const { frequencyData, binCount } = audioData;
      const barWidth = canvas.width / binCount * 2.5;
      let x = 0;

      for (let i = 0; i < binCount; i++) {
        const barHeight = (frequencyData[i] / 255) * (canvas.height / 2);

        // Gradient color based on intensity
        const hue = (i / binCount) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    }

    // Draw Visual Analysis (Color Bars)
    if (visualData) {
      const barHeight = 20;
      const metrics = [
        { label: 'Red (Blood)', value: visualData.brightRed, color: '#ff0000' },
        { label: 'Y/B (Vomit)', value: visualData.yellowBrown, color: '#bfa100' },
        { label: 'G/Y (Vomit)', value: visualData.greenishYellow, color: '#808000' },
        { label: 'Fire', value: visualData.orangeYellow, color: '#ff8c00' },
        { label: 'Dark', value: visualData.darkPixels, color: '#333333' }
      ];

      let y = 10;
      ctx.font = '10px monospace';

      metrics.forEach(metric => {
        const width = metric.value * 200; // Scale to 200px max

        // Label
        ctx!.fillStyle = '#ffffff';
        ctx!.fillText(metric.label, 10, y + 14);

        // Bar Background
        ctx!.fillStyle = 'rgba(255,255,255,0.2)';
        ctx!.fillRect(80, y, 200, barHeight);

        // Bar Value
        ctx!.fillStyle = metric.color;
        ctx!.fillRect(80, y, width, barHeight);

        // Percentage text
        ctx!.fillStyle = '#ffffff';
        ctx!.fillText(`${(metric.value * 100).toFixed(1)}%`, 290, y + 14);

        y += 25;
      });

      // Draw Irregularity & Chunkiness
      y += 10;
      ctx!.fillStyle = '#ffffff';
      ctx!.fillText(`Irregularity: ${(visualData.irregularity * 100).toFixed(1)}%`, 10, y + 14);
      y += 20;
      ctx!.fillText(`Chunkiness: ${(visualData.chunkiness * 100).toFixed(1)}%`, 10, y + 14);
    }
  }

  function closeOverlay() {
    analysisStore.isVisible.set(false);
  }
</script>

{#if isVisible}
  <div class="analysis-overlay" transition:fade>
    <div class="header">
      <h3>Algorithm Inspector</h3>
      <button class="close-btn" on:click={closeOverlay}>×</button>
    </div>
    <canvas bind:this={canvas} width="350" height="300"></canvas>
    <div class="status">
      FPS: {fps}
    </div>
  </div>
{/if}

<style>
  .analysis-overlay {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 16px;
    z-index: 9999999;
    color: white;
    font-family: monospace;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    color: #00f2fe;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    opacity: 0.7;
  }

  .close-btn:hover {
    opacity: 1;
  }

  canvas {
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status {
    margin-top: 8px;
    font-size: 10px;
    opacity: 0.7;
    text-align: right;
  }
</style>
