<script>
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
</script>

<svelte:head>
  <title>Privacy Policy - Deckle</title>
  <meta
    name="description"
    content="Privacy policy for Deckle, an open source game component design tool."
  />
</svelte:head>

<PageHeader>
  <h1>Privacy Policy</h1>
</PageHeader>

<article class="privacy-policy">
  <p class="effective-date">Effective date: 27 January 2026</p>

  <p>
    Deckle ("we", "us", "our") is operated by Jordan Wallwork, a private individual. This privacy
    policy explains how we collect, use, and protect your personal information when you use the
    Deckle web application at deckle.games.
  </p>
  <p>
    By using Deckle, you agree to the collection and use of information as described in this policy.
  </p>

  <h2>1. Information We Collect</h2>

  <h3>1.1 Account Information</h3>
  <p>
    When you sign in to Deckle using a third-party authentication provider (such as Google), we
    receive and store the following information:
  </p>
  <ul>
    <li>Your name</li>
    <li>Your email address</li>
  </ul>
  <p>
    We do not collect or store passwords. Authentication is handled entirely by third-party OAuth
    providers.
  </p>

  <h3>1.2 User-Generated Content</h3>
  <p>
    You may upload image files for use in your game component designs. These images are stored in
    Cloudflare R2 object storage.
  </p>
  <p>
    You may also create project data, component designs, and other content as part of using the
    service. This data is stored in our database.
  </p>

  <h3>1.3 Analytics Data</h3>
  <p>
    We use PostHog for analytics in a <strong>cookieless, anonymised</strong> configuration. This means:
  </p>
  <ul>
    <li>No cookies are placed on your device for analytics purposes</li>
    <li>No personally identifiable information is collected through analytics</li>
    <li>Analytics data is processed in the EU</li>
  </ul>

  <h3>1.4 Information We Do Not Collect</h3>
  <p>We do not currently collect:</p>
  <ul>
    <li>Payment or billing information</li>
    <li>IP addresses or device fingerprints</li>
    <li>Browsing activity outside of Deckle</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <p>We use the information we collect for the following purposes:</p>
  <ul>
    <li>
      <strong>Providing the service</strong> &mdash; to authenticate your account, store your projects,
      and deliver the functionality of Deckle
    </li>
    <li>
      <strong>Improving the product</strong> &mdash; to understand how the service is used (via anonymised
      analytics) and to fix bugs
    </li>
  </ul>
  <p>We do not use your information for marketing, advertising, or profiling purposes.</p>

  <h2>3. Data Sharing</h2>
  <p>
    We do not sell, rent, or share your personal information with third parties for their own
    purposes. Your data is only processed by the following service providers as necessary to operate
    Deckle:
  </p>
  <ul>
    <li><strong>Google</strong> &mdash; authentication provider (OAuth sign-in)</li>
    <li>
      <strong>Railway</strong> &mdash; database hosting (PostgreSQL, EU West &mdash; Amsterdam, Netherlands)
    </li>
    <li><strong>Cloudflare R2</strong> &mdash; image file storage</li>
    <li><strong>PostHog</strong> &mdash; anonymised, cookieless analytics (EU hosted)</li>
    <li><strong>Exceptionless</strong> &mdash; error logging and monitoring</li>
  </ul>

  <h2>4. Data Storage and Security</h2>
  <p>
    Your data is stored in a PostgreSQL database hosted by Railway in <strong
      >EU West (Amsterdam, Netherlands)</strong
    >. Uploaded images are stored in Cloudflare R2.
  </p>
  <p>All data transmitted between your browser and our servers is encrypted using HTTPS (TLS).</p>
  <p>
    While we take reasonable measures to protect your data, no method of electronic transmission or
    storage is 100% secure. We cannot guarantee absolute security.
  </p>

  <h2>5. Data Retention</h2>
  <p>
    We retain your personal data for as long as your account is active and you continue to use the
    service.
  </p>
  <p>
    If you request deletion of your account, we will delete your personal data and associated
    content within 30 days of the request. Some data may be retained in backups for up to 90 days
    before being permanently removed.
  </p>

  <h2>6. Your Rights</h2>
  <p>Depending on your location, you may have the following rights regarding your personal data:</p>
  <ul>
    <li><strong>Access</strong> &mdash; request a copy of the personal data we hold about you</li>
    <li><strong>Rectification</strong> &mdash; request correction of inaccurate personal data</li>
    <li><strong>Erasure</strong> &mdash; request deletion of your personal data</li>
    <li>
      <strong>Data portability</strong> &mdash; request a copy of your data in a portable format
    </li>
    <li><strong>Objection</strong> &mdash; object to processing of your personal data</li>
  </ul>
  <p>
    To exercise any of these rights, please contact us at
    <a href="mailto:privacy-enquiries@deckle.games">privacy-enquiries@deckle.games</a>. We will
    respond to your request within 30 days.
  </p>

  <h2>7. Children's Privacy</h2>
  <p>
    Deckle does not impose age restrictions on its users. However, we do not knowingly collect
    personal information from children under the age of 13. If you are a parent or guardian and
    believe your child has provided us with personal information, please contact us at
    <a href="mailto:privacy-enquiries@deckle.games">privacy-enquiries@deckle.games</a>
    and we will take steps to delete such information.
  </p>

  <h2>8. Cookies</h2>
  <p>
    Deckle does not use cookies for analytics or tracking. We may use essential cookies strictly
    necessary for the operation of the service (such as session authentication). These cookies are
    not used to track you across websites.
  </p>

  <h2>9. International Data Transfers</h2>
  <p>
    Our primary data storage is located in the EU (Amsterdam, Netherlands). If you access Deckle
    from outside the EU, your data will be transferred to and processed in the EU.
  </p>
  <p>
    Some of our service providers (such as Cloudflare) may process data in locations outside the EU.
    Where this occurs, appropriate safeguards are in place to protect your data in accordance with
    applicable data protection laws.
  </p>

  <h2>10. Changes to This Policy</h2>
  <p>
    We may update this privacy policy from time to time. If we make material changes, we will notify
    users through the Deckle application or by email.
  </p>
  <p>The "Effective date" at the top of this page indicates when this policy was last updated.</p>

  <h2>11. Contact Us</h2>
  <p>If you have any questions about this privacy policy or our data practices, contact us at:</p>
  <p>
    <a href="mailto:privacy-enquiries@deckle.games">privacy-enquiries@deckle.games</a>
  </p>
</article>

<style>
  article {
    padding: var(--pad-content);
  }

  .effective-date {
    color: var(--color-muted-teal);
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }

  a {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }

  a:hover {
    color: var(--color-sage);
  }
</style>
