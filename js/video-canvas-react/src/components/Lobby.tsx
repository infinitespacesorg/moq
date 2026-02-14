import { useState, useEffect } from "react";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";

interface LobbyProps {
	onJoin: (roomId: string, userName: string) => void;
	initialRoom?: string;
	initialName?: string;
}

function randomRoomName(): string {
	return uniqueNamesGenerator({ dictionaries: [adjectives, adjectives, animals], separator: "-", length: 3 });
}

function checkBrowserSupport(): string | null {
	if (typeof WebTransport === "undefined") return "WebTransport is not supported in this browser. Use Chrome 97+ or Edge 97+.";
	if (!navigator.mediaDevices?.getUserMedia) return "getUserMedia is not available. Camera/mic access requires HTTPS.";
	if (!("MediaStreamTrackProcessor" in window)) return "MediaStreamTrackProcessor is not supported. Use Chrome 94+ or Edge 94+.";
	return null;
}

/**
 * Pre-join lobby screen.
 *
 * Room name input, user name input, join button, and browser capability check.
 */
export function Lobby({ onJoin, initialRoom, initialName }: LobbyProps) {
	const [roomId, setRoomId] = useState(initialRoom ?? randomRoomName());
	const [name, setName] = useState(initialName ?? localStorage.getItem("isp:name") ?? "");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const unsupported = checkBrowserSupport();
		if (unsupported) {
			setError(unsupported);
		}
	}, []);

	const handleJoin = () => {
		const trimmedRoom = roomId.trim();
		const trimmedName = name.trim() || `user-${Math.random().toString(36).slice(2, 6)}`;

		if (!trimmedRoom) return;

		localStorage.setItem("isp:name", trimmedName);

		// Update URL without reload
		const url = new URL(window.location.href);
		url.searchParams.set("room", trimmedRoom);
		url.searchParams.set("name", trimmedName);
		window.history.replaceState(null, "", url.toString());

		onJoin(trimmedRoom, trimmedName);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleJoin();
	};

	if (error) {
		return (
			<div className="lobby">
				<div className="lobby-card">
					<h1>Unsupported Browser</h1>
					<p className="lobby-subtitle">{error}</p>
				</div>
			</div>
		);
	}

	const shareUrl = roomId.trim()
		? (() => { const u = new URL(window.location.href); u.search = ""; u.hash = ""; u.searchParams.set("room", roomId.trim()); return u.toString(); })()
		: "";

	return (
		<div className="lobby">
			<div className="lobby-card">
				<h1>Video Canvas</h1>
				<p className="lobby-subtitle">Join or create a video room</p>

				<div className="lobby-field">
					<label htmlFor="room-input">Room</label>
					<input
						id="room-input"
						type="text"
						value={roomId}
						onChange={(e) => setRoomId(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Enter room name"
					/>
				</div>

				<div className="lobby-field">
					<label htmlFor="name-input">Your Name</label>
					<input
						id="name-input"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Enter your name"
					/>
				</div>

				<button className="lobby-join-btn" onClick={handleJoin}>
					Join Room
				</button>

				{shareUrl && <p className="lobby-share-url">{shareUrl}</p>}
			</div>
		</div>
	);
}
