import { state } from "./state.ts";
import { $chatBtn, $chatPanel, $chatMessages, $chatInput } from "./dom.ts";

export function appendSystemMessage(text: string) {
	const el = document.createElement("div");
	el.className = "chat-msg-system";
	el.textContent = text;
	$chatMessages.appendChild(el);
	$chatMessages.scrollTop = $chatMessages.scrollHeight;
}

export function appendChatMessage(sender: string, text: string) {
	state.chatMessages.push({ sender, text });
	renderChatMessage(sender, text);

	// Show unread indicator if chat panel is closed
	if (!state.chatOpen) {
		$chatBtn.classList.add("has-unread");
	}
}

function renderChatMessage(sender: string, text: string) {
	const el = document.createElement("div");
	el.className = "chat-msg";

	const senderSpan = document.createElement("span");
	senderSpan.className = "chat-msg-sender";
	senderSpan.textContent = sender;

	const textSpan = document.createElement("span");
	textSpan.className = "chat-msg-text";
	textSpan.textContent = text;

	el.appendChild(senderSpan);
	el.appendChild(textSpan);
	$chatMessages.appendChild(el);

	// Auto-scroll to bottom
	$chatMessages.scrollTop = $chatMessages.scrollHeight;
}

export function sendChatMessage(text: string) {
	if (!text || !state.publishBroadcast) return;
	state.publishBroadcast.chat.message.latest.set(text);
	appendChatMessage(`${state.userName} (you)`, text);
}

export function toggleChat() {
	state.chatOpen = !state.chatOpen;
	$chatPanel.classList.toggle("hidden", !state.chatOpen);
	$chatBtn.classList.toggle("active", state.chatOpen);
	$chatBtn.setAttribute("aria-pressed", String(state.chatOpen));

	if (state.chatOpen) {
		$chatBtn.classList.remove("has-unread");
		$chatInput.focus();
		$chatMessages.scrollTop = $chatMessages.scrollHeight;
	}
}

export function resetChat() {
	$chatBtn.classList.remove("active", "has-unread");
	$chatPanel.classList.add("hidden");
	$chatMessages.innerHTML = "";
	state.chatMessages = [];
	state.chatOpen = false;
}
