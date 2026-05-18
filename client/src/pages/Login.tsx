import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ChefHat, Lock, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden md:flex md:w-1/2 brand-gradient flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <UtensilsCrossed
              key={i}
              className="absolute text-white"
              style={{
                width: `${20 + (i % 5) * 8}px`,
                top: `${(i * 17) % 100}%`,
                left: `${(i * 23) % 100}%`,
                transform: `rotate(${i * 37}deg)`,
                opacity: 0.3 + (i % 4) * 0.2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center text-white">
          <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border-2 border-white/40">
            <ChefHat className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Panela Velha
          </h1>
          <p className="text-white/80 text-lg mb-1">Sistema Administrativo</p>
          <p className="text-white/60 text-sm">Simples, caseiro e delicioso</p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Pedidos", icon: "📋" },
              { label: "Estoque", icon: "📦" },
              { label: "Financeiro", icon: "💰" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-white/80 text-xs font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário de login */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        {/* Logo mobile */}
        <div className="md:hidden text-center mb-8">
          <div className="w-20 h-20 rounded-full brand-gradient flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold brand-text" style={{ fontFamily: "'Playfair Display', serif" }}>
            Panela Velha
          </h1>
          <p className="text-muted-foreground text-sm">Sistema Administrativo</p>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Acesso Restrito
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Esta área é exclusiva para o administrador do restaurante. Faça login para continuar.
              </p>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full h-12 text-base font-semibold brand-gradient text-white hover:opacity-90 transition-opacity border-0"
              style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
            >
              <ChefHat className="w-5 h-5 mr-2" />
              Entrar com Manus
            </Button>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-xs text-muted-foreground">
                Acesso disponível somente para o administrador autorizado do restaurante Panela Velha.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 Panela Velha. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
