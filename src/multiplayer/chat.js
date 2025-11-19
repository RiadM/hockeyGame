// Chat Module - Chat messages, UI updates
// Handles: sendChatMessage, addChatMessage, chat history

class ChatManager {
    constructor() {
        this.messages = [];
        this.maxMessages = 50;
    }

    addMessage(playerName, text) {
        const msg = {
            playerName: playerName,
            text: text.trim().substring(0, 200),
            timestamp: Date.now()
        };

        this.messages.push(msg);
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        return msg;
    }

    addChatMessage(username, text, save = true) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';

        const userSpan = document.createElement('span');
        userSpan.className = 'chat-message-user';
        // textContent automatically escapes HTML, preventing XSS
        userSpan.textContent = `${username}:`;

        const textSpan = document.createElement('span');
        textSpan.className = 'chat-message-text';
        // textContent automatically escapes HTML, preventing XSS
        textSpan.textContent = text;

        messageEl.appendChild(userSpan);
        messageEl.appendChild(textSpan);
        chatMessages.appendChild(messageEl);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        while (chatMessages.children.length > this.maxMessages) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }

    loadChatHistory(messages) {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            // Clear chat safely
            chatMessages.textContent = '';
        }
        messages.forEach(msg => {
            this.addChatMessage(msg.playerName, msg.text, false);
        });
    }

    getMessages() {
        return this.messages;
    }
}

export { ChatManager };
