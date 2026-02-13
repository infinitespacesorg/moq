import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";
import { $lobby, $roomInput, $nameInput, $joinBtn, $shareUrl } from "./dom.ts";
import { parseURL, buildShareURL } from "./url.ts";
import { joinRoom } from "./room.ts";

function randomRoomName(): string {
	return uniqueNamesGenerator({ dictionaries: [adjectives, adjectives, animals], separator: "-", length: 3 });
}

function checkBrowserSupport(): string | null {
	if (typeof WebTransport === "undefined") return "WebTransport is not supported in this browser. Use Chrome 97+ or Edge 97+.";
	if (!navigator.mediaDevices?.getUserMedia) return "getUserMedia is not available. Camera/mic access requires HTTPS.";
	if (!("MediaStreamTrackProcessor" in window)) return "MediaStreamTrackProcessor is not supported. Use Chrome 94+ or Edge 94+.";
	return null;
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

export function initLobby() {
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
