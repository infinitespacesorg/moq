import { useEffect, useMemo, useCallback, useRef } from "react";
import { Moq, type Publish, type Watch } from "@moq/hang";
import { Room } from "@moq/hang/meet";
import { Signal } from "@moq/signals";
import { useSyncExternalStore } from "react";

export interface RoomParticipant {
	path: Moq.Path.Valid;
	broadcast: Watch.Broadcast;
	name: string;
}

export interface LocalBroadcastEntry {
	path: Moq.Path.Valid;
	broadcast: Publish.Broadcast;
	name: string;
}

export interface UseRoomResult {
	/** The underlying Room instance. */
	room: Room;
	/** Remote participants currently in the room. */
	remotes: ReadonlyMap<string, RoomParticipant>;
	/** Local broadcast entries registered via preview. */
	locals: ReadonlyMap<string, LocalBroadcastEntry>;
}

/**
 * Join a MoQ room and track participants.
 *
 * Wraps `Room` from `@moq/hang/meet` — creates the room on mount, registers
 * onRemote/onLocal callbacks, and exposes the participant maps as React state.
 */
export function useRoom(
	connection: Moq.Connection.Reload,
	roomPath: string,
): UseRoomResult {
	const pathSignal = useRef(new Signal<Moq.Path.Valid | undefined>(Moq.Path.from(roomPath)));

	useEffect(() => {
		pathSignal.current.set(Moq.Path.from(roomPath));
	}, [roomPath]);

	const room = useMemo(() => {
		return new Room({
			connection: connection.established,
			path: pathSignal.current,
		});
	}, [connection]);

	// Track remotes + locals with a version counter for React re-render
	const remotesRef = useRef(new Map<string, RoomParticipant>());
	const localsRef = useRef(new Map<string, LocalBroadcastEntry>());
	const versionRef = useRef(0);
	const listenersRef = useRef(new Set<() => void>());

	const notify = useCallback(() => {
		versionRef.current++;
		for (const listener of listenersRef.current) {
			listener();
		}
	}, []);

	// Register callbacks
	useEffect(() => {
		room.onRemote((path, broadcast) => {
			const pathStr = String(path);
			if (broadcast) {
				const segments = pathStr.split("/");
				const name = segments[segments.length - 1] ?? pathStr;
				remotesRef.current.set(pathStr, { path, broadcast, name });
			} else {
				remotesRef.current.delete(pathStr);
			}
			notify();
		});

		room.onLocal((path, broadcast) => {
			const pathStr = String(path);
			if (broadcast) {
				const segments = pathStr.split("/");
				const name = segments[segments.length - 1] ?? pathStr;
				localsRef.current.set(pathStr, { path, broadcast, name });
			} else {
				localsRef.current.delete(pathStr);
			}
			notify();
		});

		return () => {
			room.close();
			remotesRef.current.clear();
			localsRef.current.clear();
		};
	}, [room, notify]);

	// Subscribe to version changes
	const subscribe = useCallback((callback: () => void) => {
		listenersRef.current.add(callback);
		return () => listenersRef.current.delete(callback);
	}, []);

	const getSnapshot = useCallback(() => {
		// Return a new object each time version changes to trigger re-render
		return versionRef.current;
	}, []);

	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	return {
		room,
		remotes: remotesRef.current,
		locals: localsRef.current,
	};
}
