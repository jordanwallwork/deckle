<script lang="ts">
	import { getContext } from 'svelte';
	import { templateStore } from '$lib/stores/templateElements';
	import type { BaseElement } from '$lib/components/editor/types';

	let { element }: { element: BaseElement } = $props();

	let isRotating = $state(false);
	let startAngle = 0;
	let initialRotation = 0;
	let elementCenter = { x: 0, y: 0 };

	// Get zoom scale from context (provided by ComponentViewer)
	const zoomContext = getContext<{ getScale: () => number }>('zoomScale');
	const getZoomScale = () => zoomContext?.getScale() ?? 1;

	// Calculate inverse scale for handle sizing (so handles stay constant size on screen)
	let inverseScale = $derived(1 / getZoomScale());

	// Get panzoom instance from context to disable/enable panning
	const panzoomContext = getContext<{ getInstance: () => any }>('panzoom');
	const getPanzoom = () => panzoomContext?.getInstance();

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		// Get the element's bounding rect to find its center
		const elementDiv = (e.currentTarget as HTMLElement).closest('[data-element-id]') as HTMLElement;
		if (!elementDiv) return;

		const rect = elementDiv.getBoundingClientRect();
		elementCenter = {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		};

		// Calculate initial angle from center to mouse position
		const dx = e.clientX - elementCenter.x;
		const dy = e.clientY - elementCenter.y;
		startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
		initialRotation = element.rotation ?? 0;

		isRotating = true;

		// Disable panning during rotation
		const panzoom = getPanzoom();
		if (panzoom) {
			panzoom.setOptions({ disablePan: true });
		}

		// Save current state to history before starting rotation
		templateStore.saveToHistory();

		// Add global mouse event listeners
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isRotating) return;

		// Calculate current angle from center to mouse position
		const dx = e.clientX - elementCenter.x;
		const dy = e.clientY - elementCenter.y;
		const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

		// Calculate angle difference
		let angleDelta = currentAngle - startAngle;

		// Calculate new rotation
		let newRotation = initialRotation + angleDelta;

		// Normalize to -360 to 360 range
		while (newRotation > 360) newRotation -= 360;
		while (newRotation < -360) newRotation += 360;

		// Update element without adding to history (for smooth rotation)
		templateStore.updateElementWithoutHistory(element.id, {
			rotation: Math.round(newRotation)
		});
	}

	function handleMouseUp() {
		isRotating = false;

		// Re-enable panning
		const panzoom = getPanzoom();
		if (panzoom) {
			panzoom.setOptions({ disablePan: false });
		}

		// Remove global mouse event listeners
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<!-- Rotation handle positioned at the top center -->
<div
	class="rotation-handle panzoom-exclude"
	class:rotating={isRotating}
	onmousedown={handleMouseDown}
	role="button"
	tabindex="-1"
	title="Drag to rotate"
	style="--inverse-scale: {inverseScale}"
>
	<svg width="20" height="20" viewBox="0 0 20 20" class="rotation-icon">
		<circle cx="10" cy="10" r="8" fill="white" stroke="#0066cc" stroke-width="2" />
		<path
			d="M10 4 L10 7 M10 4 L7 6 M10 4 L13 6"
			stroke="#0066cc"
			stroke-width="1.5"
			fill="none"
			stroke-linecap="round"
		/>
	</svg>
</div>

<style>
	.rotation-handle {
		position: absolute;
		top: calc(-40px * var(--inverse-scale));
		left: 50%;
		transform: translateX(-50%) scale(var(--inverse-scale));
		width: 20px;
		height: 20px;
		cursor: grab;
		pointer-events: all;
		z-index: 1000;
		touch-action: none;
		user-select: none;
	}

	.rotation-handle:hover {
		transform: translateX(-50%) scale(calc(var(--inverse-scale) * 1.2));
	}

	.rotation-handle.rotating {
		cursor: grabbing;
		transform: translateX(-50%) scale(calc(var(--inverse-scale) * 1.2));
	}

	.rotation-icon {
		display: block;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
	}
</style>
