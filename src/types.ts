// Types for EPUB metadata and content items
type EpubMetadata = {
	title: string;
	creator: string;
	language: string;
	identifier: string;
	date?: string;
	publisher?: string;
	description?: string;
	rights?: string;
	cover?: string; // ID of cover image
	tags?: string[]; // Array of tags/subjects for categorization
	contributor?: string
};

type EpubItem = {
	id: string;
	href: string;
	mediaType: string;
	properties?: string;
	content: string | Uint8Array;
};

type NavPoint = {
	id: string;
	label: string;
	content: string;
	children?: NavPoint[];
};

export type { EpubItem, EpubMetadata, NavPoint };
