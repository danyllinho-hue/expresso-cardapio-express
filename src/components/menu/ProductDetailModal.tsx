import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string;
  destaque: boolean;
}

interface ComplementOption {
  id: string;
  nome: string;
  valor_adicional: number;
}

interface ComplementGroup {
  id: string;
  nome: string;
  tipo: 'radio' | 'checkbox';
  obrigatorio: boolean;
  options: ComplementOption[];
}

export interface SelectedComplement {
  groupId: string;
  groupName: string;
  options: Array<{
    id: string;
    name: string;
    additionalPrice: number;
  }>;
}

interface ProductDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: MenuItem, quantity: number, notes: string, complements?: SelectedComplement[]) => void;
}

export const ProductDetailModal = ({ 
  item, 
  open, 
  onOpenChange, 
  onAddToCart 
}: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [complementGroups, setComplementGroups] = useState<ComplementGroup[]>([]);
  const [selectedComplements, setSelectedComplements] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (item && open) {
      loadComplements();
    }
  }, [item, open]);

  const loadComplements = async () => {
    if (!item) return;

    try {
      const { data: itemComplements, error: itemError } = await supabase
        .from('menu_item_complements')
        .select('complement_group_id')
        .eq('menu_item_id', item.id);

      if (itemError) throw itemError;

      if (!itemComplements || itemComplements.length === 0) {
        setComplementGroups([]);
        return;
      }

      const groupIds = itemComplements.map(ic => ic.complement_group_id);

      const { data: groups, error: groupsError } = await supabase
        .from('complement_groups')
        .select('*')
        .in('id', groupIds)
        .order('ordem');

      if (groupsError) throw groupsError;

      const { data: options, error: optionsError } = await supabase
        .from('complement_options')
        .select('*')
        .in('group_id', groupIds)
        .order('ordem');

      if (optionsError) throw optionsError;

      const groupsWithOptions: ComplementGroup[] = (groups || []).map(group => ({
        id: group.id,
        nome: group.nome,
        tipo: group.tipo as 'radio' | 'checkbox',
        obrigatorio: group.obrigatorio,
        options: (options || []).filter(opt => opt.group_id === group.id).map(opt => ({
          id: opt.id,
          nome: opt.nome,
          valor_adicional: opt.valor_adicional
        }))
      }));

      setComplementGroups(groupsWithOptions);
    } catch (error) {
      console.error('Erro ao carregar complementos:', error);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setNotes("");
    setSelectedComplements({});
    onOpenChange(false);
  };

  const handleComplementChange = (groupId: string, optionId: string, groupType: 'radio' | 'checkbox') => {
    setSelectedComplements(prev => {
      if (groupType === 'radio') {
        return { ...prev, [groupId]: [optionId] };
      } else {
        const current = prev[groupId] || [];
        const isSelected = current.includes(optionId);
        return {
          ...prev,
          [groupId]: isSelected 
            ? current.filter(id => id !== optionId)
            : [...current, optionId]
        };
      }
    });
  };

  const validateComplements = (): boolean => {
    const requiredGroups = complementGroups.filter(g => g.obrigatorio);
    
    for (const group of requiredGroups) {
      const selected = selectedComplements[group.id];
      if (!selected || selected.length === 0) {
        toast.error(`Por favor, selecione uma opção em "${group.nome}"`);
        return false;
      }
    }
    
    return true;
  };

  const calculateTotal = (): number => {
    let total = item?.preco || 0;
    
    Object.entries(selectedComplements).forEach(([groupId, optionIds]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (group) {
        optionIds.forEach(optionId => {
          const option = group.options.find(o => o.id === optionId);
          if (option && option.valor_adicional) {
            total += option.valor_adicional;
          }
        });
      }
    });
    
    return total * quantity;
  };

  const handleAdd = () => {
    if (!item) return;
    
    if (!validateComplements()) return;

    const complementsArray: SelectedComplement[] = Object.entries(selectedComplements).map(([groupId, optionIds]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (!group) return null;

      return {
        groupId,
        groupName: group.nome,
        options: optionIds.map(optionId => {
          const option = group.options.find(o => o.id === optionId);
          return option ? {
            id: option.id,
            name: option.nome,
            additionalPrice: option.valor_adicional || 0
          } : null;
        }).filter(Boolean) as any[]
      };
    }).filter(Boolean) as SelectedComplement[];

    onAddToCart(item, quantity, notes, complementsArray);
    handleClose();
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1100px] w-[95vw] p-0 gap-0 overflow-hidden grid lg:grid-cols-[1fr_400px]"
        onEscapeKeyDown={handleClose}
        aria-describedby="product-description"
        aria-labelledby="product-title"
      >
        {/* Imagem - Coluna Esquerda */}
        <div className="relative w-full flex items-center justify-center bg-background min-h-[300px] lg:min-h-0">
          {item.imagem ? (
            <img
              src={item.imagem}
              alt={item.nome}
              className="w-full h-auto object-contain max-h-[600px]"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">
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
        <div className="p-6 space-y-4 overflow-y-auto max-h-[90vh] lg:max-h-[520px] flex flex-col">
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

          {/* Complementos */}
          {complementGroups.length > 0 && (
            <div className="space-y-4">
              {complementGroups.map((group) => (
                <div key={group.id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold text-base">{group.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {group.obrigatorio ? 'Obrigatório' : 'Opcional'} • 
                      Escolha {group.tipo === 'radio' ? '1 opção' : 'uma ou mais opções'}
                    </p>
                  </div>

                  {group.tipo === 'radio' ? (
                    <RadioGroup
                      value={selectedComplements[group.id]?.[0] || ''}
                      onValueChange={(value) => handleComplementChange(group.id, value, 'radio')}
                    >
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                            {option.nome}
                            {option.valor_adicional > 0 && (
                              <span className="text-muted-foreground ml-2">
                                +R$ {option.valor_adicional.toFixed(2)}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.id}
                            checked={selectedComplements[group.id]?.includes(option.id) || false}
                            onCheckedChange={() => handleComplementChange(group.id, option.id, 'checkbox')}
                          />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                            {option.nome}
                            {option.valor_adicional > 0 && (
                              <span className="text-muted-foreground ml-2">
                                +R$ {option.valor_adicional.toFixed(2)}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
            Adicionar • R$ {calculateTotal().toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
