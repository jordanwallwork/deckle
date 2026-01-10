import type { BaseElement, Shadow } from './types';
import { mmToPx } from '$lib/utils/size.utils';

export function getElementLabel(el: BaseElement): string {
	// Use custom label if available
	if (el.label) {
		return el.label;
	}

	// Otherwise use default label
	if (el.type === 'text') {
		return el.content.substring(0, 20) + (el.content.length > 20 ? '...' : '');
	}
	return el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

/**
 * Converts a dimension value to CSS string.
 * Handles undefined, numbers, and strings (including mm units).
 * The undefined check is included, so callers can pass optional values directly.
 */
export function dimensionValue(
	value: number | string | undefined,
	dpi?: number
): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'number') return `${value}px`;

	// Handle mm unit - convert to px
	if (typeof value === 'string' && value.includes('mm') && dpi !== undefined) {
		const numericValue = parseFloat(value);
		if (!isNaN(numericValue)) {
			return `${mmToPx(numericValue, dpi)}px`;
		}
	}

	return value;
}

/**
 * Converts spacing object to CSS string.
 * Handles undefined, so callers can pass optional spacing objects directly.
 */
export function spacingToCss(
	spacing:
		| {
				all?: number | string;
				top?: number | string;
				right?: number | string;
				bottom?: number | string;
				left?: number | string;
		  }
		| undefined,
	dpi?: number
): string | undefined {
	if (!spacing) return undefined;

	// If 'all' is defined, use it for all sides
	if (spacing.all !== undefined) {
		return dimensionValue(spacing.all, dpi);
	}

	// Otherwise use individual sides
	const top = dimensionValue(spacing.top ?? 0, dpi) ?? 'auto';
	const right = dimensionValue(spacing.right ?? 0, dpi) ?? 'auto';
	const bottom = dimensionValue(spacing.bottom ?? 0, dpi) ?? 'auto';
	const left = dimensionValue(spacing.left ?? 0, dpi) ?? 'auto';
	return `${top} ${right} ${bottom} ${left}`;
}

/**
 * Builds border CSS string (complex property).
 * Handles undefined, so callers can pass optional border objects directly.
 */
export function borderStyle(border: any | undefined, dpi?: number): string | undefined {
	if (!border) return undefined;

	const styles: string[] = [];

	// Check if individual sides are defined
	const hasIndividualSides = border.top || border.right || border.bottom || border.left;

	if (hasIndividualSides) {
		// Use individual side properties
		const sides = ['top', 'right', 'bottom', 'left'] as const;
		for (const side of sides) {
			const sideProps = border[side];
			if (sideProps) {
				const width = dimensionValue(sideProps.width, dpi);
				if (width !== undefined) {
					styles.push(`border-${side}-width: ${width}`);
				}
				if (sideProps.style) {
					styles.push(`border-${side}-style: ${sideProps.style}`);
				}
				if (sideProps.color) {
					styles.push(`border-${side}-color: ${sideProps.color}`);
				}
			}
		}
	} else {
		// Use main border properties (all sides)
		const width = dimensionValue(border.width, dpi);
		if (width !== undefined) styles.push(`border-width: ${width}`);
		if (border.style) styles.push(`border-style: ${border.style}`);
		if (border.color) styles.push(`border-color: ${border.color}`);
	}

	// Border radius (always applies)
	if (typeof border.radius === 'object') {
		const r = border.radius;
		const tl = dimensionValue(r.topLeft ?? 0, dpi) ?? 'auto';
		const tr = dimensionValue(r.topRight ?? 0, dpi) ?? 'auto';
		const br = dimensionValue(r.bottomRight ?? 0, dpi) ?? 'auto';
		const bl = dimensionValue(r.bottomLeft ?? 0, dpi) ?? 'auto';
		styles.push(`border-radius: ${tl} ${tr} ${br} ${bl}`);
	} else if (border.radius !== undefined) {
		const radius = dimensionValue(border.radius, dpi);
		if (radius !== undefined) {
			styles.push(`border-radius: ${radius}`);
		}
	}

	return styles.length > 0 ? styles.join('; ') : undefined;
}

/**
 * Builds box-shadow CSS string.
 * Handles undefined, so callers can pass optional shadow objects directly.
 */
export function boxShadowStyle(shadow: Shadow | Shadow[] | undefined): string | undefined {
	if (!shadow) return undefined;
	const shadows = Array.isArray(shadow) ? shadow : [shadow];
	return shadows
		.map(
			(s: Shadow) =>
				`${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
		)
		.join(', ');
}

/**
 * Builds background CSS string.
 * Handles undefined, so callers can pass optional background objects directly.
 */
export function backgroundStyle(background: any | undefined): string | undefined {
	if (!background) return undefined;

	const styles: string[] = [];
	if (background.color) styles.push(`background-color: ${background.color}`);
	if (background.image) {
		styles.push(`background-image: url(${background.image.imageId})`);
		if (background.image.size) styles.push(`background-size: ${background.image.size}`);
		if (background.image.repeat) styles.push(`background-repeat: ${background.image.repeat}`);
		if (background.image.position)
			styles.push(`background-position: ${background.image.position}`);
	}

	return styles.length > 0 ? styles.join('; ') : undefined;
}
