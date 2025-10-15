import { useState, useEffect, useRef } from "react";
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
  const imageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleImageLoad = () => {
      if (imageRef.current && modalRef.current) {
        const imageHeight = imageRef.current.offsetHeight;
        modalRef.current.style.height = `${imageHeight}px`;
      }
    };

    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad);
        return () => img.removeEventListener('load', handleImageLoad);
      }
    }
  }, [item, open]);

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
        ref={modalRef}
        className="max-w-[1100px] w-[95vw] p-0 gap-0 overflow-hidden grid lg:grid-cols-[1fr_400px] h-auto"
        onEscapeKeyDown={handleClose}
        aria-describedby="product-description"
        aria-labelledby="product-title"
      >
        {/* Imagem - Coluna Esquerda */}
        <div className="relative w-full h-auto bg-black flex items-center justify-center max-h-[50vh] lg:max-h-none">
          {item.imagem ? (
            <img
              ref={imageRef}
              src={item.imagem}
              alt={item.nome}
              className="w-full h-auto object-contain block"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl min-h-[400px]">
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

        {/* Conteúdo - Coluna Direita */}
        <div className="p-6 space-y-4 overflow-y-auto h-auto flex flex-col justify-between">
          <DialogHeader>
            <DialogTitle id="product-title" className="text-2xl font-bold text-foreground">
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
