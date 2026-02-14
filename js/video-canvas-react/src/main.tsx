import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VideoCanvas } from "./components/VideoCanvas.tsx";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
	<StrictMode>
		<VideoCanvas />
	</StrictMode>,
);
