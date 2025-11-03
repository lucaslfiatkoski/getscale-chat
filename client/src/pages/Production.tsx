import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Check, X, Archive, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

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

const WORKFLOW_STEPS = [
  { key: "montagem" as const, label: "Montagem" },
  { key: "teste" as const, label: "Teste" },
  { key: "gravacao" as const, label: "Gravação" },
  { key: "embalagem" as const, label: "Embalagem" },
  { key: "enviado" as const, label: "Enviado" }
];

const PREDEFINED_PRODUCTS = [
  "GS404RO ONEWIRE ATIVO",
  "GS404RO RS232",
  "GS404RO TTL",
  "GS404LF ONEWIRE ATIVO",
  "GS404LF RS232",
  "GS404LF TTL",
  "GS500 ONEWIRE ATIVO",
  "GS500 RS232",
  "GS500 TTL",
  "GS601 RS232",
  "GS601 TTL",
  "GS302 RS232",
  "GS302 TTL",
  "Sensor Temperatura 10m",
  "Sensor Temperatura 15m",
  "Sensor Temperatura 20m",
  "Sensor Umidade 5m"
];

const PREDEFINED_PROTOCOLS = [
  "Protocolo Padr\u00e3o",
  "Protocolo VDO",
  "Protocolo Queclink GV75",
  "Protocolo Queclink GV300",
  "Protocolo Maxtrack"
];

interface ProductionProps {
  nickname: string;
  isAdmin: boolean;
}

export default function Production({ nickname, isAdmin }: ProductionProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showNewOrderForm, setShowNewOrderForm] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Form fields
  const [customerName, setCustomerName] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [itemProtocol, setItemProtocol] = useState<string>("");
  const [protocolSuggestions, setProtocolSuggestions] = useState<string[]>([]);
  const [showProtocolSuggestions, setShowProtocolSuggestions] = useState<boolean>(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Inicializar WebSocket
  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket.io/"
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      toast.success("Conectado ao servidor de produção");
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      toast.error("Desconectado do servidor");
    });

    // Receber estado inicial
    socketInstance.on("production:init", (data: { orders: Order[] }) => {
      setOrders(data.orders);
    });

    // Receber novo pedido
    socketInstance.on("production:new", (newOrder: Order) => {
      console.log("[Production] Novo pedido recebido:", newOrder);
      setOrders(prev => {
        const updated = [...prev, newOrder];
        console.log("[Production] Lista atualizada:", updated);
        return updated;
      });
      toast.success(`Novo pedido criado: ${newOrder.customerName}`);
    });

    // Receber atualização de pedido
    socketInstance.on("production:update", (updatedOrder: Order) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    // Receber pedido excluído
    socketInstance.on("production:deleted", (orderId: string) => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    });

    // Receber pedido arquivado
    socketInstance.on("production:archived", (orderId: string) => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.info("Pedido arquivado automaticamente");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Arquivar pedidos automaticamente após 2 meses
  useEffect(() => {
    const checkArchive = () => {
      const twoMonthsAgo = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 dias
      orders.forEach(order => {
        if (order.status.enviado && order.orderDate < twoMonthsAgo && !order.archived) {
          if (socket) {
            socket.emit("production:archive", order.id);
          }
        }
      });
    };

    const interval = setInterval(checkArchive, 24 * 60 * 60 * 1000); // Verifica diariamente
    checkArchive(); // Verifica imediatamente

    return () => clearInterval(interval);
  }, [orders, socket]);

  // Gerar lista de sugestões de itens baseado em pedidos existentes
  useEffect(() => {
    const allItems = new Set<string>(PREDEFINED_PRODUCTS);
    orders.forEach(order => {
      order.items.forEach(item => {
        allItems.add(item.name);
      });
    });
    setItemSuggestions(Array.from(allItems).sort());
  }, [orders]);

  // Gerar sugestões de protocolos
  useEffect(() => {
    const allProtocols = new Set<string>(PREDEFINED_PROTOCOLS);
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.protocol) {
          allProtocols.add(item.protocol);
        }
      });
    });
    setProtocolSuggestions(Array.from(allProtocols).sort());
  }, [orders]);

  // Filtrar sugestões baseado no texto digitado
  const getFilteredSuggestions = (): string[] => {
    if (!itemName.trim()) return itemSuggestions;
    return itemSuggestions.filter(item => 
      item.toLowerCase().includes(itemName.toLowerCase())
    );
  };

  const getFilteredProtocolSuggestions = (): string[] => {
    if (!itemProtocol.trim()) return protocolSuggestions;
    return protocolSuggestions.filter(protocol => 
      protocol.toLowerCase().includes(itemProtocol.toLowerCase())
    );
  };

  const handleAddItem = () => {
    if (!itemName.trim() || itemQuantity <= 0) {
      toast.error("Preencha o nome e quantidade do item");
      return;
    }

    setCurrentItems(prev => [...prev, { 
      name: itemName, 
      quantity: itemQuantity,
      protocol: itemProtocol || undefined
    }]);
    setItemName("");
    setItemQuantity(1);
    setItemProtocol("");
    setShowSuggestions(false);
    setShowProtocolSuggestions(false);
    toast.success("Item adicionado");
  };

  const handleRemoveItem = (index: number) => {
    setCurrentItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrder = () => {
    if (!customerName.trim()) {
      toast.error("Digite o nome do cliente");
      return;
    }

    if (currentItems.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      customerName,
      orderDate: Date.now(),
      items: currentItems,
      status: {
        montagem: false,
        teste: false,
        gravacao: false,
        embalagem: false,
        enviado: false
      },
      archived: false
    };

    if (socket) {
      console.log("[Production] Enviando novo pedido:", newOrder);
      socket.emit("production:create", newOrder);
    } else {
      console.error("[Production] Socket não conectado!");
      toast.error("Não conectado ao servidor");
    }

    // Limpar form
    setCustomerName("");
    setCurrentItems([]);
    setShowNewOrderForm(false);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setCurrentItems([...order.items]);
    setShowNewOrderForm(true);
  };

  const handleUpdateOrder = () => {
    if (!editingOrder) return;

    const updatedOrder: Order = {
      ...editingOrder,
      customerName,
      items: currentItems
    };

    if (socket) {
      socket.emit("production:update", updatedOrder);
    }

    setEditingOrder(null);
    setCustomerName("");
    setCurrentItems([]);
    setShowNewOrderForm(false);
    toast.success("Pedido atualizado");
  };

  const handleDeleteOrder = (orderId: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return;

    if (socket) {
      socket.emit("production:delete", orderId);
    }

    toast.success("Pedido excluído");
  };

  const handleExportToPDF = () => {
    // Criar conteúdo do PDF
    const content = orders.map(order => {
      const statusText = WORKFLOW_STEPS.map(step => 
        order.status[step.key] ? '✓' : '✗'
      ).join(' | ');
      const itemsText = order.items.map(item => 
        `${item.name}${item.protocol ? ` (${item.protocol})` : ''}: ${item.quantity}`
      ).join(', ');
      return `${order.customerName} | ${formatDate(order.orderDate)} | ${statusText} | ${itemsText}`;
    }).join('\n');

    // Criar blob e fazer download
    const blob = new Blob([`PEDIDOS DE PRODUÇÃO\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Pedidos exportados");
  };

  const canEnableStep = (order: Order, stepKey: keyof Order["status"]): boolean => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.key === stepKey);
    if (stepIndex === 0) return true; // Primeira etapa sempre pode ser habilitada
    
    const previousStep = WORKFLOW_STEPS[stepIndex - 1];
    return order.status[previousStep.key];
  };

  const handleToggleStatus = (order: Order, stepKey: keyof Order["status"]) => {
    if (!canEnableStep(order, stepKey) && !order.status[stepKey]) {
      toast.error("Complete a etapa anterior primeiro");
      return;
    }

    const newStatus = { ...order.status };
    const isEnabling = !order.status[stepKey];
    
    // Atualizar o status da etapa clicada
    newStatus[stepKey] = isEnabling;
    
    // Se está desmarcando, desmarcar todas as etapas posteriores
    if (!isEnabling) {
      const stepIndex = WORKFLOW_STEPS.findIndex(s => s.key === stepKey);
      for (let i = stepIndex + 1; i < WORKFLOW_STEPS.length; i++) {
        newStatus[WORKFLOW_STEPS[i].key] = false;
      }
    }

    const updatedOrder: Order = {
      ...order,
      status: newStatus
    };

    if (socket) {
      socket.emit("production:update", updatedOrder);
    }
  };

  // Ordenar pedidos: não completos primeiro, depois completos
  const sortedOrders = [...orders].sort((a, b) => {
    const aComplete = a.status.enviado;
    const bComplete = b.status.enviado;
    
    if (aComplete === bComplete) {
      return b.orderDate - a.orderDate; // Mais recentes primeiro
    }
    
    return aComplete ? 1 : -1; // Não completos primeiro
  });

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="GetScale Logo" className="h-12" />
          <h1 className="text-2xl font-bold text-blue-600">Controle de Produção</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportToPDF}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button
            onClick={() => {
              setShowNewOrderForm(!showNewOrderForm);
              if (showNewOrderForm) {
                setEditingOrder(null);
                setCustomerName("");
                setCurrentItems([]);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showNewOrderForm ? "Cancelar" : "Novo Pedido"}
          </Button>
        </div>
      </div>

      {/* New Order Form */}
      {showNewOrderForm && (
        <Card className="m-4 p-4 shadow-lg">
          <h2 className="text-lg font-bold mb-4">
            {editingOrder ? "Editar Pedido" : "Novo Pedido"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome do Cliente</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>
          </div>

          <div className="border-t pt-4 mb-4">
            <h3 className="font-semibold mb-2">Itens do Pedido</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="md:col-span-2 relative">
                <Input
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Nome do item (comece a digitar para ver sugestões)"
                />
                {showSuggestions && getFilteredSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {getFilteredSuggestions().map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onClick={() => {
                          setItemName(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  value={itemProtocol}
                  onChange={(e) => {
                    setItemProtocol(e.target.value);
                    setShowProtocolSuggestions(true);
                  }}
                  onFocus={() => setShowProtocolSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProtocolSuggestions(false), 200)}
                  placeholder="Protocolo (opcional)"
                />
                {showProtocolSuggestions && getFilteredProtocolSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {getFilteredProtocolSuggestions().map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onClick={() => {
                          setItemProtocol(suggestion);
                          setShowProtocolSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '0') {
                      setItemQuantity(0);
                    } else {
                      setItemQuantity(parseInt(val) || 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder="Qtd"
                  min={1}
                />
                <Button onClick={handleAddItem} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {currentItems.length > 0 && (
              <div className="space-y-2">
                {currentItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex-1 space-y-1">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      {item.protocol && (
                        <div className="text-xs text-gray-600">Protocolo: {item.protocol}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Qtd:</span>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newQuantity = val === '' || val === '0' ? 0 : parseInt(val) || 0;
                            const newItems = [...currentItems];
                            newItems[index] = { ...item, quantity: newQuantity };
                            setCurrentItems(newItems);
                          }}
                          className="w-20 text-center"
                          min={1}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={editingOrder ? handleUpdateOrder : handleCreateOrder}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingOrder ? "Atualizar" : "Criar"} Pedido
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewOrderForm(false);
                setEditingOrder(null);
                setCustomerName("");
                setCurrentItems([]);
              }}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Orders List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {sortedOrders.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              Nenhum pedido cadastrado. Clique em "Novo Pedido" para começar.
            </Card>
          ) : (
            sortedOrders.map(order => {
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <Card key={order.id} className={`p-4 ${order.status.enviado ? 'bg-green-50' : 'bg-white'}`}>
                  {/* Header compacto - sempre visível */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newExpanded = new Set(expandedOrders);
                          if (isExpanded) {
                            newExpanded.delete(order.id);
                          } else {
                            newExpanded.add(order.id);
                          }
                          setExpandedOrders(newExpanded);
                        }}
                        className="p-1"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                      <h3 className="text-lg font-bold">{order.customerName}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditOrder(order)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="flex items-center gap-1 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>

                  {/* Detalhes expansíveis */}
                  {isExpanded && (
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-sm text-gray-600 mb-3">Data: {formatDate(order.orderDate)}</p>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Itens:</p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 rounded-lg border border-blue-200 w-full">
                              <div className="flex-1 space-y-1">
                                <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                {item.protocol && (
                                  <div className="text-xs text-gray-600">Protocolo: {item.protocol}</div>
                                )}
                              </div>
                              <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap ml-3">Quantidade: {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botões de status - sempre visíveis */}
                  <div className="grid grid-cols-5 gap-2">
                    {WORKFLOW_STEPS.map(step => {
                      const isEnabled = order.status[step.key];
                      const canEnable = canEnableStep(order, step.key);
                      
                      return (
                        <div key={step.key} className="text-center">
                          <p className="text-xs font-medium mb-1">{step.label}</p>
                          <Button
                            onClick={() => handleToggleStatus(order, step.key)}
                            disabled={!canEnable && !isEnabled}
                            className={`w-full ${
                              isEnabled
                                ? 'bg-green-600 hover:bg-green-700'
                                : canEnable
                                ? 'bg-gray-300 hover:bg-gray-400'
                                : 'bg-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {isEnabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Connection Status */}
      <div className="fixed bottom-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
}
