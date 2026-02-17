import { useEffect } from "react";
import type { LayoutPosition } from "../hooks/useLayoutPosition.ts";

const DOCK_ARROWS: Record<LayoutPosition, string> = {
	bottom: "\u2193", // ↓
	right: "\u2192",  // →
	top: "\u2191",    // ↑
	left: "\u2190",   // ←
};

interface ControlsProps {
	micEnabled: boolean;
	camEnabled: boolean;
	screenEnabled: boolean;
	chatOpen: boolean;
	settingsOpen: boolean;
	onToggleMic: () => void;
	onToggleCam: () => void;
	onToggleScreen: () => void;
	onToggleChat: () => void;
	onToggleSettings: () => void;
	onCopyLink: () => void;
	onLeave: () => void;
	unreadChat: boolean;
	dock: LayoutPosition;
	onCycleDock: () => void;
}

/**
 * Video call control bar.
 *
 * Mic/Cam/Screen/Settings/Chat toggle buttons, copy-link, and leave.
 * Keyboard shortcuts: M=mic, V=cam, S=screen, G=settings, C=chat.
 */
export function Controls({
	micEnabled,
	camEnabled,
	screenEnabled,
	chatOpen,
	settingsOpen,
	onToggleMic,
	onToggleCam,
	onToggleScreen,
	onToggleChat,
	onToggleSettings,
	onCopyLink,
	onLeave,
	unreadChat,
	dock,
	onCycleDock,
}: ControlsProps) {
	// Keyboard shortcuts (only when not typing in chat input)
	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
			switch (e.key.toLowerCase()) {
				case "m": onToggleMic(); break;
				case "v": onToggleCam(); break;
				case "s": onToggleScreen(); break;
				case "g": onToggleSettings(); break;
				case "c": onToggleChat(); break;
			}
		};
		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	}, [onToggleMic, onToggleCam, onToggleScreen, onToggleSettings, onToggleChat]);

	return (
		<nav className="controls" role="toolbar" aria-label="Call controls">
			<button
				className={`control-btn ${micEnabled ? "active" : "muted"}`}
				onClick={onToggleMic}
				aria-pressed={micEnabled}
				aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
				title="Toggle mic (M)"
			>
				{micEnabled ? "Mic On" : "Mic Off"}
			</button>

			<button
				className={`control-btn ${camEnabled ? "active" : "muted"}`}
				onClick={onToggleCam}
				aria-pressed={camEnabled}
				aria-label={camEnabled ? "Turn off camera" : "Turn on camera"}
				title="Toggle camera (V)"
			>
				{camEnabled ? "Cam On" : "Cam Off"}
			</button>

			<button
				className={`control-btn ${screenEnabled ? "active" : ""}`}
				onClick={onToggleScreen}
				aria-pressed={screenEnabled}
				aria-label={screenEnabled ? "Stop screen sharing" : "Share screen"}
				title="Toggle screen share (S)"
			>
				{screenEnabled ? "Stop Share" : "Screen"}
			</button>

			<button
				className={`control-btn ${settingsOpen ? "active" : ""}`}
				onClick={onToggleSettings}
				aria-pressed={settingsOpen}
				aria-label="Device settings"
				title="Device settings (G)"
			>
				Settings
			</button>

			<button
				className={`control-btn ${chatOpen ? "active" : ""} ${unreadChat ? "has-unread" : ""}`}
				onClick={onToggleChat}
				aria-pressed={chatOpen}
				aria-label="Toggle chat panel"
				title="Toggle chat (C)"
			>
				Chat
			</button>

			<button
				className="control-btn"
				onClick={onCopyLink}
				aria-label="Copy room link"
				title="Copy invite link"
			>
				Copy Link
			</button>

			<button
				className="control-btn control-btn-dock"
				onClick={onCycleDock}
				aria-label={`Dock controls: ${dock}`}
				title={`Dock: ${dock} (click to cycle)`}
			>
				{DOCK_ARROWS[dock]}
			</button>

			<button
				className="control-btn control-btn-leave"
				onClick={onLeave}
				aria-label="Leave room"
				title="Leave room"
			>
				Leave
			</button>
		</nav>
	);
}
