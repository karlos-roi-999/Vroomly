# Real-Time Chat Implementation Guide for Vroomly

This guide outlines the steps to implement real-time chat functionality using the existing `socket.io` setup in your project.

## 1. Server-Side Implementation (`server/server.js`)

You currently have the basic socket connection setup. You need to add event listeners to handle joining specific chat rooms and sending messages.

**Update the `io.on('connection', ...)` block in `server.js`:**

```javascript
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // 1. Join a specific chat room (e.g., based on a listing ID or user ID)
    socket.on('join_room', (data) => {
        socket.join(data); 
        console.log(`User with ID: ${socket.id} joined room: ${data}`);
    });

    // 2. Handle sending messages
    socket.on('send_message', (data) => {
        // data should look like: { room: 'room_id', author: 'username', message: 'Hello', time: '...' }
        console.log(data);
        
        // Broadcast the message to everyone in that specific room (including sender if needed, or exclude sender with socket.to()...)
        socket.to(data.room).emit('receive_message', data);
    });

    // 3. Handle disconnection
    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});
```

## 2. Client-Side Implementation (`client/src/pages/ChatsPage.js`)

You need to integrate the socket events into your React component state.

**Suggested changes for `ChatsPage.js`:**

1.  **Move the socket connection inside the component or a helper** (optional but cleaner) or keep the global `socket` instance.
2.  **Join a Room**: When the user selects a chat, emit the event.
3.  **Send Message**: Emit the `send_message` event.
4.  **Receive Message**: Listen for `receive_message` and update the message list.

**Example Code Snippet:**

```javascript
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// ... imports

const socket = io('http://localhost:5000'); // Ensure this matches your server port

const ChatsPage = () => {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    
    // Example: static room ID for testing, this should come from your selected chat
    const room = "123"; 

    useEffect(() => {
        // Join the room on mount or when room changes
        socket.emit("join_room", room);

        // Listen for incoming messages
        socket.on("receive_message", (data) => {
            setMessageList((list) => [...list, data]);
        });
        
        // Cleanup listener
        return () => socket.off("receive_message");
    }, [room]);

    const sendMessage = async () => {
        if (currentMessage !== "") {
            const messageData = {
                room: room,
                author: "Me", // Replace with logged-in user
                message: currentMessage,
                time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
            };

            await socket.emit("send_message", messageData);
            
            // Allow user to see their own message immediately
            setMessageList((list) => [...list, messageData]);
            setCurrentMessage("");
        }
    };

    return (
        // ... Render your ChatContainer and pass sendMessage/messageList as props
        <div>
            {/* Input field example */}
            <input 
                type="text" 
                value={currentMessage} 
                onChange={(event) => setCurrentMessage(event.target.value)} 
                onKeyPress={(event) => { event.key === "Enter" && sendMessage() }}
            />
            <button onClick={sendMessage}>Send</button>
            
            {/* Pass messageList to your ChatContainer to display messages */}
        </div>
    );
};
```

## 3. Database Integration (Optional but Recommended)

For persistent chat history:
1.  **On 'send_message' (Server)**: Before or after emitting to the room, valid and insert the message into your database using your `database.js` connection.
2.  **On Component Mount (Client)**: Fetch previous messages for the room using an HTTP GET request (e.g., `axios.get('/chats/:roomId')`) so the chat isn't empty on refresh.
