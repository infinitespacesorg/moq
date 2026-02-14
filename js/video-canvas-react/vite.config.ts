import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	build: {
		target: "esnext",
		sourcemap: process.env.NODE_ENV === "production" ? false : "inline",
	},
	optimizeDeps: {
		exclude: ["@libav.js/variant-opus-af"],
	},
});
