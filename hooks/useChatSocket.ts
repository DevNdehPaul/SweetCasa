import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "../constants/api";

export type LiveMessage = {
  id: string;
  text: string;
  fromMe: boolean;
  seen: boolean;
  time: string;
  conversationId?: number;
  senderId?: number;
  senderName?: string;
};

/**
 * Establishes a Socket.IO connection to the SweetCasa backend,
 * authenticated with the user's JWT. Returns the socket and a
 * connected state so screens can render live incoming messages.
 *
 * Usage:
 *   const { socket, connected } = useChatSocket();
 *   socket?.on('new_message', (msg) => ...);
 */
export function useChatSocket() {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let mounted = true;
    let activeSocket: Socket | null = null;

    const connect = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // Create a single shared connection per app session.
      if (!socketRef.current) {
        socketRef.current = io(BASE_URL, {
          transports: ["websocket", "polling"] as const,
          auth: { token },
          reconnectionAttempts: 5,
          reconnectionDelay: 1500,
        });
      }
      activeSocket = socketRef.current;

      activeSocket.on("connect", () => {
        if (mounted) setConnected(true);
      });
      activeSocket.on("disconnect", () => {
        if (mounted) setConnected(false);
      });

      if (mounted) setSocket(activeSocket);
    };

    connect();

    return () => {
      mounted = false;
      // Don't destroy the shared socket on unmount — other screens may use it.
    };
  }, []);

  return { socket, connected };
}

/**
 * Joins a conversation room so the client receives `message:new` events.
 */
export function useConversationSocket(conversationId?: number | string) {
  const { socket, connected } = useChatSocket();
  const [messages, setMessages] = useState<LiveMessage[]>([]);

  useEffect(() => {
    if (!socket || !connected || !conversationId) return;

    socket.emit("join_conversation", Number(conversationId));

    const handler = (msg: LiveMessage) => {
      // Ignore messages we sent (they already appear optimistically)
      if (msg.fromMe) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("message:new", handler);
    return () => {
      socket.off("message:new", handler);
    };
  }, [socket, connected, conversationId]);

  return { socket, connected, liveMessages: messages };
}
