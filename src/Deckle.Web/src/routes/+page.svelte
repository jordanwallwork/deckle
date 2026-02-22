<script lang="ts">
  import { config } from '$lib/config';
  import { Button } from '$lib/components';

  function handleSignIn(): void {
    window.location.href = `${config.apiUrl}/auth/login`;
  }
</script>

<svelte:head>
  <title>Deckle - Effortless Game Design</title>
  <meta
    name="description"
    content="Create game components from spreadsheets in minutes. Deckle is a tool for designing cards, tokens, and game pieces for playtesting."
  />
</svelte:head>

<div class="container">
  <main>
    <h1>Deckle</h1>
    <p class="subtitle">Effortless game design - From spreadsheet to playtest in minutes</p>
    <Button size="lg" onclick={handleSignIn}>Sign In with Google</Button>
  </main>
</div>

<style>
  .container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  main {
    text-align: center;
    max-width: 600px;
    min-height: 0;
  }

  h1 {
    font-size: 4rem;
    font-weight: 700;
    color: var(--color-sage);
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-muted-teal);
    margin-bottom: 3rem;
    line-height: 1.6;
  }
</style>
