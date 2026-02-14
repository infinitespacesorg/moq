import { useEffect, useMemo, useCallback, useRef } from "react";
import { Moq, Publish } from "@moq/hang";
import { Signal, Effect } from "@moq/signals";
import { useSignal } from "./useSignal.ts";

export interface UseScreenShareResult {
	/** Whether screen sharing is active. */
	screenEnabled: boolean;
	/** Toggle screen sharing on/off. */
	toggleScreen: () => void;
	/** The screen share broadcast (undefined when screen sharing is off). */
	screenBroadcast: Publish.Broadcast;
}

/**
 * Manage screen sharing as a separate MoQ broadcast.
 *
 * Creates a `Publish.Broadcast` at `{roomPath}/{userName}-screen` and a
 * `Publish.Source.Screen`. Handles browser-initiated stop (user clicks
 * "Stop sharing" in the browser chrome).
 */
export function useScreenShare(
	connection: Moq.Connection.Reload,
	roomPath: string,
	userName: string,
): UseScreenShareResult {
	const screenEnabled = useRef(new Signal(false));

	const { screenBroadcast, screenSource } = useMemo(() => {
		const screenPath = Moq.Path.from(roomPath, `${userName}-screen`);

		const screenBroadcast = new Publish.Broadcast({
			connection: connection.established,
			enabled: screenEnabled.current,
			path: screenPath,
			audio: { enabled: screenEnabled.current },
			video: { hd: { enabled: screenEnabled.current } },
		});

		const screenSource = new Publish.Source.Screen({
			enabled: screenEnabled.current,
		});

		return { screenBroadcast, screenSource };
	}, [connection, roomPath, userName]);

	// Wire screen source -> broadcast + handle browser stop
	useEffect(() => {
		const signals = new Effect();

		// Wire screen source -> screen broadcast
		signals.effect((effect) => {
			const source = effect.get(screenSource.source);
			if (!source) return;
			if (source.video) screenBroadcast.video.source.set(source.video);
			if (source.audio) screenBroadcast.audio.source.set(source.audio);
		});

		// Stop sharing when user ends capture via browser UI
		signals.effect((effect) => {
			const source = effect.get(screenSource.source);
			if (!source?.video) return;

			const onEnded = () => { screenEnabled.current.set(false); };
			source.video.addEventListener("ended", onEnded);
			effect.cleanup(() => source.video?.removeEventListener("ended", onEnded));
		});

		return () => {
			signals.close();
			screenBroadcast.close();
			screenSource.close();
		};
	}, [screenBroadcast, screenSource]);

	const toggleScreen = useCallback(() => {
		screenEnabled.current.set(!screenEnabled.current.peek());
	}, []);

	const enabled = useSignal(screenEnabled.current);

	return {
		screenEnabled: enabled,
		toggleScreen,
		screenBroadcast,
	};
}
