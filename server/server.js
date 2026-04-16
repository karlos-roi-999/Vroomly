const express = require("express");
const cors = require("cors");
const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');
const conversationRourter = require('./routes/conversations');
const messageRouter = require('./routes/messages');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

const PORT = 5000;
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', 
        credentials: true
    }
})

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', 
    credentials: true
}));

app.use(session({
    secret: 'kAli_roG3r_999_i5_so_fR1ckin6_c0oL',
    resave: false,
    saveUninitialized: false,
    cookie: {secure:false}
}));

app.use('/listings', listingsRouter);
app.use('/auth', authRouter);
app.use('/conversations', conversationRourter);
app.use('/messages', messageRouter);

// Socket.io connection handling
// An object that maps a userId to their socketId so we know where to send messages
const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a client connects, they get sent to onlineUsers collection with their userId and socketId as key value pair
    socket.on('register', (userId) => {
        onlineUsers[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('sendMessage', (messageData) => {
        const receiverSocketId = onlineUsers[messageData.receiver_id];
        if(receiverSocketId){
            io.to(receiverSocketId).emit('receiveMessage', messageData);
        }
    });

    socket.on('disconnect', () => {
        for(const [userId, socketId] of Object.entries(onlineUsers)) {
            if (socketId === socket.id) {
                delete onlineUsers[userId];
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    })

})

server.listen(PORT, () => {
    console.log(`Connected on port: ${PORT}!!!`);
});
