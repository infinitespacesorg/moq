import { useEffect, useState } from "react";
import type { RoomParticipant } from "../hooks/useRoom.ts";
import type { LayoutPosition } from "../hooks/useLayoutPosition.ts";

type ReloadStatus = "connecting" | "connected" | "disconnected";

interface DebugOverlayProps {
	relayUrl: string;
	status: ReloadStatus;
	userName: string;
	remotes: ReadonlyMap<string, RoomParticipant>;
	micEnabled: boolean;
	camEnabled: boolean;
	screenEnabled: boolean;
	dock: LayoutPosition;
}

/**
 * Debug overlay toggled with Ctrl+D.
 *
 * Shows relay URL, connection status, user info, and participant list.
 */
export function DebugOverlay({
	relayUrl,
	status,
	userName,
	remotes,
	micEnabled,
	camEnabled,
	screenEnabled,
	dock,
}: DebugOverlayProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === "d") {
				e.preventDefault();
				setVisible((v) => !v);
			}
		};
		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	}, []);

	if (!visible) return null;

	const remotePaths = [...remotes.keys()].join("\n  ");

	return (
		<pre className="debug-overlay" data-dock={dock}>
			{`relay: ${relayUrl}\n`}
			{`conn:  ${status}\n`}
			{`user:  ${userName || "n/a"}\n`}
			{`remote tiles: ${remotes.size}\n`}
			{remotePaths ? `  ${remotePaths}\n` : ""}
			{`mic: ${micEnabled}  cam: ${camEnabled}  screen: ${screenEnabled}\n`}
			{`dock: ${dock}`}
		</pre>
	);
}
