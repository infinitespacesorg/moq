import { useState, useCallback, useEffect } from "react";
import { Moq } from "@moq/hang";
import { useConnection } from "../hooks/useConnection.ts";
import { useRoom } from "../hooks/useRoom.ts";
import { useBroadcast } from "../hooks/useBroadcast.ts";
import { useScreenShare } from "../hooks/useScreenShare.ts";
import { useChat } from "../hooks/useChat.ts";
import { useLayoutPosition } from "../hooks/useLayoutPosition.ts";
import { Lobby } from "./Lobby.tsx";
import { VideoGrid } from "./VideoGrid.tsx";
import { Controls } from "./Controls.tsx";
import { ChatPanel } from "./ChatPanel.tsx";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { DebugOverlay } from "./DebugOverlay.tsx";

export interface VideoCanvasProps {
	/** MoQ relay URL. Defaults to VITE_RELAY_URL or localhost:4443/anon. */
	relayUrl?: string;
	/** Pre-fill room name from props (overrides URL param). */
	initialRoom?: string;
	/** Pre-fill user name from props (overrides URL param). */
	initialName?: string;
	/** Initial dock position for controls. Overridden by localStorage if set. */
	initialDock?: "top" | "right" | "bottom" | "left";
}

function parseURL(): { room?: string; name?: string } {
	const params = new URLSearchParams(window.location.search);
	return {
		room: params.get("room") ?? undefined,
		name: params.get("name") ?? undefined,
	};
}

/**
 * Top-level MoQ Video Canvas component.
 *
 * Renders a lobby (pre-join) or the active video call room.
 * Manages connection, room, broadcast, screen share, and chat lifecycle.
 */
export function VideoCanvas({ relayUrl, initialRoom, initialName, initialDock }: VideoCanvasProps) {
	const defaultRelayUrl = relayUrl ?? (typeof import.meta !== "undefined" ? import.meta.env?.VITE_RELAY_URL : undefined) ?? "http://localhost:4443/anon";

	const urlParams = parseURL();
	const [joined, setJoined] = useState<{ roomId: string; userName: string } | null>(
		// Auto-join if room is in URL
		urlParams.room ? { roomId: urlParams.room, userName: urlParams.name ?? initialName ?? "" } : null,
	);

	const handleJoin = useCallback((roomId: string, userName: string) => {
		setJoined({ roomId, userName });
	}, []);

	const handleLeave = useCallback(() => {
		setJoined(null);
		// Clean URL
		const url = new URL(window.location.href);
		url.search = "";
		window.history.replaceState(null, "", url.toString());
	}, []);

	if (!joined) {
		return (
			<Lobby
				onJoin={handleJoin}
				initialRoom={initialRoom ?? urlParams.room}
				initialName={initialName ?? urlParams.name}
			/>
		);
	}

	return (
		<RoomView
			relayUrl={defaultRelayUrl}
			roomId={joined.roomId}
			userName={joined.userName}
			onLeave={handleLeave}
			initialDock={initialDock}
		/>
	);
}

interface RoomViewProps {
	relayUrl: string;
	roomId: string;
	userName: string;
	onLeave: () => void;
	initialDock?: "top" | "right" | "bottom" | "left";
}

/**
 * Active room view — rendered after joining.
 *
 * Manages all MoQ connections, broadcasting, and participant tracking.
 */
function RoomView({ relayUrl, roomId, userName, onLeave, initialDock }: RoomViewProps) {
	const { connection, status } = useConnection(relayUrl);
	const { position: dock, cyclePosition: cycleDock } = useLayoutPosition(initialDock);

	const broadcastPath = `${roomId}/${userName}`;
	const { broadcast, camera, microphone, micEnabled, camEnabled, toggleMic, toggleCam } = useBroadcast(connection, broadcastPath);
	const { screenEnabled, toggleScreen, screenBroadcast } = useScreenShare(connection, roomId, userName);

	// Settings panel
	const [settingsOpen, setSettingsOpen] = useState(false);
	const toggleSettings = useCallback(() => {
		setSettingsOpen((prev) => !prev);
	}, []);

	const { room, remotes } = useRoom(connection, roomId);

	// Register local broadcasts for preview
	useEffect(() => {
		const mainPath = Moq.Path.from(roomId, userName);
		const screenPath = Moq.Path.from(roomId, `${userName}-screen`);

		room.preview(mainPath, broadcast);
		room.preview(screenPath, screenBroadcast);

		return () => {
			room.unpreview(mainPath);
			room.unpreview(screenPath);
		};
	}, [room, broadcast, screenBroadcast, roomId, userName]);

	// Chat
	const { messages, send } = useChat(broadcast, remotes, userName);
	const [chatOpen, setChatOpen] = useState(false);
	const [unreadChat, setUnreadChat] = useState(false);

	// Mark unread when new messages arrive and chat is closed
	useEffect(() => {
		if (!chatOpen && messages.length > 0) {
			setUnreadChat(true);
		}
	}, [messages.length, chatOpen]);

	const toggleChat = useCallback(() => {
		setChatOpen((prev) => {
			if (!prev) setUnreadChat(false);
			return !prev;
		});
	}, []);

	const handleCopyLink = useCallback(() => {
		const url = new URL(window.location.href);
		url.search = "";
		url.hash = "";
		url.searchParams.set("room", roomId);
		navigator.clipboard.writeText(url.toString());
	}, [roomId]);

	return (
		<div className="room" data-dock={dock}>
			{/* Header */}
			<header className="room-header" role="banner">
				<span className="room-name">{roomId}</span>
				<span className={`connection-status status-${status}`} title={`Relay: ${relayUrl}\nStatus: ${status}`}>
					{status}
				</span>
			</header>

			{/* Video Grid */}
			<VideoGrid
				broadcast={broadcast}
				userName={userName}
				remotes={remotes}
				showLocal
			/>

			{/* Controls */}
			<Controls
				micEnabled={micEnabled}
				camEnabled={camEnabled}
				screenEnabled={screenEnabled}
				chatOpen={chatOpen}
				settingsOpen={settingsOpen}
				onToggleMic={toggleMic}
				onToggleCam={toggleCam}
				onToggleScreen={toggleScreen}
				onToggleChat={toggleChat}
				onToggleSettings={toggleSettings}
				onCopyLink={handleCopyLink}
				onLeave={onLeave}
				unreadChat={unreadChat}
				dock={dock}
				onCycleDock={cycleDock}
			/>

			{/* Settings Panel */}
			<SettingsPanel
				camera={camera}
				microphone={microphone}
				visible={settingsOpen}
				onClose={toggleSettings}
				dock={dock}
			/>

			{/* Chat Panel */}
			<ChatPanel
				messages={messages}
				onSend={send}
				visible={chatOpen}
				onClose={toggleChat}
				dock={dock}
			/>

			{/* Debug Overlay */}
			<DebugOverlay
				relayUrl={relayUrl}
				status={status}
				userName={userName}
				remotes={remotes}
				micEnabled={micEnabled}
				camEnabled={camEnabled}
				screenEnabled={screenEnabled}
				dock={dock}
			/>
		</div>
	);
}
