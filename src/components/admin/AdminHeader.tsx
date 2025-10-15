import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function AdminHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Painel Expresso Espetaria 🍢</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu delivery</p>
        </div>
      </div>
    </header>
  );
}