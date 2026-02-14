import react from "@moq/signals/react";
import type { Getter } from "@moq/signals";

/**
 * Subscribe to a @moq/signals Getter in React.
 * Re-renders when the signal value changes.
 */
export function useSignal<T>(signal: Getter<T>): T {
	return react(signal);
}
