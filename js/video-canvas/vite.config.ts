import { defineConfig } from "vite";

export default defineConfig({
	root: "src",
	build: {
		target: "esnext",
		sourcemap: process.env.NODE_ENV === "production" ? false : "inline",
	},
	server: {
		hmr: false,
	},
	optimizeDeps: {
		exclude: ["@libav.js/variant-opus-af"],
	},
});
