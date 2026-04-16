

// Use POSTGRES data later so u can store messages from users
// const inquiries = [
//   {
//     id: 1,
//     productName: 'Honda Civic 2020',
//     messages: [
//       { sender: 'self', text: 'Is this still available?' },
//       { sender: 'other', text: 'Yes, still available!' },
//       { sender: 'self', text: 'Can I come see it this weekend?' },
//       { sender: 'other', text: 'Sure! What time?' },
//     ]
//   },
//   {
//     id: 2,
//     productName: 'Ford F-150',
//     messages: [
//       { sender: 'self', text: 'Can you send more pictures?' },
//       { sender: 'other', text: 'Uploading now.' },
//       { sender: 'self', text: 'Thanks!' }
//     ]
//   },
// ];

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../SocketContext';

const ChatContainer = ({ chat, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socket = useSocket();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth' });
  };

  useEffect(() => {
    if (!chat) return;
    axios.get(
      `http://localhost:5000/conversations/${chat.listing_id}/${chat.other_user_id}/messages`, {withCredentials: true}
    )
    .then(response => {
      setMessages(response.data);
    })
    .catch(err => {
      console.error('Error fetching messages:', err);
    })
  }, [chat]);

  useEffect(() => {
    if(!socket) return;

    const handleReceive = (messageData) => {
      if (
        chat &&
        messageData.listing_id === chat.listing_id &&
        (messageData.sender_id === chat.other_user_id || messageData.receiver_id === chat.other_user_id)
      ) {
        setMessages(prev => [...prev, messageData]);
      }
    };

    socket.on('receiveMessage', handleReceive);

    return () => {
      socket.off('receiveMessage', handleReceive);
    };
  }, [socket, chat]);

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  const handleSend = async () => {
        if (!newMessage.trim() || !chat) return;

        try {
            // Step 1: Save to the database
            const response = await axios.post(
                'http://localhost:5000/messages',
                {
                    receiver_id: chat.other_user_id,
                    listing_id: chat.listing_id,
                    content: newMessage
                },
                { withCredentials: true }
            );

            const savedMessage = response.data;

            // Step 2: Add the message to our local state so we see it instantly
            setMessages(prev => [...prev, savedMessage]);

            // Step 3: Send via socket so the other user gets it in realtime
            socket.emit('sendMessage', savedMessage);

            // Step 4: Clear the input field
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    // Handle pressing Enter to send
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Show a placeholder when no chat is selected
    if (!chat) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
                <div style={{ textAlign: 'center', color: '#8f91a2' }}>
                    <i className="fa-regular fa-comments" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
                    <p>Select a conversation to start messaging</p>
                </div>
            </div>
        );
    }


  return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8f9fa' }}>
            {/* Chat header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #dcedff', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: 0, color: '#343f3e' }}>
                    {chat.car_year} {chat.car_make} {chat.car_model}
                </h4>
                <span style={{ fontSize: '0.85rem', color: '#8f91a2' }}>
                    Chatting with {chat.other_username}
                </span>
            </div>

            {/* Messages area */}
            <div id='msgContainer' style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg, idx) => (
                    <div
                        key={msg.id || idx}
                        style={{
                            alignSelf: msg.sender_id === currentUser.id ? 'flex-end' : 'flex-start',
                            background: msg.sender_id === currentUser.id ? '#343f3e' : 'white',
                            color: msg.sender_id === currentUser.id ? 'white' : '#505a5b',
                            borderRadius: '18px',
                            padding: '12px 20px',
                            maxWidth: '60%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            borderBottomRightRadius: msg.sender_id === currentUser.id ? '4px' : '18px',
                            borderBottomLeftRadius: msg.sender_id === currentUser.id ? '18px' : '4px'
                        }}
                    >
                        {msg.content}
                    </div>
                ))}
                {/* Invisible element at the bottom — scrollIntoView targets this */}
                <div ref={messagesEndRef} />
            </div>

            {/* Message input area */}
            <div style={{ padding: '1.5rem', backgroundColor: 'white', borderTop: '1px solid #dcedff' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        className="input-focus"
                        type='text'
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        style={{
                            flex: 1, padding: '1rem', borderRadius: '30px',
                            border: '1px solid #dcedff', backgroundColor: '#f8f9fa'
                        }}
                        placeholder='Type a message...'
                    />
                    <button
                        className="btn-primary"
                        onClick={handleSend}
                        style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            border: 'none', backgroundColor: '#343f3e', color: 'white', cursor: 'pointer'
                        }}
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ChatContainer;