import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = `http://${window.location.hostname}:4000`;

const SocketContext = createContext({
  socket: null,
  connected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to backend real-time server');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket] Disconnected from backend real-time server');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
