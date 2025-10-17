import { Button } from "@/components/ui/button";

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
    <div className="sticky top-[80px] md:top-[200px] z-40 bg-card/95 backdrop-blur-lg border-b shadow-sm">
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(null)}
              className="shrink-0 shadow-sm transition-all hover:scale-105 whitespace-nowrap"
            >
              🔥 Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCategory(cat.id)}
                className="shrink-0 shadow-sm transition-all hover:scale-105 whitespace-nowrap"
              >
                {cat.nome}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
