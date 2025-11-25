<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<nav class="top-nav">
  <div class="nav-content">
    <a href="/" class="logo-link">
      <svg
        class="logomark"
        viewBox="20 20 88 88"
        width="24"
        height="24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="var(--color-sage)"
          stroke="var(--color-sage)"
          stroke-width="9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M24,60 V92 C28,96 32,88 36,92 C40,96 44,88 48,92 C52,96 56,88 60,92 C64,96 68,88 72,92 V60 H24 Z"
          />

          <path
            d="M44,44 V76 C48,78 54,74 60,76 C66,78 72,74 78,76 C84,78 88,74 92,76 V44 H44 Z"
            style="filter: brightness(120%)"
          />

          <rect
            x="28"
            y="28"
            width="48"
            height="32"
            rx="6"
            ry="6"
            style="filter: brightness(140%)"
          />
        </g>
      </svg>
      <span class="brand-name">Deckle</span>
    </a>
  </div>
</nav>

<main class="main-content">
  {@render children()}
</main>

<style>
  .top-nav {
    background-color: var(--color-teal-grey);
    border-bottom: 1px solid var(--color-muted-teal);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--color-sage);
    transition: opacity 0.2s ease;
  }

  .logo-link:hover {
    opacity: 0.8;
  }

  .logomark {
    display: block;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .main-content {
    min-height: calc(100vh - 57px);
  }
</style>
