import React, { useState } from 'react';
import './ChatBot.css';
import { MessageCircle } from 'lucide-react'; // You can replace with any icon
import { BACKEND_API_URL } from '../../util';

const ChatBot = ({ isPWAView = false }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setOpen(!open);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setChat(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_API_URL}/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) {
        throw new Error(data?.error || `Chat request failed (${res.status})`);
      }

      const botMessage = { sender: 'bot', text: data.reply };
      setChat(prev => [...prev, botMessage]);
    } catch (error) {
      setChat(prev => [...prev, { sender: 'bot', text: error.message || 'Failed to connect. Try again later.' }]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <div className={`chat-icon ${isPWAView ? 'pwa-chat-icon' : ''}`} onClick={toggleChat}>
        <MessageCircle size={28} color="white" />
      </div>

      {/* Chat Window */}
      {open && (
        <div className={`chat-container ${isPWAView ? 'pwa-chat-container' : ''}`}>
          <div className="chat-header">
            <span>💬 AI Health Assistant</span>
            <button onClick={toggleChat}>×</button>
          </div>

          <div className="chat-messages">
            {chat.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'bot'}`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="chat-bubble bot">Typing...</div>}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Describe your symptoms..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
