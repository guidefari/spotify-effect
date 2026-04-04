export type JsonObject = Record<string, unknown>;

export const getImage = (item: JsonObject): string | null => {
	const images = item.images as Array<JsonObject> | undefined;
	return (images?.[0]?.url as string) ?? null;
};

export const getArtists = (item: JsonObject): string => {
	const artists = item.artists as Array<JsonObject> | undefined;
	return artists?.map((a) => a.name).join(', ') ?? '';
};

export const getReleaseYear = (item: JsonObject): string => {
	const date = item.release_date as string | undefined;
	return date?.slice(0, 4) ?? '';
};

export const getPopularity = (item: JsonObject): number => {
	return (item.popularity as number) ?? 0;
};

export const getSpotifyUrl = (item: JsonObject): string | null => {
	const external = item.external_urls as JsonObject | undefined;
	return (external?.spotify as string) ?? null;
};

export const getTotalTracks = (item: JsonObject): number => {
	return (item.total_tracks as number) ?? 0;
};

export const getTracks = (album: JsonObject): JsonObject[] => {
	const tracks = album.tracks as JsonObject | undefined;
	const items = tracks?.items as Array<JsonObject> | undefined;
	return items ?? [];
};

export const getGenres = (album: JsonObject): string[] => {
	const genres = album.genres as string[] | undefined;
	return genres ?? [];
};

export const getLabel = (album: JsonObject): string => {
	return (album.label as string) ?? '';
};

export const getCopyrights = (album: JsonObject): Array<{ text: string; type: string }> => {
	const copyrights = album.copyrights as Array<JsonObject> | undefined;
	return (copyrights ?? []).map((c) => ({
		text: (c.text as string) ?? '',
		type: (c.type as string) ?? ''
	}));
};

export const getExternalIds = (album: JsonObject): Record<string, string> => {
	const ids = album.external_ids as Record<string, string> | undefined;
	return ids ?? {};
};

export const getAvailableMarkets = (album: JsonObject): string[] => {
	const markets = album.available_markets as string[] | undefined;
	return markets ?? [];
};

export const getTotalDurationMs = (album: JsonObject): number => {
	return getTracks(album).reduce((sum, t) => sum + ((t.duration_ms as number) ?? 0), 0);
};

export const formatDuration = (ms: unknown): string => {
	if (typeof ms !== 'number') return '—';
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDate = (iso: string): string => {
	const d = new Date(iso);
	return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatRelativeDate = (iso: string): string => {
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const days = Math.floor(diffMs / 86400000);
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	const years = Math.floor(months / 12);
	return `${years}y ago`;
};
