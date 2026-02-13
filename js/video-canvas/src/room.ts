import { Publish, Moq } from "@moq/hang";
import { Room } from "@moq/hang/meet";
import { Signal, Effect } from "@moq/signals";
import { state, RELAY_URL } from "./state.ts";
import { $lobby, $room, $roomName, $connectionStatus, $videoGrid } from "./dom.ts";
import { addLocalTile, removeLocalTile, addRemoteTile, removeRemoteTile, clearRemoteTiles } from "./tiles.ts";
import { setupDeviceSelects, resetSettings } from "./devices.ts";
import { appendSystemMessage, resetChat } from "./chat.ts";
import { setupControls, resetControls } from "./controls.ts";
import { showNotification, dismissNotification } from "./notifications.ts";

export function joinRoom(roomId: string, userName: string) {
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

	// Show connection status with user-facing notifications
	let wasConnected = false;
	state.signals.subscribe(state.connection.status, (status) => {
		$connectionStatus.textContent = status;
		$connectionStatus.className = `status-${status}`;
		$connectionStatus.title = `Relay: ${RELAY_URL}\nStatus: ${status}`;

		if (status === "connected") {
			if (wasConnected) {
				showNotification("Reconnected", "success", 3000);
			} else {
				dismissNotification();
			}
			wasConnected = true;
		} else if (status === "disconnected" && wasConnected) {
			showNotification("Connection lost. Reconnecting\u2026", "error", 0);
		}
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

	// Wire camera source -> broadcast video, detect media errors
	let cameraWarned = false;
	state.signals.effect((effect) => {
		const source = effect.get(state.camera!.source);
		state.publishBroadcast!.video.source.set(source);

		if (!source && effect.get(state.camEnabled) && !cameraWarned) {
			// Camera enabled but no source — may be permission denied or device error.
			// Use a delay to avoid flashing during normal initialization.
			const timer = setTimeout(() => {
				if (state.camEnabled.peek() && !state.camera!.source.peek()) {
					showNotification("Camera unavailable. Check permissions or device settings.", "error", 8000);
					cameraWarned = true;
				}
			}, 3000);
			effect.cleanup(() => clearTimeout(timer));
		}
	});

	// Wire microphone source -> broadcast audio, detect media errors
	let micWarned = false;
	state.signals.effect((effect) => {
		const source = effect.get(state.microphone!.source);
		state.publishBroadcast!.audio.source.set(source);

		if (!source && effect.get(state.micEnabled) && !micWarned) {
			const timer = setTimeout(() => {
				if (state.micEnabled.peek() && !state.microphone!.source.peek()) {
					showNotification("Microphone unavailable. Check permissions or device settings.", "error", 8000);
					micWarned = true;
				}
			}, 3000);
			effect.cleanup(() => clearTimeout(timer));
		}
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

	// Wire screen source -> screen broadcast
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
	setupControls(roomId, leaveRoom);
}

export function leaveRoom() {
	// Close all signals and connections
	state.signals.close();

	// Clean up tiles
	clearRemoteTiles();
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

	// Reset UI
	resetControls();
	resetSettings();
	resetChat();
	dismissNotification();
	state.userName = "";

	// Switch back to lobby
	$room.classList.add("hidden");
	$lobby.classList.remove("hidden");
}
