import { useEffect, useMemo, useCallback, useRef } from "react";
import { Moq, Publish } from "@moq/hang";
import { Signal, Effect } from "@moq/signals";
import { useSignal } from "./useSignal.ts";

export interface UseBroadcastResult {
	/** The Publish.Broadcast instance (camera + mic + chat). */
	broadcast: Publish.Broadcast;
	/** The camera source. */
	camera: Publish.Source.Camera;
	/** The microphone source. */
	microphone: Publish.Source.Microphone;
	/** Whether the mic is currently enabled. */
	micEnabled: boolean;
	/** Whether the camera is currently enabled. */
	camEnabled: boolean;
	/** Toggle microphone on/off. */
	toggleMic: () => void;
	/** Toggle camera on/off. */
	toggleCam: () => void;
}

/**
 * Publish a camera + microphone broadcast to a MoQ room.
 *
 * Wraps `Publish.Broadcast`, `Publish.Source.Camera`, and `Publish.Source.Microphone`.
 * Automatically wires sources to the broadcast and manages lifecycle.
 */
export function useBroadcast(
	connection: Moq.Connection.Reload,
	broadcastPath: string,
): UseBroadcastResult {
	const micEnabled = useRef(new Signal(true));
	const camEnabled = useRef(new Signal(true));

	const { broadcast, camera, microphone } = useMemo(() => {
		const path = Moq.Path.from(broadcastPath);

		const broadcast = new Publish.Broadcast({
			connection: connection.established,
			enabled: true,
			path,
			audio: { enabled: micEnabled.current },
			video: {
				hd: { enabled: camEnabled.current },
				sd: { enabled: camEnabled.current, config: { maxPixels: 640 * 360 } },
			},
			chat: { message: { enabled: true } },
		});

		const savedCameraId = localStorage.getItem("isp:preferred-camera") ?? undefined;
		const savedMicId = localStorage.getItem("isp:preferred-mic") ?? undefined;

		const camera = new Publish.Source.Camera({
			enabled: camEnabled.current,
			device: { preferred: savedCameraId },
		});

		const microphone = new Publish.Source.Microphone({
			enabled: micEnabled.current,
			device: { preferred: savedMicId },
			constraints: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});

		return { broadcast, camera, microphone };
	}, [connection, broadcastPath]);

	// Wire sources to broadcast
	useEffect(() => {
		const signals = new Effect();

		// Wire camera source -> broadcast video
		signals.effect((effect) => {
			const source = effect.get(camera.source);
			broadcast.video.source.set(source);
		});

		// Wire microphone source -> broadcast audio
		signals.effect((effect) => {
			const source = effect.get(microphone.source);
			broadcast.audio.source.set(source);
		});

		return () => {
			signals.close();
			broadcast.close();
			camera.close();
			microphone.close();
		};
	}, [broadcast, camera, microphone]);

	const toggleMic = useCallback(() => {
		micEnabled.current.set(!micEnabled.current.peek());
	}, []);

	const toggleCam = useCallback(() => {
		camEnabled.current.set(!camEnabled.current.peek());
	}, []);

	const mic = useSignal(micEnabled.current);
	const cam = useSignal(camEnabled.current);

	return {
		broadcast,
		camera,
		microphone,
		micEnabled: mic,
		camEnabled: cam,
		toggleMic,
		toggleCam,
	};
}
