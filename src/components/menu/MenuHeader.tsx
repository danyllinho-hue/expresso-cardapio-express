import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, MapPin, Store, Truck, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface RestaurantConfig {
  nome_restaurante: string;
  endereco: string;
  tempo_entrega: string;
  status_funcionamento: string;
  modo_atendimento: string;
  logo_url?: string;
}

interface MenuHeaderProps {
  config: RestaurantConfig | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const MenuHeader = ({ config, searchQuery, onSearchChange }: MenuHeaderProps) => {
  const isOpen = config?.status_funcionamento === "aberto";

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b shadow-md">
      <div className="container mx-auto px-4 py-4">
        {/* Logo e Info Principal */}
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform overflow-hidden">
              {config?.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt={config.nome_restaurante} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🍢</span>
              )}
            </div>
            
            {/* Info */}
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {config?.nome_restaurante || "Expresso Espetaria"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge 
                  variant={isOpen ? "default" : "destructive"} 
                  className="gap-1.5 shadow-sm"
                >
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                  {isOpen ? "Aberto agora" : "Fechado"}
                </Badge>
                
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {config?.modo_atendimento === "entrega" && (
                    <>
                      <Truck className="w-4 h-4" />
                      Entrega
                    </>
                  )}
                  {config?.modo_atendimento === "retirada" && (
                    <>
                      <Store className="w-4 h-4" />
                      Retirada
                    </>
                  )}
                  {config?.modo_atendimento === "ambos" && (
                    <>
                      <Truck className="w-4 h-4" />
                      <Store className="w-4 h-4" />
                      Ambos
                    </>
                  )}
                </span>
                
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {config?.tempo_entrega || "30-40 min"}
                </span>
              </div>
            </div>
          </div>

          {/* Botão Admin (apenas em desktop) */}
          <Link to="/login" className="hidden md:block">
            <Button variant="outline" size="sm" className="shadow-sm">
              Admin
            </Button>
          </Link>
        </div>

        {/* Endereço */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 animate-fade-in">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{config?.endereco || "Carregando endereço..."}</span>
        </div>

        {/* Busca */}
        <div className="relative animate-fade-in">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-11 h-12 text-base shadow-sm"
          />
        </div>
      </div>
    </header>
  );
};
