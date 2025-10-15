import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface ProductDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: MenuItem, quantity: number, notes: string) => void;
}

export const ProductDetailModal = ({ 
  item, 
  open, 
  onOpenChange, 
  onAddToCart 
}: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const handleClose = () => {
    setQuantity(1);
    setNotes("");
    onOpenChange(false);
  };

  const handleAdd = () => {
    if (item) {
      onAddToCart(item, quantity, notes);
      handleClose();
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[600px] p-0 gap-0 max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={handleClose}
        aria-describedby="product-description"
      >
        {/* Imagem */}
        <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden rounded-t-lg">
          {item.imagem ? (
            <img
              src={item.imagem}
              alt={item.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">
              🍢
            </div>
          )}
          
          {/* Badge de Destaque */}
          {item.destaque && (
            <Badge className="absolute top-4 right-4 gap-1 bg-primary text-primary-foreground shadow-lg">
              <Star className="w-4 h-4 fill-current" />
              Destaque
            </Badge>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {item.nome}
            </DialogTitle>
          </DialogHeader>

          {/* Descrição */}
          {item.descricao && (
            <p id="product-description" className="text-muted-foreground leading-relaxed">
              {item.descricao}
            </p>
          )}

          {/* Preço */}
          <div className="text-3xl font-bold text-primary">
            R$ {item.preco.toFixed(2)}
          </div>

          {/* Campo de Observação */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Algum comentário adicional?
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Sem cebola, por favor"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={400}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/400
            </p>
          </div>

          {/* Controle de Quantidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantidade</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-semibold w-12 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botão Adicionar */}
          <Button
            onClick={handleAdd}
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
            size="lg"
          >
            Adicionar • R$ {(item.preco * quantity).toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
