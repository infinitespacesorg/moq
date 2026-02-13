import { Watch } from "@moq/hang";
import type { Publish, Moq } from "@moq/hang";
import { state } from "./state.ts";
import { $videoGrid } from "./dom.ts";
import { appendChatMessage } from "./chat.ts";

export function addLocalTile(path: Moq.Path.Valid, broadcast: Publish.Broadcast, userName: string) {
	const pathStr = String(path);
	const isScreen = pathStr.endsWith("-screen");

	const tile = document.createElement("div");
	tile.className = isScreen ? "tile tile-screen" : "tile tile-local";

	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.autoplay = true;

	const label = document.createElement("div");
	label.className = "tile-label";
	label.textContent = `${userName} (you)`;

	tile.appendChild(video);
	tile.appendChild(label);
	$videoGrid.prepend(tile);

	state.localTile = tile;

	// Wire video source to preview using effect (not subscribe) so we get the
	// current value immediately — the track may already exist by the time the
	// tile is created after the relay announces back.
	state.signals.effect((effect) => {
		const media = effect.get(broadcast.video.source);
		if (media) {
			video.srcObject = new MediaStream([media]);
		}
	});

	state.signals.cleanup(() => {
		tile.remove();
	});
}

export function removeLocalTile() {
	if (state.localTile) {
		state.localTile.remove();
		state.localTile = undefined;
	}
}

export function addRemoteTile(path: Moq.Path.Valid, broadcast: Watch.Broadcast) {
	const pathStr = String(path);

	// Guard against duplicate announcements — clean up any existing tile first
	const existing = state.remoteTiles.get(pathStr);
	if (existing) {
		existing.renderer.close();
		existing.emitter.close();
		existing.tile.remove();
		state.remoteTiles.delete(pathStr);
	}

	// Enable downloading
	broadcast.enabled.set(true);

	const tile = document.createElement("div");
	tile.className = "tile";

	const canvas = document.createElement("canvas");

	// Extract display name from path (last segment)
	const segments = pathStr.split("/");
	const displayName = segments[segments.length - 1] ?? pathStr;

	const label = document.createElement("div");
	label.className = "tile-label";
	label.textContent = displayName;

	tile.appendChild(canvas);
	tile.appendChild(label);
	$videoGrid.appendChild(tile);

	// Create video renderer -> draws decoded frames to canvas
	const renderer = new Watch.Video.Renderer(broadcast.video, { canvas });

	// Create audio emitter -> plays audio to speakers
	const emitter = new Watch.Audio.Emitter(broadcast.audio);

	state.remoteTiles.set(pathStr, { canvas, renderer, emitter, tile });

	// Enable chat message receiving from this broadcast
	broadcast.chat.message.enabled.set(true);

	// Subscribe to incoming chat messages
	state.signals.effect((effect) => {
		const msg = effect.get(broadcast.chat.message.latest);
		if (!msg) return; // skip empty/undefined

		appendChatMessage(displayName, msg);
	});
}

export function removeRemoteTile(path: Moq.Path.Valid) {
	const pathStr = String(path);
	const existing = state.remoteTiles.get(pathStr);
	if (!existing) return;

	existing.renderer.close();
	existing.emitter.close();
	existing.tile.remove();
	state.remoteTiles.delete(pathStr);
}

export function clearRemoteTiles() {
	for (const [, tile] of state.remoteTiles) {
		tile.renderer.close();
		tile.emitter.close();
		tile.tile.remove();
	}
	state.remoteTiles.clear();
}
