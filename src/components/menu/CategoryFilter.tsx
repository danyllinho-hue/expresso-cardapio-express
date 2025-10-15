import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  nome: string;
  ordem: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryFilterProps) => {
  if (categories.length === 0) return null;

  return (
    <div className="sticky top-[200px] z-40 bg-card/95 backdrop-blur-lg border-b shadow-sm">
      <ScrollArea className="w-full">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 pb-2">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(null)}
              className="shrink-0 shadow-sm transition-all hover:scale-105"
            >
              🔥 Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCategory(cat.id)}
                className="shrink-0 shadow-sm transition-all hover:scale-105"
              >
                {cat.nome}
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
