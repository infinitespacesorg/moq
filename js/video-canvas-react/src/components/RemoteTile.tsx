import { useRef, useEffect } from "react";
import { Watch } from "@moq/hang";
import type { RoomParticipant } from "../hooks/useRoom.ts";

interface RemoteTileProps {
	participant: RoomParticipant;
	isScreen?: boolean;
}

/**
 * Renders a single remote participant's video + audio.
 *
 * Uses `Watch.Video.Renderer` to draw decoded frames to a `<canvas>`
 * and `Watch.Audio.Emitter` to play audio to speakers.
 */
export function RemoteTile({ participant, isScreen }: RemoteTileProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<Watch.Video.Renderer | null>(null);
	const emitterRef = useRef<Watch.Audio.Emitter | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Enable downloading
		participant.broadcast.enabled.set(true);

		// Create video renderer -> draws decoded frames to canvas
		const renderer = new Watch.Video.Renderer(participant.broadcast.video, { canvas });
		rendererRef.current = renderer;

		// Create audio emitter -> plays audio to speakers
		const emitter = new Watch.Audio.Emitter(participant.broadcast.audio);
		emitterRef.current = emitter;

		return () => {
			renderer.close();
			emitter.close();
			rendererRef.current = null;
			emitterRef.current = null;
		};
	}, [participant.broadcast]);

	const className = isScreen ? "tile tile-screen" : "tile";

	return (
		<div className={className}>
			<canvas ref={canvasRef} />
			<div className="tile-label">{participant.name}</div>
		</div>
	);
}
