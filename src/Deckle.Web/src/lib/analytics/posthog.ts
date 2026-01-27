import posthog from 'posthog-js';
import { browser } from '$app/environment';

let initialized = false;

/**
 * Initialize PostHog with cookieless EU configuration.
 * Uses memory-only persistence for GDPR compliance.
 */
export function initPostHog(apiKey: string | undefined): void {
	if (!browser || initialized || !apiKey) {
		return;
	}

	posthog.init(apiKey, {
		api_host: 'https://eu.i.posthog.com',
		ui_host: 'https://eu.posthog.com',
		// Cookieless configuration for GDPR compliance
		persistence: 'memory',
		// Disable automatic capture of personal data
		autocapture: true,
		capture_pageview: true,
		capture_pageleave: true,
		// Disable session recording by default
		disable_session_recording: true,
		// Don't store anything in cookies or localStorage
		disable_persistence: false,
		// Respect Do Not Track
		respect_dnt: true,
		// Mask all text and inputs in session recordings if ever enabled
		session_recording: {
			maskAllInputs: true,
			maskTextSelector: '*'
		}
	});

	initialized = true;
}

/**
 * Identify a user (call after login).
 * Uses memory-only storage so identification only lasts for the session.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
	if (!browser || !initialized) {
		return;
	}

	posthog.identify(userId, properties);
}

/**
 * Reset user identification (call after logout).
 */
export function resetUser(): void {
	if (!browser || !initialized) {
		return;
	}

	posthog.reset();
}

/**
 * Capture a custom event.
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
	if (!browser || !initialized) {
		return;
	}

	posthog.capture(eventName, properties);
}

export { posthog };
