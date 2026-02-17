import { useState, useCallback } from "react";

export type LayoutPosition = "top" | "right" | "bottom" | "left";

const STORAGE_KEY = "isp:layout-position";
const POSITIONS: LayoutPosition[] = ["bottom", "right", "top", "left"];

function readPosition(fallback: LayoutPosition = "bottom"): LayoutPosition {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && POSITIONS.includes(stored as LayoutPosition)) {
		return stored as LayoutPosition;
	}
	return fallback;
}

export interface UseLayoutPositionResult {
	position: LayoutPosition;
	setPosition: (pos: LayoutPosition) => void;
	cyclePosition: () => void;
}

/**
 * Manage the layout dock position (top/right/bottom/left).
 *
 * Persists to localStorage. Default: "bottom".
 */
export function useLayoutPosition(initialPosition?: LayoutPosition): UseLayoutPositionResult {
	const [position, setPositionState] = useState<LayoutPosition>(() => readPosition(initialPosition));

	const setPosition = useCallback((pos: LayoutPosition) => {
		setPositionState(pos);
		localStorage.setItem(STORAGE_KEY, pos);
	}, []);

	const cyclePosition = useCallback(() => {
		setPositionState((prev) => {
			const idx = POSITIONS.indexOf(prev);
			const next = POSITIONS[(idx + 1) % POSITIONS.length];
			localStorage.setItem(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { position, setPosition, cyclePosition };
}
