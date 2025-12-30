# ErrorDisplay Component - Usage Examples

The `ErrorDisplay` component provides game-themed error messages that make error handling more engaging while maintaining technical details for debugging.

## Features

- **Randomized Flavor Text**: Each HTTP status code has multiple themed messages
- **Game-Themed Titles**: Error titles use board game terminology
- **Technical Details**: Collapsible section with actual error information
- **Consistent Styling**: Matches the application's error message design

## Basic Usage

### With ApiError Object

```svelte
<script lang="ts">
  import { ErrorDisplay } from '$lib/components';
  import { ApiError } from '$lib/api';

  let error = $state<ApiError | null>(null);

  async function someAction() {
    try {
      await apiCall();
    } catch (err) {
      if (err instanceof ApiError) {
        error = err;
      }
    }
  }
</script>

<ErrorDisplay error={error} />
```

### With String Message

```svelte
<script lang="ts">
  import { ErrorDisplay } from '$lib/components';

  let errorMessage = $state<string | null>(null);

  async function someAction() {
    try {
      await apiCall();
    } catch (err) {
      errorMessage = "Something went wrong";
    }
  }
</script>

<!-- Default to 500 status code for string errors -->
<ErrorDisplay error={errorMessage} />

<!-- Or specify a custom status code -->
<ErrorDisplay error={errorMessage} statusCode={404} />
```

### Hide Technical Details

```svelte
<ErrorDisplay error={error} showTechnical={false} />
```

## Example: Form Dialog

Here's how to integrate ErrorDisplay in a form dialog (like the Create Project dialog):

```svelte
<script lang="ts">
  import { Dialog, ErrorDisplay } from '$lib/components';
  import { FormField, Input } from '$lib/components/forms';
  import { ApiError, projectsApi } from '$lib/api';

  let showDialog = $state(false);
  let formError = $state<ApiError | null>(null);
  let name = $state("");

  async function handleSubmit() {
    formError = null;  // Clear previous errors

    try {
      await projectsApi.create({ name });
      showDialog = false;
    } catch (err) {
      if (err instanceof ApiError) {
        formError = err;
      } else {
        formError = new ApiError(500, "Unexpected error occurred");
      }
    }
  }

  function closeDialog() {
    showDialog = false;
    name = "";
    formError = null;  // Clear errors when closing
  }
</script>

<Dialog bind:show={showDialog} title="Create Project" onclose={closeDialog}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <FormField label="Name" name="name" required>
      <Input bind:value={name} required />
    </FormField>

    <!-- Error display inside form -->
    <ErrorDisplay error={formError} />
  </form>

  {#snippet actions()}
    <Button variant="secondary" onclick={closeDialog}>Cancel</Button>
    <Button variant="primary" onclick={handleSubmit}>Create</Button>
  {/snippet}
</Dialog>
```

## Example: Page-Level Errors

```svelte
<script lang="ts">
  import { ErrorDisplay } from '$lib/components';
  import { ApiError } from '$lib/api';

  let pageError = $state<ApiError | null>(null);

  async function loadData() {
    try {
      const data = await fetchData();
      return data;
    } catch (err) {
      if (err instanceof ApiError) {
        pageError = err;
      } else {
        pageError = new ApiError(500, "Failed to load data");
      }
    }
  }
</script>

{#if pageError}
  <ErrorDisplay error={pageError} />
{:else}
  <!-- Your page content -->
{/if}
```

## Available Error Themes

### 404 - Not Found
- "Missing Component"
- "Fog of War"
- "Empty Hex"
- "The Rulebook is Silent"

### 400 - Bad Request
- "Illegal Move"
- "Invalid Play"
- "Table Talk"

### 401/403 - Unauthorized/Forbidden
- "Restricted Area"
- "Roll for Charisma"
- "Access Denied"

### 500-5xx - Server Errors
- "Table Flip!"
- "Analysis Paralysis"
- "Critical Fail"
- "Broken Connection"
- "Gateway Gridlock"
- "Game Paused"
- "Turn Timer Expired"

### Fallback (Unknown Errors)
- "Unexpected Event"
- "House Rule Needed"
- "Random Encounter"

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `ApiError \| string \| null \| undefined` | - | The error to display |
| `statusCode` | `number` | `500` | Status code when error is a string |
| `showTechnical` | `boolean` | `true` | Whether to show technical details section |

## Migration from Old Error Handling

### Before (using alert):
```svelte
try {
  await apiCall();
} catch (error) {
  if (error instanceof ApiError) {
    alert(`Failed: ${error.message}`);
  }
}
```

### After (using ErrorDisplay):
```svelte
<script lang="ts">
  let error = $state<ApiError | null>(null);

  async function handleAction() {
    error = null;
    try {
      await apiCall();
    } catch (err) {
      if (err instanceof ApiError) {
        error = err;
      }
    }
  }
</script>

<ErrorDisplay error={error} />
```

### Before (using error-message div):
```svelte
{#if errorMessage}
  <p class="error-message">{errorMessage}</p>
{/if}
```

### After:
```svelte
<ErrorDisplay error={errorMessage} statusCode={400} />
```

## Styling

The component uses the same color scheme as the existing error messages:
- Background: Light red (`#ffebee`)
- Border: Red (`#ef9a9a`)
- Title: Dark red (`#c62828`)
- Flavor Text: Red, italic (`#d32f2f`)
- Technical Details: Gray, monospace

You can override styles by targeting the component's CSS classes if needed.
