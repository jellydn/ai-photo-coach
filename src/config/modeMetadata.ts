/**
 * Mode metadata for UI display
 * Provides icons and descriptions for each shooting mode
 */

import type { Mode } from "./modes";

/** Display metadata for a mode */
export interface ModeMetadata {
	/** Display icon (emoji) */
	icon: string;
	/** Display title */
	title: string;
	/** One-line description */
	description: string;
}

/** Display metadata for all modes */
export const modeMetadata: Record<Mode, ModeMetadata> = {
	portrait: {
		icon: "👤",
		title: "Portrait",
		description: "Face framing & headroom guides",
	},
	food: {
		icon: "🍽️",
		title: "Food",
		description: "Perfect flat-lay angles",
	},
	travel: {
		icon: "✈️",
		title: "Travel",
		description: "Scenery & landmark framing",
	},
	group: {
		icon: "👥",
		title: "Group Photo",
		description: "Everyone in the frame",
	},
	product: {
		icon: "📦",
		title: "Product",
		description: "Clean product shots",
	},
	document: {
		icon: "📄",
		title: "Document",
		description: "Flat document capture",
	},
	pet_kids: {
		icon: "🐕",
		title: "Pet/Kids",
		description: "Fast-moving subjects",
	},
	night: {
		icon: "🌙",
		title: "Night Shot",
		description: "Low-light guidance",
	},
};

/**
 * Get display metadata for a mode
 * @param mode - The shooting mode
 * @returns ModeMetadata with icon, title, and description
 */
export function getModeMetadata(mode: Mode): ModeMetadata {
	return modeMetadata[mode];
}
