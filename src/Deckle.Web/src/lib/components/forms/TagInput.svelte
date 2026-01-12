<script lang="ts">
	import Badge from '../Badge.svelte';

	let {
		value = $bindable([]),
		suggestions = [],
		placeholder = 'Add tags...',
		maxTags
	}: {
		value: string[];
		suggestions?: string[];
		placeholder?: string;
		maxTags?: number;
	} = $props();

	let inputValue = $state('');
	let showSuggestions = $state(false);
	let selectedSuggestionIndex = $state(-1);

	// Filter suggestions based on input value and exclude already selected tags
	let filteredSuggestions = $derived(
		inputValue.trim()
			? suggestions.filter(
					(s) =>
						s.toLowerCase().includes(inputValue.toLowerCase()) &&
						!value.map((v) => v.toLowerCase()).includes(s.toLowerCase())
				)
			: []
	);

	function addTag(tag: string) {
		const trimmed = tag.trim();
		if (!trimmed) return;
		if (maxTags && value.length >= maxTags) return;

		// Check for duplicate (case-insensitive)
		if (!value.map((v) => v.toLowerCase()).includes(trimmed.toLowerCase())) {
			value = [...value, trimmed];
		}

		inputValue = '';
		selectedSuggestionIndex = -1;
		showSuggestions = false;
	}

	function removeTag(index: number) {
		value = value.filter((_, i) => i !== index);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();

			if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
				addTag(filteredSuggestions[selectedSuggestionIndex]);
			} else if (inputValue.trim()) {
				addTag(inputValue);
			}
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			// Remove last tag when backspace is pressed on empty input
			removeTag(value.length - 1);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filteredSuggestions.length > 0) {
				selectedSuggestionIndex = Math.min(
					selectedSuggestionIndex + 1,
					filteredSuggestions.length - 1
				);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedSuggestionIndex = -1;
		}
	}

	function handleFocus() {
		if (filteredSuggestions.length > 0) {
			showSuggestions = true;
		}
	}

	function handleBlur() {
		// Delay hiding suggestions to allow clicking on them
		setTimeout(() => {
			showSuggestions = false;
			selectedSuggestionIndex = -1;
		}, 200);
	}

	function handleInput() {
		showSuggestions = filteredSuggestions.length > 0;
		selectedSuggestionIndex = -1;
	}
</script>

<div class="tag-input-container">
	<div class="tags-input">
		{#each value as tag, i}
			<Badge variant="primary" size="sm">
				{tag}
				<button
					type="button"
					class="remove-tag"
					onclick={() => removeTag(i)}
					aria-label={`Remove ${tag}`}
				>
					×
				</button>
			</Badge>
		{/each}
		<input
			type="text"
			bind:value={inputValue}
			{placeholder}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			oninput={handleInput}
			class="tag-input-field"
		/>
	</div>

	{#if showSuggestions && filteredSuggestions.length > 0}
		<div class="suggestions-dropdown">
			{#each filteredSuggestions as suggestion, i}
				<button
					type="button"
					class="suggestion-item"
					class:selected={i === selectedSuggestionIndex}
					onclick={() => addTag(suggestion)}
				>
					{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tag-input-container {
		position: relative;
		width: 100%;
	}

	.tags-input {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		min-height: 2.125rem;
		background-color: white;
	}

	.tags-input:focus-within {
		border-color: #0066cc;
		outline: none;
	}

	.tag-input-field {
		flex: 1;
		border: none;
		outline: none;
		min-width: 120px;
		font-size: 0.813rem;
		line-height: 1.25rem;
		padding: 0;
		background: transparent;
	}

	.remove-tag {
		margin-left: 0.25rem;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0;
		color: currentColor;
		opacity: 0.7;
	}

	.remove-tag:hover {
		opacity: 1;
	}

	.suggestions-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.suggestion-item {
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		font-size: 0.813rem;
		transition: background-color 0.1s;
	}

	.suggestion-item:hover,
	.suggestion-item.selected {
		background-color: #f3f4f6;
	}
</style>
