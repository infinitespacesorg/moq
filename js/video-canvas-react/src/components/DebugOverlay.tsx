import { useEffect, useState } from "react";
import type { RoomParticipant } from "../hooks/useRoom.ts";

type ReloadStatus = "connecting" | "connected" | "disconnected";

interface DebugOverlayProps {
	relayUrl: string;
	status: ReloadStatus;
	userName: string;
	remotes: ReadonlyMap<string, RoomParticipant>;
	micEnabled: boolean;
	camEnabled: boolean;
	screenEnabled: boolean;
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
		<pre className="debug-overlay">
			{`relay: ${relayUrl}\n`}
			{`conn:  ${status}\n`}
			{`user:  ${userName || "n/a"}\n`}
			{`remote tiles: ${remotes.size}\n`}
			{remotePaths ? `  ${remotePaths}\n` : ""}
			{`mic: ${micEnabled}  cam: ${camEnabled}  screen: ${screenEnabled}`}
		</pre>
	);
}
