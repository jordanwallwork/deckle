<script lang="ts">
	import {
		Button,
		Dialog,
		ComponentTypeSelector,
		CardConfigForm,
		DiceConfigForm,
		PlayerMatConfigForm
	} from '$lib/components';
	import type { GameComponent, CardComponent, PlayerMatComponent } from '$lib/types';
	import { ComponentDialogState } from './CreateEditComponentDialog.svelte.ts';
	import ComponentPreview from './ComponentPreview.svelte';

	let {
		show = $bindable(false),
		projectId,
		editComponent = null,
		onsaved
	}: {
		show: boolean;
		projectId: string;
		editComponent: GameComponent | null;
		onsaved: () => void;
	} = $props();

	const state = new ComponentDialogState();

	$effect(() => {
		if (show) {
			if (editComponent) {
				state.initForEdit(editComponent);
			} else {
				state.reset();
			}
		}
	});

	function closeDialog() {
		show = false;
	}
</script>

<Dialog
	bind:show
	title={editComponent ? 'Edit Component' : 'New Component'}
	maxWidth={state.showPreview ? '900px' : '600px'}
	onclose={closeDialog}
>
	{#if !state.selectedType}
		<ComponentTypeSelector onSelectType={(type) => state.selectType(type)} />
	{:else}
		<div class={state.showPreview ? 'dialog-body-with-preview' : ''}>
			<div class={state.showPreview ? 'form-column' : ''}>
				{#if !editComponent}
					<Button variant="text" onclick={() => (state.selectedType = null)}>
						← Back to component types
					</Button>
				{/if}

				{#if state.selectedType === 'card'}
					<CardConfigForm
						bind:cardSize={state.cardSize}
						bind:cardHorizontal={state.cardHorizontal}
						bind:componentName={state.componentName}
						samples={state.samples as CardComponent[]}
						bind:selectedSampleId={state.selectedSampleId}
					/>
				{:else if state.selectedType === 'dice'}
					<DiceConfigForm
						bind:diceType={state.diceType}
						bind:diceStyle={state.diceStyle}
						bind:diceColor={state.diceColor}
						bind:componentName={state.componentName}
						bind:diceNumber={state.diceNumber}
					/>
				{:else if state.selectedType === 'playermat'}
					<PlayerMatConfigForm
						bind:componentName={state.componentName}
						bind:sizeMode={state.playerMatSizeMode}
						bind:presetSize={state.playerMatPresetSize}
						bind:horizontal={state.playerMatHorizontal}
						bind:customWidthMm={state.playerMatCustomWidth}
						bind:customHeightMm={state.playerMatCustomHeight}
						samples={state.samples as PlayerMatComponent[]}
						bind:selectedSampleId={state.selectedSampleId}
					/>
				{/if}

				{#if state.errorMessage}
					<p class="error-message">{state.errorMessage}</p>
				{/if}
			</div>

			{#if state.showPreview && state.previewDimensions}
				<ComponentPreview
					selectedType={state.selectedType}
					previewDesign={state.previewDesign}
					previewDimensions={state.previewDimensions}
					previewShape={state.previewShape}
				/>
			{/if}
		</div>
	{/if}

	{#snippet actions()}
		{#if state.selectedType}
			<Button variant="secondary" onclick={closeDialog} disabled={state.isSubmitting}>
				Cancel
			</Button>
			<Button
				variant="primary"
				onclick={() => state.handleSubmit(projectId, editComponent, onsaved, closeDialog)}
				disabled={state.isSubmitting}
			>
				{#if state.isSubmitting}
					{editComponent ? 'Updating...' : 'Adding...'}
				{:else}
					{editComponent ? 'Update Component' : 'Add Component'}
				{/if}
			</Button>
		{/if}
	{/snippet}
</Dialog>

<style>
	.error-message {
		color: #d32f2f;
		font-size: 0.875rem;
		margin: 1rem 0 0 0;
		padding: 0.75rem;
		background-color: #ffebee;
		border-radius: 8px;
		border: 1px solid #ef9a9a;
	}

	.dialog-body-with-preview {
		display: flex;
		gap: 1.5rem;
	}

	.form-column {
		flex: 1;
		min-width: 0;
	}
</style>
