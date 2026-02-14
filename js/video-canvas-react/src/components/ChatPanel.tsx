import { useRef, useEffect, useState } from "react";
import type { ChatMessage } from "../hooks/useChat.ts";

interface ChatPanelProps {
	messages: readonly ChatMessage[];
	onSend: (text: string) => void;
	visible: boolean;
	onClose: () => void;
}

/**
 * Collapsible chat sidebar panel.
 *
 * Shows message list with auto-scroll, input form, and close button.
 */
export function ChatPanel({ messages, onSend, visible, onClose }: ChatPanelProps) {
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	// Focus input when panel opens
	useEffect(() => {
		if (visible) {
			inputRef.current?.focus();
		}
	}, [visible]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = input.trim();
		if (text) {
			onSend(text);
			setInput("");
		}
	};

	if (!visible) return null;

	return (
		<aside className="chat-panel" role="log" aria-label="Chat">
			<div className="chat-header">
				<span>Chat</span>
				<button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
					&times;
				</button>
			</div>

			<div className="chat-messages">
				{messages.map((msg, i) => (
					<div key={i} className={msg.system ? "chat-msg-system" : "chat-msg"}>
						{msg.system ? (
							msg.text
						) : (
							<>
								<span className="chat-msg-sender">{msg.sender}</span>
								<span className="chat-msg-text">{msg.text}</span>
							</>
						)}
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<form className="chat-form" onSubmit={handleSubmit}>
				<input
					ref={inputRef}
					className="chat-input"
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type a message..."
					aria-label="Chat message"
				/>
			</form>
		</aside>
	);
}
