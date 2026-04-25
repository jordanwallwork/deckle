<script lang="ts">
  import type { DiceComponent } from '$lib/types';
  import { untrack } from 'svelte';

  let { component, currentValue }: { component: DiceComponent; currentValue?: number } = $props();

  type ColorInfo = { hex: string; textColor: string };

  const colorMap: Record<string, ColorInfo> = {
    EarthGreen:    { hex: '#3cb8b5', textColor: '#0c3534' },
    MarsRed:       { hex: '#e00022', textColor: '#ffffff' },
    MercuryGrey:   { hex: '#e5e1e6', textColor: '#1f1f1f' },
    NeptuneBlue:   { hex: '#1d50b8', textColor: '#ffffff' },
    SpaceBlack:    { hex: '#111820', textColor: '#f0f0f0' },
    SunYellow:     { hex: '#f4e834', textColor: '#2d2000' },
    EmeraldGreen:  { hex: '#34ab49', textColor: '#0d2d15' },
    JupiterOrange: { hex: '#ed8100', textColor: '#3d1f00' },
    NebularPurple: { hex: '#872a92', textColor: '#ffffff' },
    PlutoBrown:    { hex: '#8e4400', textColor: '#ffffff' },
    StarWhite:     { hex: '#ffffff', textColor: '#1f1f1f' }
  };

  const maxFacesMap: Record<string, number> = {
    D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20
  };

  // Pip positions for each D6 face value (100×100 viewBox)
  const d6PipLayouts: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]]
  };

  const colors = $derived(colorMap[component.baseColor] ?? { hex: '#e5e1e6', textColor: '#1f1f1f' });
  const maxFace = $derived(maxFacesMap[component.diceType] ?? 6);
  const isNumbered = $derived(component.style === 'Numbered');
  const isPips = $derived(component.style === 'Pips');

  // Animated display value — starts at default, animates when currentValue changes.
  let animatedValue: number = $state(0);
  let isRolling = $state(false);
  // Plain flag (not reactive) — suppresses animation on the initial render.
  let initialized = false;

  $effect(() => {
    const target = currentValue;
    // Capture maxFace without creating a dependency on component.diceType so
    // the effect only re-triggers when the rolled value actually changes.
    const localMax = untrack(() => maxFace);

    if (!initialized) {
      initialized = true;
      animatedValue = target ?? localMax;
      return;
    }

    if (target === undefined) return;

    isRolling = true;

    // 13 intermediate random frames with exponentially increasing delays,
    // then one final frame that settles on the actual result.
    const frameCount = 14;
    const startMs = 35;
    const endMs = 220;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    let elapsed = 0;
    for (let i = 0; i < frameCount - 1; i++) {
      const p = i / (frameCount - 2);
      elapsed += startMs + (endMs - startMs) * p * p;
      const fireAt = elapsed;
      timeouts.push(
        setTimeout(() => {
          animatedValue = Math.floor(Math.random() * localMax) + 1;
        }, fireAt)
      );
    }

    timeouts.push(
      setTimeout(() => {
        animatedValue = target;
        isRolling = false;
      }, elapsed + 20)
    );

    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  });

  const activePips = $derived(d6PipLayouts[animatedValue] ?? d6PipLayouts[6]);
</script>

<!--
  All shapes use a 100×100 viewBox and scale to fill the entity slot.
  D4 and D20 are both triangles; inner medians on D20 make them visually distinct.
  D10 uses a narrow kite; D12 uses a wider regular pentagon.
-->
<svg
  viewBox="0 0 100 100"
  width="100%"
  height="100%"
  xmlns="http://www.w3.org/2000/svg"
  class:rolling={isRolling}
>
  {#if component.diceType === 'D4'}
    <polygon
      points="50,6 95,91 5,91"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    {#if isNumbered || isPips}
      <text
        x="50" y="70"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="30"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}

  {:else if component.diceType === 'D6'}
    <rect x="7" y="7" width="86" height="86" rx="10" ry="10"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    {#if isPips}
      {#each activePips as [cx, cy]}
        <circle {cx} {cy} r="7" fill={colors.textColor} />
      {/each}
    {:else if isNumbered}
      <text
        x="50" y="54"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="42"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}

  {:else if component.diceType === 'D8'}
    <polygon
      points="50,5 95,50 50,95 5,50"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    {#if isNumbered || isPips}
      <text
        x="50" y="55"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="32"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}

  {:else if component.diceType === 'D10'}
    <!-- Narrow kite: pointed top, slight flat bottom — distinct from the wider D12 pentagon -->
    <polygon
      points="50,3 88,44 62,95 38,95 12,44"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    {#if isNumbered || isPips}
      <text
        x="50" y="60"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="30"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}

  {:else if component.diceType === 'D12'}
    <!-- Regular pentagon: wider and more symmetric than the D10 kite -->
    <polygon
      points="50,4 94,36 77,87 23,87 6,36"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    {#if isNumbered || isPips}
      <text
        x="50" y="58"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="30"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}

  {:else if component.diceType === 'D20'}
    <polygon
      points="50,6 95,91 5,91"
      fill={colors.hex}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="2"
    />
    <!-- Medians from each vertex to midpoint of opposite edge (classic d20 icon detail) -->
    <line x1="50" y1="6" x2="50" y2="91" stroke={colors.textColor} stroke-width="1.5" opacity="0.25" />
    <line x1="5" y1="91" x2="72.5" y2="48.5" stroke={colors.textColor} stroke-width="1.5" opacity="0.25" />
    <line x1="95" y1="91" x2="27.5" y2="48.5" stroke={colors.textColor} stroke-width="1.5" opacity="0.25" />
    {#if isNumbered || isPips}
      <text
        x="50" y="72"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="800" font-size="26"
        fill={colors.textColor}>{animatedValue}</text>
    {/if}
  {/if}
</svg>

<style>
  @keyframes dice-roll {
    0%   { transform: rotate(0deg)   scale(1);    }
    8%   { transform: rotate(-12deg) scale(1.1);  }
    22%  { transform: rotate(9deg)   scale(1.08); }
    38%  { transform: rotate(-6deg)  scale(1.05); }
    55%  { transform: rotate(4deg)   scale(1.03); }
    72%  { transform: rotate(-2deg)  scale(1.01); }
    88%  { transform: rotate(1deg)   scale(1.005); }
    100% { transform: rotate(0deg)   scale(1);    }
  }

  svg.rolling {
    animation: dice-roll 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: 50% 50%;
  }
</style>
