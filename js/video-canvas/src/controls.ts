import { state } from "./state.ts";
import {
	$micBtn, $camBtn, $screenBtn, $chatBtn, $leaveBtn,
	$chatInput, $chatForm, $copyLinkBtn,
	$settingsBtn, $settingsCloseBtn, $chatCloseBtn,
} from "./dom.ts";
import { toggleChat, sendChatMessage } from "./chat.ts";
import { toggleSettings } from "./devices.ts";
import { buildShareURL } from "./url.ts";

export function setupControls(roomId: string, onLeave: () => void) {
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
	$leaveBtn.addEventListener("click", onLeave);

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

export function resetControls() {
	$micBtn.textContent = "Mic On";
	$micBtn.classList.add("active");
	$micBtn.classList.remove("muted");
	$camBtn.textContent = "Cam On";
	$camBtn.classList.add("active");
	$camBtn.classList.remove("muted");
	$screenBtn.textContent = "Screen";
	$screenBtn.classList.remove("active");
}
