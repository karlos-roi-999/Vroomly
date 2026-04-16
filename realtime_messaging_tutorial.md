# 🚗 Vroomly — Realtime Messaging with Socket.io

A step-by-step tutorial to add realtime messaging to your Vroomly app.

---

## Overview

Right now your chat page uses **hardcoded dummy data**. By the end of this tutorial you will have:

1. A Socket.io server running alongside your Express app
2. A REST endpoint to **insert new messages** into PostgreSQL
3. A REST endpoint to **fetch all messages between two users** (you already have this in `conversations.js` — we'll reuse it)
4. A React **Socket context** so any component can send/receive messages in realtime
5. A fully wired **ChatsBar** that loads real conversations from the database
6. A fully wired **ChatContainer** that displays real messages and sends new ones in realtime

### Architecture at a Glance

```
┌──────────────┐         WebSocket          ┌──────────────┐
│  React App   │ ◄═══════════════════════► │  Express +   │
│  (port 3000) │         HTTP REST          │  Socket.io   │
│              │ ◄─────────────────────────►│  (port 5000) │
└──────────────┘                            └──────┬───────┘
                                                   │ SQL
                                              ┌────▼────┐
                                              │ Postgres │
                                              │ vroomly  │
                                              └─────────┘
```

**How it works:** When User A sends a message, the React app emits a Socket.io event to the server. The server saves the message to PostgreSQL, then emits it to User B's socket. User B's React app picks it up and appends it to the chat — all without refreshing.

---

## Step 1 — Install Socket.io on the Server

**What to do:** Open a terminal in your `server/` folder and run:

```bash
npm install socket.io
```

**Why:** `socket.io` is the server-side library that upgrades a normal HTTP connection into a persistent WebSocket. A WebSocket stays open so both sides can push data to each other instantly, unlike HTTP where the client has to keep asking "any new messages?".

---

## Step 2 — Restructure `server.js` to Support Socket.io

**What to do:** Open [server.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/server/server.js) and **replace its entire contents** with the code below.

```js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');
const session = require('express-session');

const PORT = 5000;
const app = express();

// Create an HTTP server that wraps Express — Socket.io needs a raw HTTP server, not just the Express app
const server = http.createServer(app);

// Attach Socket.io to that HTTP server
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        credentials: true
    }
});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(session({
    secret: 'kAli_roG3r_999_i5_so_fR1ckin6_c0oL',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use('/listings', listingsRouter);
app.use('/auth', authRouter);
app.use('/conversations', conversationsRouter);
app.use('/messages', messagesRouter);

// ──── Socket.io connection handling ────
// This object maps a userId to their socketId so we know where to send messages
const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a client connects, they tell us who they are
    socket.on('register', (userId) => {
        onlineUsers[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // When a client sends a message, we relay it to the receiver if they're online
    socket.on('sendMessage', (messageData) => {
        const receiverSocketId = onlineUsers[messageData.receiver_id];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', messageData);
        }
    });

    // Clean up when a user disconnects
    socket.on('disconnect', () => {
        // Find and remove the disconnected user from our map
        for (const [userId, socketId] of Object.entries(onlineUsers)) {
            if (socketId === socket.id) {
                delete onlineUsers[userId];
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

// IMPORTANT: use server.listen, NOT app.listen — this starts both Express and Socket.io
server.listen(PORT, () => {
    console.log(`Connected on port: ${PORT}!!!`);
});
```

### Line-by-line explanation of what changed:

| Section | What it does | Why |
|---|---|---|
| `const http = require("http")` | Imports Node's built-in HTTP module | Socket.io cannot attach to an Express app directly — it needs the underlying HTTP server |
| `const { Server } = require("socket.io")` | Imports the Socket.io Server class | This is the main class that handles WebSocket connections |
| `const server = http.createServer(app)` | Wraps your Express app inside a raw HTTP server | Express normally creates an HTTP server internally via `app.listen()`, but Socket.io needs a reference to it, so we create it ourselves |
| `const io = new Server(server, { cors: ... })` | Creates the Socket.io server and attaches it to the HTTP server | The `cors` config allows your React app on port 3000 to connect. Without this, the browser would block the WebSocket connection |
| `const onlineUsers = {}` | An in-memory map of `{ userId: socketId }` | When User A sends a message to User B, we look up User B's socket ID here so we know *which* socket to deliver to |
| `socket.on('register', ...)` | Listens for clients identifying themselves after connecting | A WebSocket connection is anonymous by default — this event lets the client say "I am user #5" so we can map them |
| `socket.on('sendMessage', ...)` | Listens for outgoing message events from clients | When received, it looks up the receiver's socket and forwards the message in realtime |
| `io.to(receiverSocketId).emit(...)` | Sends data to one specific socket | This is the "push" — the receiver's browser gets the message without asking for it |
| `socket.on('disconnect', ...)` | Fires when a socket disconnects (tab closed, internet lost, etc.) | We clean up the `onlineUsers` map so we don't try sending messages to a dead socket |
| `server.listen(...)` | Starts the combined HTTP + WebSocket server | Using `app.listen()` would create a *separate* HTTP server that Socket.io isn't attached to — that's why we switch to `server.listen()` |

> [!IMPORTANT]
> Notice we also added two new route imports at the top:
> - `conversationsRouter` → you already wrote this file, it just wasn't registered in `server.js`
> - `messagesRouter` → you'll create this in the next step

---

## Step 3 — Create the Messages Route (`server/routes/messages.js`)

**What to do:** Create a new file at [server/routes/messages.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/server/routes/messages.js) and write:

```js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/authMiddleware');

// POST /messages — save a new message to the database
router.post('/', requireAuth, async (req, res) => {
    const senderId = req.session.user.id;
    const { receiver_id, listing_id, content } = req.body;

    // Validate that all required fields are present
    if (!receiver_id || !listing_id || !content) {
        return res.status(400).json({ message: 'receiver_id, listing_id, and content are required' });
    }

    try {
        // Insert the message and return the full row including the auto-generated id and timestamp
        const { rows } = await db.query(`
            INSERT INTO messages (sender_id, receiver_id, listing_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [senderId, receiver_id, listing_id, content]);

        // Also fetch the sender's username to include in the response
        const userResult = await db.query(`SELECT username FROM users WHERE id = $1`, [senderId]);

        res.status(201).json({
            ...rows[0],
            sender_username: userResult.rows[0].username
        });
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
```

### Why you're writing this:

Your `conversations.js` already has:
- **GET** `/conversations` — fetches the list of all conversations for the sidebar
- **GET** `/conversations/:listingId/:otherUserId/messages` — fetches all messages between two users about a specific listing
- **POST** `/conversations` — starts a *brand new* conversation (first message to a seller)

What's **missing** is a simple endpoint to save a follow-up message inside an existing conversation. That's what this route does.

| Line | What it does |
|---|---|
| `const senderId = req.session.user.id` | Gets the logged-in user's ID from the session — they're the sender |
| `const { receiver_id, listing_id, content } = req.body` | Extracts the message payload from the request body |
| `INSERT INTO messages ... RETURNING *` | Inserts a row into the `messages` table and returns the entire row back (including the auto-generated `id` and `created_at`) |
| `SELECT username FROM users WHERE id = $1` | Fetches the sender's username so the frontend can display who sent it without making a separate request |
| `res.status(201).json({ ...rows[0], sender_username: ... })` | Returns the new message with the username attached — `201` means "created successfully" |

---

## Step 4 — Install Socket.io Client on the Frontend

**What to do:** Open a terminal in your `client/` folder and run:

```bash
npm install socket.io-client
```

**Why:** `socket.io-client` is the browser-side companion to the server's `socket.io`. It creates the WebSocket connection from React to your server. You need both sides (server + client) for Socket.io to work.

---

## Step 5 — Create a Socket Context (`client/src/SocketContext.js`)

**What to do:** Create a new file at [client/src/SocketContext.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/client/src/SocketContext.js) and write:

```js
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Create a React Context — this lets any component in the tree access the socket
const SocketContext = createContext(null);

// Custom hook so components can do: const socket = useSocket();
export const useSocket = () => useContext(SocketContext);

// Provider component that wraps your app and manages the socket lifecycle
export const SocketProvider = ({ userId, children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Don't connect if no user is logged in
        if (!userId) return;

        // Create the socket connection to the server
        const newSocket = io('http://localhost:5000');

        // Once connected, tell the server who we are
        newSocket.on('connect', () => {
            newSocket.emit('register', userId);
        });

        setSocket(newSocket);

        // Cleanup: disconnect when the component unmounts or userId changes
        return () => {
            newSocket.disconnect();
        };
    }, [userId]); // Re-run if the logged-in user changes

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
```

### Why you're writing this:

Without a context, you'd have to create the socket connection in every component that needs realtime — and you'd end up with multiple connections to the server. A context creates **one socket** and shares it everywhere.

| Concept | Explanation |
|---|---|
| `createContext(null)` | Creates a "box" that React components can reach into. Starts as `null` (no socket yet) |
| `useSocket()` custom hook | A shortcut so components don't have to write `useContext(SocketContext)` every time |
| `SocketProvider` | A wrapper component. It creates the socket when a `userId` is available, and provides it to all child components via context |
| `io('http://localhost:5000')` | Connects to your server. The `socket.io-client` library handles the handshake, upgrade from HTTP to WebSocket, and auto-reconnects if the connection drops |
| `newSocket.emit('register', userId)` | Sends the `register` event to the server (remember Step 2?) so the server maps this socket to the user |
| `return () => newSocket.disconnect()` | The cleanup function — React calls this when the component unmounts or before re-running the effect. It closes the socket to prevent memory leaks |

---

## Step 6 — Wrap Your App with the Socket Provider

**What to do:** Open [App.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/client/src/App.js) and make two changes:

### 6a. Add the import at the top

Add this line alongside your other imports:

```js
import { SocketProvider } from './SocketContext';
```

### 6b. Wrap the `<Routes>` with `<SocketProvider>`

Change your return statement from:

```js
return (
    <Routes>
      ...all your routes...
    </Routes>
);
```

to:

```js
return (
    <SocketProvider userId={userLoggedIn.loggedIn ? userLoggedIn.user.id : null}>
      <Routes>
        ...all your routes (keep them exactly as they are)...
      </Routes>
    </SocketProvider>
);
```

### Why:

- `<SocketProvider>` wraps the entire app, so any page (Home, ChatsPage, etc.) can access the socket
- We pass `userId={userLoggedIn.loggedIn ? userLoggedIn.user.id : null}` — this means:
  - If the user **is logged in**, connect to Socket.io with their user ID  
  - If the user is **not logged in**, pass `null` and the socket won't connect (no point connecting an anonymous user)
- You already have `userLoggedIn` state in `App.js`, so this plugs right in

---

## Step 7 — Wire Up `ChatsBar` to Load Real Conversations

**What to do:** Open [ChatsBar.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/client/src/components/ChatsPageComponents/ChatsBar.js) and **replace its entire contents** with:

```js
import React, { useState, useEffect } from 'react';
import Chats from './Chats';
import axios from 'axios';

const ChatsBar = ({ onSelectChat, activeChat }) => {
    const [conversations, setConversations] = useState([]);

    // Fetch all conversations from the server when the component mounts
    useEffect(() => {
        axios.get('http://localhost:5000/conversations', { withCredentials: true })
            .then(response => {
                setConversations(response.data);
            })
            .catch(err => {
                console.error('Error fetching conversations:', err);
            });
    }, []);

    return (
        <aside style={{ flexBasis: '350px', backgroundColor: 'white', borderRight: '1px solid #dcedff', height: '100%', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #dcedff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                Messages
            </div>
            {conversations.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8f91a2' }}>
                    No conversations yet
                </div>
            )}
            {conversations.map((conv, idx) => (
                <Chats
                    key={`${conv.listing_id}-${conv.other_user_id}`}
                    itemPhoto={conv.item_photo || ''}
                    productName={`${conv.car_year} ${conv.car_make} ${conv.car_model}`}
                    latestMessage={conv.latest_content}
                    onClick={() => onSelectChat(conv)}
                    isActive={
                        activeChat &&
                        activeChat.listing_id === conv.listing_id &&
                        activeChat.other_user_id === conv.other_user_id
                    }
                />
            ))}
        </aside>
    );
};
export default ChatsBar;
```

### What changed and why:

| Before | After | Why |
|---|---|---|
| Hardcoded `inquiries` array | `useState` + `useEffect` with `axios.get` | Fetches real conversations from your `/conversations` endpoint (which queries the `messages` table) |
| `alert('Selected chat for ...')` | `onSelectChat(conv)` callback prop | When a user clicks a conversation, it tells the parent (`ChatsPage`) which conversation was selected, so `ChatContainer` can load the right messages |
| No active state | `isActive` prop | Highlights the currently selected conversation in the sidebar |
| key was `item.id` | key is `${conv.listing_id}-${conv.other_user_id}` | Conversations are uniquely identified by the combination of listing + other user, not a single ID |

> [!NOTE]
> The `Chats.js` component doesn't need changes — it already accepts `itemPhoto`, `productName`, `latestMessage`, and `onClick` as props. You may optionally add an active background style using the `isActive` prop if you want visual feedback, but it's not required for functionality.

---

## Step 8 — Rewrite `ChatContainer` for Realtime Messaging

**What to do:** Open [ChatContainer.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/client/src/components/ChatsPageComponents/ChatContainer.js) and **replace its entire contents** with:

```js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../SocketContext';

const ChatContainer = ({ chat, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const socket = useSocket();
    const messagesEndRef = useRef(null);

    // Auto-scroll to the bottom whenever messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch existing messages when the selected chat changes
    useEffect(() => {
        if (!chat) return;

        axios.get(
            `http://localhost:5000/conversations/${chat.listing_id}/${chat.other_user_id}/messages`,
            { withCredentials: true }
        )
        .then(response => {
            setMessages(response.data);
        })
        .catch(err => {
            console.error('Error fetching messages:', err);
        });
    }, [chat]);

    // Listen for incoming realtime messages
    useEffect(() => {
        if (!socket) return;

        const handleReceive = (messageData) => {
            // Only add the message if it belongs to the currently open conversation
            if (
                chat &&
                messageData.listing_id === chat.listing_id &&
                (messageData.sender_id === chat.other_user_id || messageData.receiver_id === chat.other_user_id)
            ) {
                setMessages(prev => [...prev, messageData]);
            }
        };

        socket.on('receiveMessage', handleReceive);

        // Cleanup: remove the listener when the component re-renders or unmounts
        return () => {
            socket.off('receiveMessage', handleReceive);
        };
    }, [socket, chat]);

    // Scroll to bottom whenever messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send a message: save to database via REST, then broadcast via socket
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
```

### Breakdown of the key pieces:

#### 1. State & refs
```js
const [messages, setMessages] = useState([]);    // The message history for the current chat
const [newMessage, setNewMessage] = useState(''); // What the user is typing
const socket = useSocket();                       // The shared socket from context (Step 5)
const messagesEndRef = useRef(null);              // A ref to an invisible div at the bottom for auto-scrolling
```

#### 2. Fetching messages (REST)
When `chat` changes (user clicks a different conversation in the sidebar), we make an HTTP GET to your existing endpoint in `conversations.js` to load the message history.

#### 3. Listening for realtime messages (Socket)
We attach a listener for `receiveMessage` events. When the server relays a message to us (because someone sent us a message), we check if it belongs to the currently open conversation and append it to `messages`.

> [!TIP]
> The `return () => socket.off(...)` cleanup is critical. Without it, every time the `chat` prop changes, a **new** listener would be added without removing the old one, causing duplicate messages to appear.

#### 4. Sending a message (REST + Socket)
The `handleSend` function does a **two-step process**:
1. **POST to `/messages`** — saves it to the database (so it's permanent)
2. **`socket.emit('sendMessage', ...)`** — pushes it to the other user in realtime (so it's instant)

We add the message to our own `messages` state immediately so the sender sees their message appear without waiting.

---

## Step 9 — Update `ChatsPage` to Manage State

**What to do:** Open [ChatsPage.js](file:///c:/KarlosSchoolFiles/ALL%20TERM%204%20STUFF/CPSC2600%20-%20FullStackWeb/Vroomly/client/src/pages/ChatsPage.js) and **replace its entire contents** with:

```js
import React, { useState, useEffect } from 'react';
import ChatsBar from '../components/ChatsPageComponents/ChatsBar';
import Navbar from '../components/HomeComponents/Navbar';
import ChatContainer from '../components/ChatsPageComponents/ChatContainer';
import axios from 'axios';

const ChatsPage = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Get the current logged-in user's info
    useEffect(() => {
        axios.get('http://localhost:5000/auth/me', { withCredentials: true })
            .then(response => {
                if (response.data.loggedIn) {
                    setCurrentUser(response.data.user);
                }
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Navbar pageLocation={ChatsPage.name} />
            <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0 }}>
                <ChatsBar
                    onSelectChat={setSelectedChat}
                    activeChat={selectedChat}
                />
                <ChatContainer
                    chat={selectedChat}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
};

export default ChatsPage;
```

### Why:

`ChatsPage` is the **parent** that coordinates the sidebar and the chat area. It:
- Holds `selectedChat` state — when the user clicks a conversation in `ChatsBar`, that conversation object flows down to `ChatContainer`
- Fetches `currentUser` — so `ChatContainer` knows which messages are "mine" (shown on the right in dark) vs. "theirs" (shown on the left in white)

---

## 🧪 Testing Your Implementation

Once you've completed all steps:

1. **Start your server:** `npm run dev` from the `server/` folder (starts both client and server)
2. **Open two browser windows** (or one regular + one incognito) and log in with two different accounts
3. From one account, go to a listing and start a conversation using the existing flow
4. Then go to `/chats` on both accounts — you should see the conversation in the sidebar
5. Click the conversation and try sending messages — they should appear on the other user's screen **instantly** without refreshing

### Complete file checklist

| File | Action |
|---|---|
| `server/package.json` | `socket.io` added via npm install |
| `server/server.js` | Rewritten to include `http.createServer`, Socket.io setup, and event handlers |
| `server/routes/messages.js` | **New file** — POST endpoint to save messages |
| `client/package.json` | `socket.io-client` added via npm install |
| `client/src/SocketContext.js` | **New file** — React context providing the socket instance |
| `client/src/App.js` | Wrapped `<Routes>` with `<SocketProvider>` |
| `client/src/components/ChatsPageComponents/ChatsBar.js` | Rewritten to fetch real conversations |
| `client/src/components/ChatsPageComponents/ChatContainer.js` | Rewritten for realtime send/receive |
| `client/src/pages/ChatsPage.js` | Rewritten to manage selected chat and current user state |

---

> [!TIP]
> **What about the `Chats.js` component?** You don't need to change it at all! It's already a clean presentational component that takes `itemPhoto`, `productName`, `latestMessage`, and `onClick` as props — which is exactly what the new `ChatsBar` passes to it.
