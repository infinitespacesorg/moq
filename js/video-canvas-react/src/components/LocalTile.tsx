import { useRef, useEffect } from "react";
import type { Publish } from "@moq/hang";
import { Effect } from "@moq/signals";

interface LocalTileProps {
	broadcast: Publish.Broadcast;
	userName: string;
	isScreen?: boolean;
}

/**
 * Renders the local user's video preview.
 *
 * Uses a `<video>` element (muted) that mirrors the camera source from
 * the publish broadcast's video source signal.
 */
export function LocalTile({ broadcast, userName, isScreen }: LocalTileProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const signals = new Effect();

		// Wire video source to preview
		signals.effect((effect) => {
			const media = effect.get(broadcast.video.source);
			if (media) {
				video.srcObject = new MediaStream([media]);
			}
		});

		return () => {
			signals.close();
			video.srcObject = null;
		};
	}, [broadcast]);

	const className = isScreen ? "tile tile-screen" : "tile tile-local";

	return (
		<div className={className}>
			<video
				ref={videoRef}
				muted
				playsInline
				autoPlay
			/>
			<div className="tile-label">{userName} (you)</div>
		</div>
	);
}
