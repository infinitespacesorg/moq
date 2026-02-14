import { useState, useCallback, useEffect, useRef } from "react";
import type { Publish } from "@moq/hang";
import { Effect } from "@moq/signals";
import type { RoomParticipant } from "./useRoom.ts";

export interface ChatMessage {
	sender: string;
	text: string;
	system?: boolean;
}

export interface UseChatResult {
	/** All chat messages (user + system). */
	messages: readonly ChatMessage[];
	/** Send a chat message. */
	send: (text: string) => void;
}

/**
 * Real-time chat over MoQ data tracks.
 *
 * Subscribes to incoming chat from all remote participants and sends
 * outgoing chat via the local broadcast's `chat.message.latest` signal.
 */
export function useChat(
	broadcast: Publish.Broadcast | undefined,
	remotes: ReadonlyMap<string, RoomParticipant>,
	userName: string,
): UseChatResult {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const subscribedRef = useRef(new Set<string>());
	const effectsRef = useRef(new Map<string, Effect>());

	// Subscribe to remote chat messages
	useEffect(() => {
		const currentPaths = new Set<string>();

		for (const [pathStr, participant] of remotes) {
			currentPaths.add(pathStr);

			if (subscribedRef.current.has(pathStr)) continue;
			subscribedRef.current.add(pathStr);

			// Enable chat message receiving
			participant.broadcast.chat.message.enabled.set(true);

			const effect = new Effect();
			effectsRef.current.set(pathStr, effect);

			effect.effect((eff) => {
				const msg = eff.get(participant.broadcast.chat.message.latest);
				if (!msg) return;
				setMessages((prev) => [...prev, { sender: participant.name, text: msg }]);
			});
		}

		// Clean up subscriptions for participants who left
		for (const pathStr of subscribedRef.current) {
			if (!currentPaths.has(pathStr)) {
				subscribedRef.current.delete(pathStr);
				const effect = effectsRef.current.get(pathStr);
				if (effect) {
					effect.close();
					effectsRef.current.delete(pathStr);
				}
			}
		}
	}, [remotes]);

	// Cleanup all effects on unmount
	useEffect(() => {
		return () => {
			for (const effect of effectsRef.current.values()) {
				effect.close();
			}
			effectsRef.current.clear();
			subscribedRef.current.clear();
		};
	}, []);

	const send = useCallback((text: string) => {
		if (!text || !broadcast) return;
		broadcast.chat.message.latest.set(text);
		setMessages((prev) => [...prev, { sender: `${userName} (you)`, text }]);
	}, [broadcast, userName]);

	const addSystemMessage = useCallback((text: string) => {
		setMessages((prev) => [...prev, { sender: "", text, system: true }]);
	}, []);

	return { messages, send, _addSystemMessage: addSystemMessage } as UseChatResult & { _addSystemMessage: (text: string) => void };
}
