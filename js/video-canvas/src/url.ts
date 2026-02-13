export function parseURL(): { room?: string; name?: string } {
	const params = new URLSearchParams(window.location.search);
	const hashParts = window.location.hash.replace("#", "").split("/").filter(Boolean);

	return {
		room: params.get("room") ?? hashParts[0] ?? undefined,
		name: params.get("name") ?? undefined,
	};
}

export function buildShareURL(roomId: string): string {
	const url = new URL(window.location.href);
	url.search = "";
	url.hash = "";
	url.searchParams.set("room", roomId);
	return url.toString();
}
