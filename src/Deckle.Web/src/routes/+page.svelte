<script lang="ts">
  import { config } from '$lib/config';

  function handleSignIn() {
    window.location.href = `${config.apiUrl}/auth/login`;
  }
</script>

<div class="container">
  <main>
    <h1>Deckle</h1>
    <p class="subtitle">Open source game component design - From spreadsheet to playtest in minutes</p>
    <button class="google-signin" onclick={handleSignIn}>Sign In with Google</button>
  </main>
</div>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }

  main {
    text-align: center;
    max-width: 600px;
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

  .google-signin {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
    border: 2px solid var(--color-muted-teal);
    padding: 1rem 2.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-signin:hover {
    background-color: var(--color-muted-teal);
    border-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.2);
  }

  .google-signin:active {
    transform: translateY(0);
  }
</style>
