import { useEffect, useRef } from "react";
import type { Publish } from "@moq/hang";
import { useSignal } from "../hooks/useSignal.ts";
import type { LayoutPosition } from "../hooks/useLayoutPosition.ts";

interface SettingsPanelProps {
	camera: Publish.Source.Camera;
	microphone: Publish.Source.Microphone;
	visible: boolean;
	onClose: () => void;
	dock: LayoutPosition;
}

/**
 * Device settings panel — camera and microphone selection.
 *
 * Reads available/active devices from the MoQ publish sources and
 * persists preferred device IDs to localStorage.
 */
export function SettingsPanel({ camera, microphone, visible, onClose, dock }: SettingsPanelProps) {
	const panelRef = useRef<HTMLDivElement>(null);

	const cameraDevices = useSignal(camera.device.available);
	const activeCameraId = useSignal(camera.device.active);
	const micDevices = useSignal(microphone.device.available);
	const activeMicId = useSignal(microphone.device.active);

	// Close on Escape key
	useEffect(() => {
		if (!visible) return;
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	}, [visible, onClose]);

	if (!visible) return null;

	const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		camera.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-camera", deviceId);
	};

	const handleMicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		microphone.device.preferred.set(deviceId);
		localStorage.setItem("isp:preferred-mic", deviceId);
	};

	return (
		<div className="settings-panel" ref={panelRef} aria-label="Device settings" data-dock={dock}>
			<div className="settings-header">
				<span>Settings</span>
				<button
					className="settings-close-btn"
					onClick={onClose}
					title="Close settings"
					aria-label="Close settings"
				>
					&times;
				</button>
			</div>
			<div className="settings-body">
				<label htmlFor="camera-select">Camera</label>
				<select
					id="camera-select"
					aria-label="Camera device"
					value={activeCameraId ?? ""}
					onChange={handleCameraChange}
				>
					{cameraDevices && cameraDevices.length > 0 ? (
						cameraDevices.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label || `Device ${device.deviceId.slice(0, 8)}`}
							</option>
						))
					) : (
						<option disabled>No devices found</option>
					)}
				</select>

				<label htmlFor="mic-select">Microphone</label>
				<select
					id="mic-select"
					aria-label="Microphone device"
					value={activeMicId ?? ""}
					onChange={handleMicChange}
				>
					{micDevices && micDevices.length > 0 ? (
						micDevices.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label || `Device ${device.deviceId.slice(0, 8)}`}
							</option>
						))
					) : (
						<option disabled>No devices found</option>
					)}
				</select>
			</div>
		</div>
	);
}
