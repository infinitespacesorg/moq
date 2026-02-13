import type { Publish, Watch, Moq } from "@moq/hang";
import type { Room } from "@moq/hang/meet";
import { Signal, Effect } from "@moq/signals";

export const RELAY_URL: string = import.meta.env.VITE_RELAY_URL ?? "http://localhost:4443/anon";

export interface RemoteTileEntry {
	canvas: HTMLCanvasElement;
	renderer: Watch.Video.Renderer;
	emitter: Watch.Audio.Emitter;
	tile: HTMLDivElement;
}

export const state = {
	signals: new Effect(),
	micEnabled: new Signal(true),
	camEnabled: new Signal(true),
	room: undefined as Room | undefined,
	connection: undefined as Moq.Connection.Reload | undefined,
	publishBroadcast: undefined as Publish.Broadcast | undefined,
	camera: undefined as Publish.Source.Camera | undefined,
	microphone: undefined as Publish.Source.Microphone | undefined,
	screenEnabled: new Signal(false),
	screenSource: undefined as Publish.Source.Screen | undefined,
	screenBroadcast: undefined as Publish.Broadcast | undefined,
	remoteTiles: new Map<string, RemoteTileEntry>(),
	localTile: undefined as HTMLDivElement | undefined,
	chatMessages: [] as { sender: string; text: string }[],
	chatOpen: false,
	userName: "",
};
