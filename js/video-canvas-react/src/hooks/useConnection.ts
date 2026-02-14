import { useRef, useEffect, useMemo } from "react";
import { Moq } from "@moq/hang";
import { Signal } from "@moq/signals";
import { useSignal } from "./useSignal.ts";

type ReloadStatus = "connecting" | "connected" | "disconnected";

export interface UseConnectionResult {
	/** The Moq.Connection.Reload instance. */
	connection: Moq.Connection.Reload;
	/** Reactive connection status: "connecting" | "connected" | "disconnected" */
	status: ReloadStatus;
	/** The established connection (undefined when not connected). */
	established: Moq.Connection.Established | undefined;
}

/**
 * Manage a MoQ relay connection with auto-reconnect.
 *
 * Wraps `Moq.Connection.Reload` — creates the connection on mount,
 * closes it on unmount, and exposes reactive `status` and `established`.
 */
export function useConnection(relayUrl: string): UseConnectionResult {
	const urlSignal = useRef(new Signal<URL | undefined>(new URL(relayUrl)));

	// Update URL signal when prop changes
	useEffect(() => {
		urlSignal.current.set(new URL(relayUrl));
	}, [relayUrl]);

	const connection = useMemo(() => {
		return new Moq.Connection.Reload({
			url: urlSignal.current,
			enabled: true,
		});
	}, []);

	// Close connection on unmount
	useEffect(() => {
		return () => connection.close();
	}, [connection]);

	const status = useSignal(connection.status);
	const established = useSignal(connection.established);

	return { connection, status, established };
}
