import { useMemo } from "react";
import type { Publish } from "@moq/hang";
import type { RoomParticipant } from "../hooks/useRoom.ts";
import { LocalTile } from "./LocalTile.tsx";
import { RemoteTile } from "./RemoteTile.tsx";

interface VideoGridProps {
	broadcast: Publish.Broadcast | undefined;
	userName: string;
	remotes: ReadonlyMap<string, RoomParticipant>;
	/** Whether the local user is broadcasting (show local tile). */
	showLocal: boolean;
}

/**
 * Adaptive grid layout for video tiles.
 *
 * Renders local + remote tiles in a CSS grid that adapts based on
 * participant count: 1=full, 2=side-by-side, 3-4=2x2, 5-9=3x3, 10+=4-col.
 * Screen shares get presentation layout (70% + sidebar).
 */
export function VideoGrid({ broadcast, userName, remotes, showLocal }: VideoGridProps) {
	const { regularRemotes, screenRemotes } = useMemo(() => {
		const regular: RoomParticipant[] = [];
		const screens: RoomParticipant[] = [];

		for (const [pathStr, participant] of remotes) {
			if (pathStr.endsWith("-screen")) {
				screens.push(participant);
			} else {
				regular.push(participant);
			}
		}

		return { regularRemotes: regular, screenRemotes: screens };
	}, [remotes]);

	const totalTiles = (showLocal ? 1 : 0) + regularRemotes.length + screenRemotes.length;
	const hasPresentation = screenRemotes.length === 1 && totalTiles > 1;

	const gridClass = hasPresentation
		? "video-grid layout-presentation"
		: `video-grid grid-${gridSize(totalTiles)}`;

	const sidebarRows = hasPresentation ? totalTiles - 1 : undefined;
	const gridStyle = sidebarRows
		? { gridTemplateRows: `repeat(${sidebarRows}, 1fr)` }
		: undefined;

	return (
		<div id="video-grid" className={gridClass} style={gridStyle} role="main" aria-label="Video grid">
			{/* Screen share tiles first (presentation) */}
			{screenRemotes.map((p) => (
				<RemoteTile key={String(p.path)} participant={p} isScreen />
			))}

			{/* Local tile */}
			{showLocal && broadcast && (
				<LocalTile broadcast={broadcast} userName={userName} />
			)}

			{/* Remote tiles */}
			{regularRemotes.map((p) => (
				<RemoteTile key={String(p.path)} participant={p} />
			))}
		</div>
	);
}

function gridSize(count: number): string {
	if (count <= 1) return "1";
	if (count === 2) return "2";
	if (count <= 4) return "4";
	if (count <= 9) return "9";
	return "many";
}
