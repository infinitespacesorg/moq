import type { Publish } from "@moq/hang";
import { state } from "./state.ts";
import { $cameraSelect, $micSelect, $settingsBtn, $settingsPanel } from "./dom.ts";

let settingsOpen = false;

export function toggleSettings() {
	settingsOpen = !settingsOpen;
	$settingsPanel.style.display = settingsOpen ? "flex" : "none";
	$settingsBtn.classList.toggle("active", settingsOpen);
	$settingsBtn.setAttribute("aria-pressed", String(settingsOpen));
}

export function resetSettings() {
	$settingsBtn.classList.remove("active");
	$settingsPanel.style.display = "none";
	settingsOpen = false;
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

export function setupDeviceSelects(camera: Publish.Source.Camera, microphone: Publish.Source.Microphone) {
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

	// On camera select change -> set preferred + persist
	$cameraSelect.addEventListener("change", () => {
		const deviceId = $cameraSelect.value;
		camera.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-camera", deviceId);
	});

	// On mic select change -> set preferred + persist
	$micSelect.addEventListener("change", () => {
		const deviceId = $micSelect.value;
		microphone.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-mic", deviceId);
	});
}
