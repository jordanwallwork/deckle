<div class="read-only-banner">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
  <span>Read-only mode: You have view-only access to this component</span>
</div>

<style>
  .read-only-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: #fff3cd;
    border-bottom: 1px solid #ffc107;
    color: #856404;
    font-size: 0.875rem;
    font-weight: 500;
    flex: 0 0 auto;
  }

  .read-only-banner svg {
    flex-shrink: 0;
  }
</style>
