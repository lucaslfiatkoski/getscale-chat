import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Package } from "lucide-react";
import { toast } from "sonner";
import Chat from "./Chat";
import Production from "./Production";

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

export default function MainApp() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"chat" | "production">("chat");

  // Carregar login do localStorage ao iniciar
  useEffect(() => {
    const savedNickname = localStorage.getItem("chatNickname");
    const savedIsAdmin = localStorage.getItem("chatIsAdmin");
    
    if (savedNickname) {
      setNickname(savedNickname);
      setIsAdmin(savedIsAdmin === "true");
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!nickname.trim()) {
      toast.error("Por favor, digite um nickname");
      return;
    }
    
    if (!password.trim()) {
      toast.error("Por favor, digite a senha");
      return;
    }

    const passwordHash = await sha256(password);
    
    if (passwordHash === ADMIN_PASSWORD_HASH) {
      setIsAdmin(true);
      setIsLoggedIn(true);
      localStorage.setItem("chatNickname", nickname);
      localStorage.setItem("chatIsAdmin", "true");
      toast.success(`Bem-vindo, ${nickname}! Acesso de Administrador`);
    } else if (passwordHash === USER_PASSWORD_HASH) {
      setIsAdmin(false);
      setIsLoggedIn(true);
      localStorage.setItem("chatNickname", nickname);
      localStorage.setItem("chatIsAdmin", "false");
      toast.success(`Bem-vindo, ${nickname}!`);
    } else {
      toast.error("Senha incorreta");
      return;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <Card className="w-full max-w-md p-8 shadow-layered-lg">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="GetScale Logo" className="h-20 mb-4" />
            <h1 className="text-2xl font-bold text-blue-600">Chat Interno</h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Digite seu nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Input
                type="password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleLogin();
                  }
                }}
              />
            </div>
            
            <Button
              type="button"
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              Entrar no Chat
            </Button>
          </form>
        </Card>

        <div className="fixed bottom-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm">Conectado ao servidor</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Tab Navigation */}
      <div className="bg-white shadow-md border-b flex">
        <Button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 rounded-none h-14 ${
            activeTab === "chat"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Chat Interno
        </Button>
        <Button
          onClick={() => setActiveTab("production")}
          className={`flex-1 rounded-none h-14 ${
            activeTab === "production"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Package className="w-5 h-5 mr-2" />
          Controle de Produção
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <Chat nickname={nickname} isAdmin={isAdmin} />
        ) : (
          <Production nickname={nickname} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
