import { useCallback, useSyncExternalStore } from "react";
import type { Getter } from "./index";

// A helper to subscribe to a @moq/signals Getter in React.
// subscribe and getSnapshot must be stable references to prevent
// useSyncExternalStore from re-subscribing on every render, which
// can cause missed notifications during the useEffect cleanup/setup cycle.
export default function react<T>(signal: Getter<T>): T {
	const subscribe = useCallback((callback: () => void) => signal.subscribe(callback), [signal]);
	const getSnapshot = useCallback(() => signal.peek(), [signal]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
