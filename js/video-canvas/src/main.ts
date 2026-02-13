import { Publish, Watch, Moq } from "@moq/hang";
import { Room } from "@moq/hang/meet";
import { Signal, Effect } from "@moq/signals";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";

// --- State ---

const RELAY_URL: string = import.meta.env.VITE_RELAY_URL ?? "http://localhost:4443/anon";

const state = {
	signals: new Effect(),
	micEnabled: new Signal(true),
	camEnabled: new Signal(true),
	room: undefined as Room | undefined,
	connection: undefined as Moq.Connection.Reload | undefined,
	publishBroadcast: undefined as Publish.Broadcast | undefined,
	camera: undefined as Publish.Source.Camera | undefined,
	microphone: undefined as Publish.Source.Microphone | undefined,
	screenEnabled: new Signal(false),
	screenSource: undefined as Publish.Source.Screen | undefined,
	screenBroadcast: undefined as Publish.Broadcast | undefined,

	// Track remote tiles for cleanup
	remoteTiles: new Map<string, {
		canvas: HTMLCanvasElement;
		renderer: Watch.Video.Renderer;
		emitter: Watch.Audio.Emitter;
		tile: HTMLDivElement;
	}>(),

	// Track local tile
	localTile: undefined as HTMLDivElement | undefined,

	// Chat
	chatMessages: [] as { sender: string; text: string }[],
	chatOpen: false,
	userName: "",
};

// --- DOM References ---

const $lobby = document.getElementById("lobby")!;
const $room = document.getElementById("room")!;
const $roomInput = document.getElementById("room-input") as HTMLInputElement;
const $nameInput = document.getElementById("name-input") as HTMLInputElement;
const $joinBtn = document.getElementById("join-btn")!;
const $roomName = document.getElementById("room-name")!;
const $shareUrl = document.getElementById("share-url")!;
const $copyLinkBtn = document.getElementById("copy-link-btn")!;
const $connectionStatus = document.getElementById("connection-status")!;
const $videoGrid = document.getElementById("video-grid")!;
const $micBtn = document.getElementById("mic-btn")!;
const $camBtn = document.getElementById("camera-btn")!;
const $screenBtn = document.getElementById("screen-btn")!;
const $chatBtn = document.getElementById("chat-btn")!;
const $leaveBtn = document.getElementById("leave-btn")!;
const $chatPanel = document.getElementById("chat-panel")!;
const $chatMessages = document.getElementById("chat-messages")!;
const $chatForm = document.getElementById("chat-form") as HTMLFormElement;
const $chatInput = document.getElementById("chat-input") as HTMLInputElement;
const $chatCloseBtn = document.getElementById("chat-close-btn")!;
const $settingsBtn = document.getElementById("settings-btn")!;
const $settingsPanel = document.getElementById("settings-panel")!;
const $settingsCloseBtn = document.getElementById("settings-close-btn")!;
const $cameraSelect = document.getElementById("camera-select") as HTMLSelectElement;
const $micSelect = document.getElementById("mic-select") as HTMLSelectElement;

// --- URL Parsing ---

function parseURL(): { room?: string; name?: string } {
	const params = new URLSearchParams(window.location.search);
	const hashParts = window.location.hash.replace("#", "").split("/").filter(Boolean);

	return {
		room: params.get("room") ?? hashParts[0] ?? undefined,
		name: params.get("name") ?? undefined,
	};
}

function buildShareURL(roomId: string): string {
	const url = new URL(window.location.href);
	url.search = "";
	url.hash = "";
	url.searchParams.set("room", roomId);
	return url.toString();
}

// --- Lobby ---

function randomRoomName(): string {
	return uniqueNamesGenerator({ dictionaries: [adjectives, adjectives, animals], separator: "-", length: 3 });
}

function checkBrowserSupport(): string | null {
	if (typeof WebTransport === "undefined") return "WebTransport is not supported in this browser. Use Chrome 97+ or Edge 97+.";
	if (!navigator.mediaDevices?.getUserMedia) return "getUserMedia is not available. Camera/mic access requires HTTPS.";
	if (!("MediaStreamTrackProcessor" in window)) return "MediaStreamTrackProcessor is not supported. Use Chrome 94+ or Edge 94+.";
	return null;
}

function initLobby() {
	const unsupported = checkBrowserSupport();
	if (unsupported) {
		$lobby.innerHTML = `<div class="lobby-card"><h1>Unsupported Browser</h1><p class="lobby-subtitle">${unsupported}</p></div>`;
		return;
	}

	const { room, name } = parseURL();

	$roomInput.value = room ?? randomRoomName();
	$nameInput.value = name ?? localStorage.getItem("isp:name") ?? "";

	// Update share URL as room name changes
	const updateShareUrl = () => {
		const roomId = $roomInput.value.trim();
		$shareUrl.textContent = roomId ? buildShareURL(roomId) : "";
	};
	$roomInput.addEventListener("input", updateShareUrl);
	updateShareUrl();

	// Join on button click or enter
	$joinBtn.addEventListener("click", handleJoin);
	$roomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleJoin(); });
	$nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleJoin(); });

	// Auto-join if room is in URL
	if (room) {
		handleJoin();
	}
}

function handleJoin() {
	const roomId = $roomInput.value.trim();
	const name = $nameInput.value.trim() || `user-${Math.random().toString(36).slice(2, 6)}`;
	localStorage.setItem("isp:name", name);

	if (!roomId) {
		$roomInput.focus();
		return;
	}

	// Update URL without reload
	const url = new URL(window.location.href);
	url.searchParams.set("room", roomId);
	url.searchParams.set("name", name);
	window.history.replaceState(null, "", url.toString());

	joinRoom(roomId, name);
}

// --- Room ---

function joinRoom(roomId: string, userName: string) {
	// Switch from lobby to room view
	$lobby.classList.add("hidden");
	$room.classList.remove("hidden");
	$roomName.textContent = roomId;
	state.userName = userName;

	// The path uniquely identifies this user's broadcast within the room
	const broadcastPath = Moq.Path.from(roomId, userName);

	// Create MoQ connection
	const relayUrl = new Signal<URL | undefined>(new URL(RELAY_URL));
	const enabled = new Signal(true);

	state.connection = new Moq.Connection.Reload({ url: relayUrl, enabled });
	state.signals.cleanup(() => state.connection?.close());

	// Show connection status
	state.signals.subscribe(state.connection.status, (status) => {
		$connectionStatus.textContent = status;
		$connectionStatus.className = `status-${status}`;
	});

	// Create Room for broadcast discovery (scoped to this room)
	const roomPath = new Signal<Moq.Path.Valid | undefined>(Moq.Path.from(roomId));
	state.room = new Room({ connection: state.connection.established, path: roomPath });
	state.signals.cleanup(() => state.room?.close());

	// Create local broadcast for camera + mic + chat
	state.publishBroadcast = new Publish.Broadcast({
		connection: state.connection.established,
		enabled,
		path: broadcastPath,
		audio: { enabled: state.micEnabled },
		video: {
			hd: { enabled: state.camEnabled },
			sd: { enabled: state.camEnabled, config: { maxPixels: 640 * 360 } },
		},
		chat: { message: { enabled: true } },
	});
	state.signals.cleanup(() => state.publishBroadcast?.close());

	// Create camera and microphone sources, restoring preferred devices from localStorage
	const savedCameraId = localStorage.getItem("isp:preferred-camera") ?? undefined;
	const savedMicId = localStorage.getItem("isp:preferred-mic") ?? undefined;

	state.camera = new Publish.Source.Camera({
		enabled: state.camEnabled,
		device: { preferred: savedCameraId },
	});
	state.microphone = new Publish.Source.Microphone({
		enabled: state.micEnabled,
		device: { preferred: savedMicId },
	});

	state.signals.cleanup(() => {
		state.camera?.close();
		state.microphone?.close();
	});

	// Wire camera source → broadcast video
	state.signals.effect((effect) => {
		const source = effect.get(state.camera!.source);
		state.publishBroadcast!.video.source.set(source);
	});

	// Wire microphone source → broadcast audio
	state.signals.effect((effect) => {
		const source = effect.get(state.microphone!.source);
		state.publishBroadcast!.audio.source.set(source);
	});

	// Screen share — separate broadcast under {room}/{user}-screen
	const screenPath = Moq.Path.from(roomId, `${userName}-screen`);

	state.screenBroadcast = new Publish.Broadcast({
		connection: state.connection.established,
		enabled: state.screenEnabled,
		path: screenPath,
		audio: { enabled: state.screenEnabled },
		video: { hd: { enabled: state.screenEnabled } },
	});
	state.signals.cleanup(() => state.screenBroadcast?.close());

	state.screenSource = new Publish.Source.Screen({ enabled: state.screenEnabled });
	state.signals.cleanup(() => state.screenSource?.close());

	// Wire screen source → screen broadcast
	state.signals.effect((effect) => {
		const source = effect.get(state.screenSource!.source);
		if (!source) return;

		if (source.video) state.screenBroadcast!.video.source.set(source.video);
		if (source.audio) state.screenBroadcast!.audio.source.set(source.audio);
	});

	// Stop sharing when the user ends the screen capture via browser UI
	state.signals.effect((effect) => {
		const source = effect.get(state.screenSource!.source);
		if (!source?.video) return;

		const onEnded = () => { state.screenEnabled.set(false); };
		source.video.addEventListener("ended", onEnded);
		effect.cleanup(() => source.video?.removeEventListener("ended", onEnded));
	});

	// Wire device selectors
	setupDeviceSelects(state.camera, state.microphone);

	// Register callbacks BEFORE preview() — onLocal/onRemote iterate existing
	// entries on registration, so registering after preview() causes a double fire:
	// once from the iteration, once when the relay announces back.
	state.room.onLocal((path, broadcast) => {
		if (broadcast) {
			addLocalTile(path, broadcast, userName);
		} else {
			removeLocalTile();
		}
	});

	state.room.onRemote((path, broadcast) => {
		const segments = String(path).split("/");
		const name = segments[segments.length - 1] ?? String(path);

		if (broadcast) {
			addRemoteTile(path, broadcast);
			appendSystemMessage(`${name} joined`);
		} else {
			removeRemoteTile(path);
			appendSystemMessage(`${name} left`);
		}
	});

	// Register local broadcasts for preview (so Room doesn't download them as remote)
	state.room.preview(broadcastPath, state.publishBroadcast);
	state.room.preview(screenPath, state.screenBroadcast);

	// Setup controls
	setupControls(roomId);
}

// --- Tiles ---

function addLocalTile(path: Moq.Path.Valid, broadcast: Publish.Broadcast, userName: string) {
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

function removeLocalTile() {
	if (state.localTile) {
		state.localTile.remove();
		state.localTile = undefined;
	}
}

function addRemoteTile(path: Moq.Path.Valid, broadcast: Watch.Broadcast) {
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

	// Create video renderer → draws decoded frames to canvas
	const renderer = new Watch.Video.Renderer(broadcast.video, { canvas });

	// Create audio emitter → plays audio to speakers
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

function removeRemoteTile(path: Moq.Path.Valid) {
	const pathStr = String(path);
	const existing = state.remoteTiles.get(pathStr);
	if (!existing) return;

	existing.renderer.close();
	existing.emitter.close();
	existing.tile.remove();
	state.remoteTiles.delete(pathStr);
}

// --- Device Settings ---

let settingsOpen = false;

function toggleSettings() {
	settingsOpen = !settingsOpen;
	$settingsPanel.style.display = settingsOpen ? "flex" : "none";
	$settingsBtn.classList.toggle("active", settingsOpen);
	$settingsBtn.setAttribute("aria-pressed", String(settingsOpen));
}

function populateSelect(
	select: HTMLSelectElement,
	devices: MediaDeviceInfo[] | undefined,
	activeId: string | undefined,
) {
	const previousValue = select.value;
	select.innerHTML = "";

	if (!devices?.length) {
		const opt = document.createElement("option");
		opt.textContent = "No devices found";
		opt.disabled = true;
		select.appendChild(opt);
		return;
	}

	for (const device of devices) {
		const opt = document.createElement("option");
		opt.value = device.deviceId;
		opt.textContent = device.label || `Device ${device.deviceId.slice(0, 8)}`;
		if (device.deviceId === activeId) opt.selected = true;
		select.appendChild(opt);
	}

	// Preserve user selection if still valid
	if (previousValue && [...select.options].some((o) => o.value === previousValue)) {
		select.value = previousValue;
	}
}

function setupDeviceSelects(camera: Publish.Source.Camera, microphone: Publish.Source.Microphone) {
	// Populate camera select when available devices change
	state.signals.effect((effect) => {
		const devices = effect.get(camera.device.available);
		const active = effect.get(camera.device.active);
		populateSelect($cameraSelect, devices, active);
	});

	// Populate mic select when available devices change
	state.signals.effect((effect) => {
		const devices = effect.get(microphone.device.available);
		const active = effect.get(microphone.device.active);
		populateSelect($micSelect, devices, active);
	});

	// On camera select change → set preferred + persist
	$cameraSelect.addEventListener("change", () => {
		const deviceId = $cameraSelect.value;
		camera.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-camera", deviceId);
	});

	// On mic select change → set preferred + persist
	$micSelect.addEventListener("change", () => {
		const deviceId = $micSelect.value;
		microphone.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-mic", deviceId);
	});
}

// --- Chat ---

function appendSystemMessage(text: string) {
	const el = document.createElement("div");
	el.className = "chat-msg-system";
	el.textContent = text;
	$chatMessages.appendChild(el);
	$chatMessages.scrollTop = $chatMessages.scrollHeight;
}

function appendChatMessage(sender: string, text: string) {
	state.chatMessages.push({ sender, text });
	renderChatMessage(sender, text);

	// Show unread indicator if chat panel is closed
	if (!state.chatOpen) {
		$chatBtn.classList.add("has-unread");
	}
}

function renderChatMessage(sender: string, text: string) {
	const el = document.createElement("div");
	el.className = "chat-msg";

	const senderSpan = document.createElement("span");
	senderSpan.className = "chat-msg-sender";
	senderSpan.textContent = sender;

	const textSpan = document.createElement("span");
	textSpan.className = "chat-msg-text";
	textSpan.textContent = text;

	el.appendChild(senderSpan);
	el.appendChild(textSpan);
	$chatMessages.appendChild(el);

	// Auto-scroll to bottom
	$chatMessages.scrollTop = $chatMessages.scrollHeight;
}

function sendChatMessage(text: string) {
	if (!text || !state.publishBroadcast) return;
	state.publishBroadcast.chat.message.latest.set(text);
	appendChatMessage(`${state.userName} (you)`, text);
}

function toggleChat() {
	state.chatOpen = !state.chatOpen;
	$chatPanel.classList.toggle("hidden", !state.chatOpen);
	$chatBtn.classList.toggle("active", state.chatOpen);
	$chatBtn.setAttribute("aria-pressed", String(state.chatOpen));

	if (state.chatOpen) {
		$chatBtn.classList.remove("has-unread");
		$chatInput.focus();
		$chatMessages.scrollTop = $chatMessages.scrollHeight;
	}
}

// --- Controls ---

function setupControls(roomId: string) {
	// Mic toggle
	let micOn = true;
	$micBtn.classList.add("active");
	const toggleMic = () => {
		micOn = !micOn;
		state.micEnabled.set(micOn);
		$micBtn.textContent = micOn ? "Mic On" : "Mic Off";
		$micBtn.classList.toggle("active", micOn);
		$micBtn.classList.toggle("muted", !micOn);
		$micBtn.setAttribute("aria-pressed", String(micOn));
	};
	$micBtn.addEventListener("click", toggleMic);

	// Camera toggle
	let camOn = true;
	$camBtn.classList.add("active");
	const toggleCam = () => {
		camOn = !camOn;
		state.camEnabled.set(camOn);
		$camBtn.textContent = camOn ? "Cam On" : "Cam Off";
		$camBtn.classList.toggle("active", camOn);
		$camBtn.classList.toggle("muted", !camOn);
		$camBtn.setAttribute("aria-pressed", String(camOn));
	};
	$camBtn.addEventListener("click", toggleCam);

	// Screen share toggle
	let screenOn = false;
	const toggleScreen = () => {
		screenOn = !screenOn;
		state.screenEnabled.set(screenOn);
		$screenBtn.textContent = screenOn ? "Stop Share" : "Screen";
		$screenBtn.classList.toggle("active", screenOn);
		$screenBtn.setAttribute("aria-pressed", String(screenOn));
	};
	$screenBtn.addEventListener("click", toggleScreen);

	// Sync button state when screen share ends via browser UI
	state.signals.subscribe(state.screenEnabled, (on) => {
		screenOn = on;
		$screenBtn.textContent = on ? "Stop Share" : "Screen";
		$screenBtn.classList.toggle("active", on);
		$screenBtn.setAttribute("aria-pressed", String(on));
	});

	// Settings toggle
	$settingsBtn.addEventListener("click", toggleSettings);
	$settingsCloseBtn.addEventListener("click", toggleSettings);

	// Chat toggle
	$chatBtn.addEventListener("click", toggleChat);
	$chatCloseBtn.addEventListener("click", toggleChat);

	// Keyboard shortcuts (only when not typing in chat input)
	document.addEventListener("keydown", (e) => {
		if (e.target === $chatInput) return;
		switch (e.key.toLowerCase()) {
			case "m": toggleMic(); break;
			case "v": toggleCam(); break;
			case "s": toggleScreen(); break;
			case "g": toggleSettings(); break;
			case "c": toggleChat(); break;
		}
	});

	// Chat send
	$chatForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const text = $chatInput.value.trim();
		if (text) {
			sendChatMessage(text);
			$chatInput.value = "";
		}
	});

	// Leave
	$leaveBtn.addEventListener("click", leaveRoom);

	// Copy link
	$copyLinkBtn.addEventListener("click", () => {
		const shareUrl = buildShareURL(roomId);
		navigator.clipboard.writeText(shareUrl).then(() => {
			const original = $copyLinkBtn.textContent;
			$copyLinkBtn.textContent = "Copied!";
			setTimeout(() => { $copyLinkBtn.textContent = original; }, 2000);
		});
	});
}

function leaveRoom() {
	// Close all signals and connections
	state.signals.close();

	// Clean up remote tiles
	for (const [, tile] of state.remoteTiles) {
		tile.renderer.close();
		tile.emitter.close();
		tile.tile.remove();
	}
	state.remoteTiles.clear();

	// Clean up local tile
	removeLocalTile();

	// Reset state
	state.signals = new Effect();
	state.micEnabled = new Signal(true);
	state.camEnabled = new Signal(true);
	state.screenEnabled = new Signal(false);
	state.room = undefined;
	state.connection = undefined;
	state.publishBroadcast = undefined;
	state.camera = undefined;
	state.microphone = undefined;
	state.screenSource = undefined;
	state.screenBroadcast = undefined;

	// Clear grid
	$videoGrid.innerHTML = "";

	// Reset button states
	$micBtn.textContent = "Mic On";
	$micBtn.classList.add("active");
	$micBtn.classList.remove("muted");
	$camBtn.textContent = "Cam On";
	$camBtn.classList.add("active");
	$camBtn.classList.remove("muted");
	$screenBtn.textContent = "Screen";
	$screenBtn.classList.remove("active");
	$chatBtn.classList.remove("active", "has-unread");
	$chatPanel.classList.add("hidden");
	$chatMessages.innerHTML = "";
	$settingsBtn.classList.remove("active");
	$settingsPanel.style.display = "none";
	settingsOpen = false;
	state.chatMessages = [];
	state.chatOpen = false;
	state.userName = "";

	// Switch back to lobby
	$room.classList.add("hidden");
	$lobby.classList.remove("hidden");
}

// --- Debug Overlay ---

const $debugOverlay = document.getElementById("debug-overlay")!;
let debugVisible = false;
let debugInterval: ReturnType<typeof setInterval> | undefined;

function updateDebugOverlay() {
	const connStatus = state.connection?.status.peek() ?? "n/a";
	const participants = state.remoteTiles.size;
	const remotes = [...state.remoteTiles.keys()].join("\n  ");

	$debugOverlay.textContent =
		`relay: ${RELAY_URL}\n` +
		`conn:  ${connStatus}\n` +
		`user:  ${state.userName || "n/a"}\n` +
		`remote tiles: ${participants}\n` +
		(remotes ? `  ${remotes}\n` : "") +
		`mic: ${state.micEnabled.peek()}  cam: ${state.camEnabled.peek()}  screen: ${state.screenEnabled.peek()}`;
}

document.addEventListener("keydown", (e) => {
	if (e.ctrlKey && e.key === "d") {
		e.preventDefault();
		debugVisible = !debugVisible;
		$debugOverlay.classList.toggle("hidden", !debugVisible);

		if (debugVisible) {
			updateDebugOverlay();
			debugInterval = setInterval(updateDebugOverlay, 1000);
		} else {
			clearInterval(debugInterval);
		}
	}
});

// --- Init ---

initLobby();
