import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface MenuItemListRowProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  onItemClick: (item: MenuItem) => void;
  disabled?: boolean;
}

export const MenuItemListRow = ({ item, onAddToCart, onItemClick, disabled }: MenuItemListRowProps) => {
  return (
    <div className="group flex gap-4 p-4 bg-card rounded-lg border hover:shadow-lg transition-all duration-300 cursor-pointer">
      {/* Conteúdo à esquerda */}
      <div className="flex-1 flex flex-col justify-between" onClick={() => onItemClick(item)}>
        <div>
          <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">
            {item.nome}
          </h3>
          {item.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2">
              {item.descricao}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg font-bold text-primary">
            R$ {item.preco.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
            disabled={disabled}
            className="gap-2"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Imagem à direita */}
      <div 
        className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted"
        onClick={() => onItemClick(item)}
      >
        {item.imagem ? (
          <img
            src={item.imagem}
            alt={item.nome}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍢
          </div>
        )}
      </div>
    </div>
  );
};
