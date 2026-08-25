import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../../constants/api';

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

// BASE_URL is your REST base (e.g. https://api.sweetcasa.com) — Socket.IO
// upgrades over the same host/port, so no separate URL is needed.
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await AsyncStorage.getItem('token');
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    return new Promise<Socket>((resolve, reject) => {
      socket!.once('connect', () => resolve(socket!));
      socket!.once('connect_error', (err) => reject(err));
    });
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}