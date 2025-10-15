import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  onItemClick: (item: MenuItem) => void;
  disabled?: boolean;
}

export const MenuItemCard = ({ item, onAddToCart, onItemClick, disabled }: MenuItemCardProps) => {
  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in cursor-pointer">
      {/* Imagem */}
      <div 
        className="aspect-[4/3] bg-muted relative overflow-hidden"
        onClick={() => onItemClick(item)}
      >
        {item.imagem ? (
          <img
            src={item.imagem}
            alt={item.nome}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🍢
          </div>
        )}
        
        {/* Badge de Destaque */}
        {item.destaque && (
          <Badge className="absolute top-3 right-3 gap-1 bg-primary text-primary-foreground shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            Destaque
          </Badge>
        )}

        {/* Overlay no hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Conteúdo */}
      <div className="p-5 space-y-3">
        <div onClick={() => onItemClick(item)}>
          <h3 className="font-bold text-lg mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
            {item.nome}
          </h3>
          {item.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.descricao}
            </p>
          )}
        </div>

        {/* Preço e Botão */}
        <div className="flex items-center justify-between pt-2">
          <div onClick={() => onItemClick(item)}>
            <span className="text-2xl font-bold text-primary">
              R$ {item.preco.toFixed(2)}
            </span>
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
            disabled={disabled}
            className="gap-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
};
