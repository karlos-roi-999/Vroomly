import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client';

// Create a React Context - this lets any component in the tree access the socket
const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ userId, children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!userId) return;

        const newSocket = io('http://localhost:5000');
        
        newSocket.on('connect', () => {
            newSocket.emit('register', userId);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect()
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}