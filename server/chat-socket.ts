import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import fs from "fs";
import path from "path";

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

interface OrderItem {
  name: string;
  quantity: number;
  protocol?: string;
}

interface Order {
  id: string;
  customerName: string;
  orderDate: number;
  items: OrderItem[];
  status: {
    montagem: boolean;
    teste: boolean;
    gravacao: boolean;
    embalagem: boolean;
    enviado: boolean;
  };
  archived: boolean;
}

// Caminhos dos arquivos de persistência
const DATA_DIR = path.join(process.cwd(), "data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const USER_COLORS_FILE = path.join(DATA_DIR, "userColors.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Garantir que o diretório de dados existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Funções de persistência
function loadData<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`[Persistence] Erro ao carregar ${filePath}:`, error);
  }
  return defaultValue;
}

function saveData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`[Persistence] Erro ao salvar ${filePath}:`, error);
  }
}

// Carregar dados do disco ou usar valores padrão
let messages: Message[] = loadData<Message[]>(MESSAGES_FILE, []);
let rooms: Room[] = loadData<Room[]>(ROOMS_FILE, [
  { id: "ids-produtos", name: "IDs de produtos" },
  { id: "geral", name: "Geral" },
  { id: "manutencoes", name: "Manutenções" }
]);
let userColors: UserColors = loadData<UserColors>(USER_COLORS_FILE, {});
let orders: Order[] = loadData<Order[]>(ORDERS_FILE, []);

console.log(`[Persistence] Carregados ${messages.length} mensagens, ${rooms.length} salas, ${orders.length} pedidos`);

// Pedidos de exemplo removidos - agora usa persistência em disco

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

    // Enviar pedidos de produção
    socket.emit("production:init", {
      orders: orders.filter(o => !o.archived)
    });

    // Receber nova mensagem
    socket.on("message:new", (message: Message) => {
      messages.push(message);
      saveData(MESSAGES_FILE, messages);
      // Broadcast para todos os clientes
      io.emit("message:new", message);
    });

    // Receber nova sala
    socket.on("room:new", (room: Room) => {
      if (!rooms.find(r => r.id === room.id)) {
        rooms.push(room);
        saveData(ROOMS_FILE, rooms);
        // Broadcast para todos os clientes
        io.emit("room:new", room);
      }
    });

    // Atualizar cores de usuário
    socket.on("userColors:update", (colors: UserColors) => {
      userColors = { ...userColors, ...colors };
      saveData(USER_COLORS_FILE, userColors);
      // Broadcast para todos os clientes
      io.emit("userColors:update", colors);
    });

    // Importar dados (backup)
    socket.on("data:import", (data: { messages: Message[], rooms: Room[], userColors: UserColors }) => {
      messages = data.messages || [];
      rooms = data.rooms || [];
      userColors = data.userColors || {};
      saveData(MESSAGES_FILE, messages);
      saveData(ROOMS_FILE, rooms);
      saveData(USER_COLORS_FILE, userColors);
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
      saveData(MESSAGES_FILE, messages);
      saveData(ROOMS_FILE, rooms);
      saveData(USER_COLORS_FILE, userColors);
      io.emit("data:cleared");
    });

    // === PRODUÇÃO ===

    // Criar novo pedido
    socket.on("production:create", (order: Order) => {
      console.log("[Production Server] Recebeu pedido para criar:", order);
      orders.push(order);
      saveData(ORDERS_FILE, orders);
      console.log("[Production Server] Total de pedidos:", orders.length);
      console.log("[Production Server] Emitindo production:new para todos os clientes");
      io.emit("production:new", order);
    });

    // Atualizar pedido
    socket.on("production:update", (updatedOrder: Order) => {
      console.log("[Production Server] Recebeu pedido para atualizar:", updatedOrder.id);
      const index = orders.findIndex(o => o.id === updatedOrder.id);
      if (index !== -1) {
        orders[index] = updatedOrder;
        saveData(ORDERS_FILE, orders);
        console.log("[Production Server] Pedido atualizado, emitindo production:update");
        io.emit("production:update", updatedOrder);
      } else {
        console.log("[Production Server] Pedido não encontrado:", updatedOrder.id);
      }
    });

    // Excluir pedido
    socket.on("production:delete", (orderId: string) => {
      const index = orders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        orders.splice(index, 1);
        saveData(ORDERS_FILE, orders);
        io.emit("production:deleted", orderId);
      }
    });

    // Arquivar pedido
    socket.on("production:archive", (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.archived = true;
        saveData(ORDERS_FILE, orders);
        io.emit("production:archived", orderId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Chat Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("[Chat Socket] WebSocket inicializado em /api/socket.io/");
  
  return io;
}
