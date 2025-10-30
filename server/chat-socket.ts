import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  room: string;
  file?: {
    name: string;
    url: string;
    type: string;
  };
}

interface Room {
  id: string;
  name: string;
}

interface UserColors {
  [username: string]: {
    bg: string;
    text: string;
    border: string;
  };
}

// Armazenamento em memória (pode ser substituído por banco de dados)
let messages: Message[] = [];
let rooms: Room[] = [
  { id: "ids-produtos", name: "IDs de produtos" },
  { id: "geral", name: "Geral" },
  { id: "manutencoes", name: "Manutenções" }
];
let userColors: UserColors = {};

export function initChatSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/api/socket.io/"
  });

  io.on("connection", (socket) => {
    console.log(`[Chat Socket] Cliente conectado: ${socket.id}`);

    // Enviar estado inicial ao cliente
    socket.emit("init", {
      messages,
      rooms,
      userColors
    });

    // Receber nova mensagem
    socket.on("message:new", (message: Message) => {
      messages.push(message);
      // Broadcast para todos os clientes
      io.emit("message:new", message);
    });

    // Receber nova sala
    socket.on("room:new", (room: Room) => {
      if (!rooms.find(r => r.id === room.id)) {
        rooms.push(room);
        // Broadcast para todos os clientes
        io.emit("room:new", room);
      }
    });

    // Atualizar cores de usuário
    socket.on("userColors:update", (colors: UserColors) => {
      userColors = { ...userColors, ...colors };
      // Broadcast para todos os clientes
      io.emit("userColors:update", colors);
    });

    // Importar dados (backup)
    socket.on("data:import", (data: { messages: Message[], rooms: Room[], userColors: UserColors }) => {
      messages = data.messages || [];
      rooms = data.rooms || [];
      userColors = data.userColors || {};
      // Broadcast para todos os clientes
      io.emit("data:imported", { messages, rooms, userColors });
    });

    // Limpar dados
    socket.on("data:clear", () => {
      messages = [];
      rooms = [
        { id: "ids-produtos", name: "IDs de produtos" },
        { id: "geral", name: "Geral" },
        { id: "manutencoes", name: "Manutenções" }
      ];
      userColors = {};
      io.emit("data:cleared");
    });

    socket.on("disconnect", () => {
      console.log(`[Chat Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("[Chat Socket] WebSocket inicializado em /api/socket.io/");
  
  return io;
}
