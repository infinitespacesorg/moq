import { createRoot } from "react-dom/client";
import { VideoCanvas } from "./components/VideoCanvas.tsx";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// StrictMode removed: its double-mount cycle (mount → unmount → mount) destroys
// the MoQ connection's reactive root on the first unmount, and the cached useMemo
// instance can't recover. WebTransport connections are external resources that
// don't benefit from StrictMode's effect-replay checks.
createRoot(root).render(<VideoCanvas />);
