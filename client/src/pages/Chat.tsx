import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Smile, Download, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

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

const EMOJI_LIST = ["😀", "😂", "😍", "🤔", "👍", "👎", "🎉", "🔥", "💯", "✅", "❌", "⚠️", "📦", "🔧", "💡"];

// Hash SHA-256 das senhas
const ADMIN_PASSWORD_HASH = "deff8074061582012789787bc0552f560d780108d0379a7e070579d75dca3289"; // 05*Ewpkh
const USER_PASSWORD_HASH = "650cde4e22802fe76d94415abbf6b0ed2947c2973da9e15e48373ead6fac3ef0"; // Gs19372828*

// Função para gerar hash SHA-256
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Cores pastéis com tons bem distintos para fácil diferenciação
const PASTEL_COLORS = [
  { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-400" },      // Azul
  { bg: "bg-rose-200", text: "text-rose-900", border: "border-rose-400" },      // Rosa
  { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-400" }, // Verde
  { bg: "bg-amber-200", text: "text-amber-900", border: "border-amber-400" },    // Amarelo/Laranja
  { bg: "bg-purple-200", text: "text-purple-900", border: "border-purple-400" },  // Roxo
  { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-400" },      // Ciano
  { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-400" },      // Rosa Claro
  { bg: "bg-lime-200", text: "text-lime-900", border: "border-lime-400" },      // Verde Limão
  { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-400" },  // Laranja
  { bg: "bg-violet-200", text: "text-violet-900", border: "border-violet-400" },  // Violeta
  { bg: "bg-teal-200", text: "text-teal-900", border: "border-teal-400" },      // Verde-Azulado
  { bg: "bg-fuchsia-200", text: "text-fuchsia-900", border: "border-fuchsia-400" }, // Fúcsia
  { bg: "bg-indigo-200", text: "text-indigo-900", border: "border-indigo-400" },  // Índigo
  { bg: "bg-red-200", text: "text-red-900", border: "border-red-400" },        // Vermelho
  { bg: "bg-sky-200", text: "text-sky-900", border: "border-sky-400" },        // Azul Céu
];

interface ChatProps {
  nickname: string;
  isAdmin: boolean;
}

export default function Chat({ nickname, isAdmin: isAdminProp }: ChatProps) {
  const [isLoggedIn] = useState<boolean>(true);
  const [currentRoom, setCurrentRoom] = useState<string>("geral");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([
    { id: "ids-produtos", name: "IDs de produtos" },
    { id: "geral", name: "Geral" },
    { id: "manutencoes", name: "Manutenções" }
  ]);
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [isAdmin] = useState<boolean>(isAdminProp);
  const [newRoomName, setNewRoomName] = useState<string>("");

  const [userColors, setUserColors] = useState<Record<string, typeof PASTEL_COLORS[0]>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayedMessagesCount, setDisplayedMessagesCount] = useState<number>(50); // Paginação
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resetar paginação ao trocar de sala
  useEffect(() => {
    setDisplayedMessagesCount(50);
    setTimeout(() => scrollToBottom(false), 100);
  }, [currentRoom]);

  // Função para tocar som de notificação
  const playNotificationSound = () => {
    try {
      // Criar áudio usando Web Audio API para gerar um beep simples
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequência do som
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error("Erro ao tocar som:", error);
    }
  };

  // Função para carregar mais mensagens (scroll infinito)
  const loadMoreMessages = () => {
    setDisplayedMessagesCount(prev => prev + 50);
  };

  // Função para scroll automático
  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto", 
        block: "end",
        inline: "nearest"
      });
    }
  };

  // Inicializar WebSocket
  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket.io/"
    });

    socketInstance.on("connect", () => {
      console.log("[WebSocket] Conectado");
      setIsConnected(true);
      toast.success("Conectado ao servidor");
    });

    socketInstance.on("disconnect", () => {
      console.log("[WebSocket] Desconectado");
      setIsConnected(false);
      toast.error("Desconectado do servidor");
    });

    // Receber estado inicial
    socketInstance.on("init", (data: { messages: Message[], rooms: Room[], userColors: Record<string, typeof PASTEL_COLORS[0]> }) => {
      setMessages(data.messages);
      setRooms(data.rooms);
      setUserColors(data.userColors);
    });

    // Receber nova mensagem
    socketInstance.on("message:new", (newMessage: Message) => {
      setMessages(prev => {
        const updated = [...prev, newMessage];
        
        // Tocar som se a mensagem for de outra sala e não for do próprio usuário
        if (newMessage.room !== currentRoom && newMessage.user !== nickname && notificationEnabled) {
          playNotificationSound();
        }
        
        // Scroll automático ao receber nova mensagem
        requestAnimationFrame(() => {
          setTimeout(() => scrollToBottom(true), 50);
        });
        return updated;
      });
    });

    // Receber nova sala
    socketInstance.on("room:new", (newRoom: Room) => {
      setRooms(prev => {
        if (!prev.find(r => r.id === newRoom.id)) {
          return [...prev, newRoom];
        }
        return prev;
      });
    });

    // Receber atualização de cores
    socketInstance.on("userColors:update", (colors: Record<string, typeof PASTEL_COLORS[0]>) => {
      setUserColors(prev => ({ ...prev, ...colors }));
    });

    // Dados importados
    socketInstance.on("data:imported", (data: { messages: Message[], rooms: Room[], userColors: Record<string, typeof PASTEL_COLORS[0]> }) => {
      setMessages(data.messages);
      setRooms(data.rooms);
      setUserColors(data.userColors);
      toast.success("Dados importados com sucesso!");
    });

    // Dados limpos
    socketInstance.on("data:cleared", () => {
      setMessages([]);
      setRooms([
        { id: "ids-produtos", name: "IDs de produtos" },
        { id: "geral", name: "Geral" },
        { id: "manutencoes", name: "Manutenções" }
      ]);
      setUserColors({});
      toast.info("Dados limpos");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Carregar dados locais ao iniciar
  useEffect(() => {
    const storedNickname = localStorage.getItem("chatNickname");
    const storedAdmin = localStorage.getItem("chatIsAdmin");


  }, []);

  // Scroll automático e marcar como lida ao trocar de sala
  useEffect(() => {
    scrollToBottom(false);
    // Marcar sala atual como lida
    setLastReadTimestamp(prev => ({
      ...prev,
      [currentRoom]: Date.now()
    }));
  }, [currentRoom]);

  // Scroll automático ao receber mensagens
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [messages.length]);

  // Contar mensagens não lidas por sala
  const getUnreadCount = (roomId: string): number => {
    const lastRead = lastReadTimestamp[roomId] || 0;
    return messages.filter(m => m.room === roomId && m.timestamp > lastRead).length;
  };

  const getUserColor = (username: string) => {
    if (!userColors[username]) {
      const usedIndices = Object.values(userColors).map(color => 
        PASTEL_COLORS.findIndex(c => c.bg === color.bg)
      );
      
      let availableIndex = 0;
      for (let i = 0; i < PASTEL_COLORS.length; i++) {
        if (!usedIndices.includes(i)) {
          availableIndex = i;
          break;
        }
      }
      
      if (usedIndices.length >= PASTEL_COLORS.length) {
        availableIndex = Object.keys(userColors).length % PASTEL_COLORS.length;
      }
      
      const newColor = PASTEL_COLORS[availableIndex];
      const newColors = { [username]: newColor };
      setUserColors(prev => ({ ...prev, ...newColors }));
      
      // Enviar atualização de cor para outros clientes
      if (socket) {
        socket.emit("userColors:update", newColors);
      }
      
      return newColor;
    }
    return userColors[username];
  };





  const sendMessage = () => {
    if (message.trim() && socket) {
      const newMessage: Message = {
        id: Date.now().toString(),
        user: nickname,
        text: message,
        timestamp: Date.now(),
        room: currentRoom
      };
      
      // Enviar mensagem via WebSocket
      socket.emit("message:new", newMessage);
      setMessage("");
      setShowEmoji(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      const reader = new FileReader();
      reader.onload = () => {
        const newMessage: Message = {
          id: Date.now().toString(),
          user: nickname,
          text: `Enviou um arquivo: ${file.name}`,
          timestamp: Date.now(),
          room: currentRoom,
          file: {
            name: file.name,
            url: reader.result as string,
            type: file.type
          }
        };
        
        // Enviar mensagem via WebSocket
        socket.emit("message:new", newMessage);
        toast.success("Arquivo enviado!");
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(message + emoji);
  };

  const createRoom = () => {
    if (newRoomName.trim() && isAdmin && socket) {
      const roomId = newRoomName.toLowerCase().replace(/\s+/g, "-");
      if (!rooms.find(r => r.id === roomId)) {
        const newRoom: Room = { id: roomId, name: newRoomName };
        
        // Enviar nova sala via WebSocket
        socket.emit("room:new", newRoom);
        setNewRoomName("");
        toast.success(`Sala "${newRoomName}" criada!`);
      } else {
        toast.error("Sala já existe");
      }
    }
  };

  const exportChat = () => {
    const data = {
      messages,
      rooms,
      userColors,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-backup-${Date.now()}.json`;
    a.click();
    toast.success("Backup exportado!");
  };

  const importChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.messages && data.rooms) {
            // Enviar dados importados via WebSocket
            socket.emit("data:import", {
              messages: data.messages,
              rooms: data.rooms,
              userColors: data.userColors || {}
            });
          } else {
            toast.error("Arquivo de backup inválido");
          }
        } catch (error) {
          toast.error("Erro ao importar backup");
        }
      };
      reader.readAsText(file);
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Resetar horas para comparação de datas
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    
    let dateStr = "";
    if (messageDate.getTime() === today.getTime()) {
      dateStr = "Hoje";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      dateStr = "Ontem";
    } else {
      dateStr = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }
    
    const timeStr = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
    
    return `${dateStr} às ${timeStr}`;
  };

  const applyFormatting = (format: string) => {
    const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "code":
        formattedText = `\`${selectedText}\``;
        break;
    }
    
    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);
  };

  const renderFormattedText = (text: string) => {
    let formatted = text;
    // Preservar quebras de linha
    formatted = formatted.replace(/\n/g, '<br />');
    // Formatação de texto
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 rounded text-xs">$1</code>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };



  // Filtrar mensagens por sala e busca
  const allFilteredMessages = messages.filter(m => {
    const matchesRoom = m.room === currentRoom;
    const matchesSearch = searchQuery.trim() === "" || 
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  // Aplicar paginação - mostrar apenas as últimas N mensagens
  const totalMessages = allFilteredMessages.length;
  const filteredMessages = allFilteredMessages.slice(-displayedMessagesCount);
  const hasMoreMessages = totalMessages > displayedMessagesCount;

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden">
      {/* Header Fixo */}
      <div className="bg-white shadow-layered border-b border-blue-100 flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="GetScale Logo" className="h-12 object-contain scale-hover" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Chat Interno
              </h1>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="font-semibold">{nickname}</span>
                {isConnected ? (
                  <span className="flex items-center text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 pulse-animation"></span>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    Offline
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={exportChat} className="button-3d border-blue-200 hover:border-blue-400">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={() => document.getElementById("import-input")?.click()} className="button-3d border-blue-200 hover:border-blue-400">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <input
                  id="import-input"
                  type="file"
                  accept=".json"
                  onChange={importChat}
                  className="hidden"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área Principal com Altura Fixa */}
      <div className="flex-1 flex gap-4 overflow-hidden px-4 py-4 max-w-full">
        {/* Sidebar - Rooms */}
        <div className="w-64 flex-shrink-0">
          <Card className="h-full flex flex-col p-4 shadow-layered-lg card-3d bg-white/80 backdrop-blur-sm">
            <h2 className="text-base font-semibold mb-3 text-gray-700 flex items-center flex-shrink-0">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 pulse-animation"></span>
              Salas de Conversa
            </h2>
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-2">
                {rooms.map((room) => (
                  <Button
                    key={room.id}
                    variant={currentRoom === room.id ? "default" : "ghost"}
                    className={`w-full justify-between smooth-transition text-sm ${
                      currentRoom === room.id 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-layered" 
                        : "hover:bg-blue-50"
                    }`}
                    onClick={() => setCurrentRoom(room.id)}
                  >
                    <span># {room.name}</span>
                    {getUnreadCount(room.id) > 0 && currentRoom !== room.id && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {getUnreadCount(room.id)}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            {isAdmin && (
              <div className="mt-3 space-y-2 pt-3 border-t border-blue-100 flex-shrink-0">
                <Input
                  placeholder="Nova sala..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createRoom()}
                  className="shadow-layered text-sm"
                />
                <Button onClick={createRoom} className="w-full button-3d bg-gradient-to-r from-blue-500 to-cyan-600" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Sala
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Main Chat Area com Altura Fixa */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Card className="flex-1 flex flex-col shadow-layered-lg perspective-card bg-white/90 backdrop-blur-sm overflow-hidden">
            {/* Room Header com Busca */}
            <div className="p-3 border-b bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-layered shine-effect flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center">
                  <span className="mr-2">#</span>
                  {rooms.find(r => r.id === currentRoom)?.name}
                </h2>
                <div className="flex-1 max-w-xs">
                  <Input
                    placeholder="Buscar mensagens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30 h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Messages Area com Scroll Interno */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4 bg-gradient-to-b from-white to-blue-50/30" ref={scrollAreaRef}>
                <div className="space-y-3">
                  {/* Botão Carregar Mais Mensagens */}
                  {hasMoreMessages && (
                    <div className="flex justify-center mb-4">
                      <Button
                        onClick={loadMoreMessages}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Carregar mensagens antigas ({totalMessages - displayedMessagesCount} restantes)
                      </Button>
                    </div>
                  )}
                  {filteredMessages.map((msg) => {
                    const userColor = getUserColor(msg.user);
                    const isCurrentUser = msg.user === nickname;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex message-enter ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-layered smooth-transition hover:shadow-layered-lg ${
                            isCurrentUser
                              ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                              : `${userColor.bg} ${userColor.text} border-2 ${userColor.border}`
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-xs">{msg.user}</span>
                            <span className={`text-xs ${isCurrentUser ? "opacity-80" : "opacity-60"}`}>
                              {formatDateTime(msg.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm break-words">
                            {renderFormattedText(msg.text)}
                          </div>
                          {msg.file && (
                            <div className={`mt-2 rounded-lg ${isCurrentUser ? "bg-white/20" : "bg-black/5"}`}>
                              {/* Preview de imagem se for arquivo de imagem */}
                              {msg.file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                                <div className="space-y-2">
                                  <img 
                                    src={msg.file.url} 
                                    alt={msg.file.name}
                                    className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => msg.file && window.open(msg.file.url, '_blank')}
                                  />
                                  <a
                                    href={msg.file.url}
                                    download={msg.file.name}
                                    className="text-xs underline flex items-center space-x-1 hover:opacity-80 p-2"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{msg.file.name}</span>
                                  </a>
                                </div>
                              ) : (
                                <a
                                  href={msg.file.url}
                                  download={msg.file.name}
                                  className="text-xs underline flex items-center space-x-1 hover:opacity-80 p-2"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{msg.file.name}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area Fixo */}
            <div className="p-3 border-t bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center space-x-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("bold")}
                  title="Negrito"
                  className="smooth-transition hover:bg-blue-100 h-7 px-2"
                >
                  <strong className="text-xs">B</strong>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("italic")}
                  title="Itálico"
                  className="smooth-transition hover:bg-blue-100 h-7 px-2"
                >
                  <em className="text-xs">I</em>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("code")}
                  title="Código"
                  className="smooth-transition hover:bg-blue-100 h-7 px-2"
                >
                  <span className="text-xs">{"</>"}</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="button-3d border-blue-200 hover:border-blue-400 h-9 w-9"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="relative flex-1">
                  <Textarea
                    id="message-input"
                    placeholder="Digite sua mensagem... (Shift+Enter para quebra de linha)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="pr-10 shadow-layered smooth-transition focus:shadow-layered-lg min-h-[36px] max-h-[120px] text-sm resize-none"
                    disabled={!isConnected}
                    rows={1}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 smooth-transition hover:scale-110 h-7 w-7"
                    onClick={() => setShowEmoji(!showEmoji)}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={sendMessage} 
                  size="icon" 
                  className="button-3d bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 ripple h-9 w-9"
                  disabled={!isConnected}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {showEmoji && (
                <Card className="mt-2 p-2 shadow-layered-lg card-3d bg-white">
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji(emoji)}
                        className="text-lg hover:scale-125 smooth-transition h-8 w-8 p-0"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
