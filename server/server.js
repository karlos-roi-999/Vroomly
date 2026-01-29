const express = require("express");
const cors = require("cors");
const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

const PORT = 5000;
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST']
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
    cookie: {secure:false}
}));
app.use('/listings', listingsRouter);
app.use('/auth', authRouter);

io.on('connection', (socket) => {
    console.log(socket.id); 
})

server.listen(PORT, () => {
    console.log(`Connected on port: ${PORT}!!!`);
});
