import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, MessageSquare } from "lucide-react";
import { useState } from "react";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  destaque: boolean;
}

interface CartItemType {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartItemProps {
  cartItem: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
}

export const CartItem = ({
  cartItem,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
}: CartItemProps) => {
  const [showNotes, setShowNotes] = useState(!!cartItem.notes);
  const { item, quantity, notes } = cartItem;

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-20 h-20 bg-background rounded-md overflow-hidden flex-shrink-0">
          {item.imagem ? (
            <img
              src={item.imagem}
              alt={item.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              🍢
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{item.nome}</h4>
              <p className="text-sm text-primary font-medium">
                R$ {item.preco.toFixed(2)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemoveItem(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, quantity - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(item.id, quantity + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <div className="flex-1" />
            <span className="font-bold text-primary">
              R$ {(item.preco * quantity).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div>
        {!showNotes ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowNotes(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Adicionar observação
          </Button>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações
            </label>
            <Textarea
              placeholder="Ex: Sem cebola, ponto da carne..."
              value={notes || ""}
              onChange={(e) => onUpdateNotes(item.id, e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
