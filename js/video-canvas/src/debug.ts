import { state, RELAY_URL } from "./state.ts";
import { $debugOverlay } from "./dom.ts";

let debugVisible = false;
let debugInterval: ReturnType<typeof setInterval> | undefined;

function updateDebugOverlay() {
	const connStatus = state.connection?.status.peek() ?? "n/a";
	const participants = state.remoteTiles.size;
	const remotes = [...state.remoteTiles.keys()].join("\n  ");

	$debugOverlay.textContent =
		`relay: ${RELAY_URL}\n` +
		`conn:  ${connStatus}\n` +
		`user:  ${state.userName || "n/a"}\n` +
		`remote tiles: ${participants}\n` +
		(remotes ? `  ${remotes}\n` : "") +
		`mic: ${state.micEnabled.peek()}  cam: ${state.camEnabled.peek()}  screen: ${state.screenEnabled.peek()}`;
}

export function setupDebug() {
	document.addEventListener("keydown", (e) => {
		if (e.ctrlKey && e.key === "d") {
			e.preventDefault();
			debugVisible = !debugVisible;
			$debugOverlay.classList.toggle("hidden", !debugVisible);

			if (debugVisible) {
				updateDebugOverlay();
				debugInterval = setInterval(updateDebugOverlay, 1000);
			} else {
				clearInterval(debugInterval);
			}
		}
	});
}
