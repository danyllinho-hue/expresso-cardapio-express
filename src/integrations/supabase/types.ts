export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      complement_groups: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          tipo?: string
        }
        Relationships: []
      }
      complement_options: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          nome: string
          ordem: number
          valor_adicional: number | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          nome: string
          ordem?: number
          valor_adicional?: number | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          nome?: string
          ordem?: number
          valor_adicional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "complement_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          data_nascimento: string | null
          endereco: string | null
          id: string
          nome: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string
          nome: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          whatsapp?: string
        }
        Relationships: []
      }
      menu_item_complements: {
        Row: {
          complement_group_id: string
          created_at: string | null
          id: string
          menu_item_id: string
        }
        Insert: {
          complement_group_id: string
          created_at?: string | null
          id?: string
          menu_item_id: string
        }
        Update: {
          complement_group_id?: string
          created_at?: string | null
          id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_complements_complement_group_id_fkey"
            columns: ["complement_group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_complements_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          id: string
          image_thumb_url: string | null
          imagem: string | null
          nome: string
          preco: number
          status: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          image_thumb_url?: string | null
          imagem?: string | null
          nome: string
          preco: number
          status?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          image_thumb_url?: string | null
          imagem?: string | null
          nome?: string
          preco?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          menu_item_name: string
          notes: string | null
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          menu_item_name: string
          notes?: string | null
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          menu_item_name?: string
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivery_address: string | null
          id: string
          notes: string | null
          status: string
          total: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          status?: string
          total: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          tipo?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      restaurant_config: {
        Row: {
          created_at: string | null
          endereco: string
          horario_funcionamento: Json | null
          id: string
          modo_atendimento: string | null
          nome_restaurante: string
          status_funcionamento: string | null
          tempo_entrega: string | null
          whatsapp_oficial: string
        }
        Insert: {
          created_at?: string | null
          endereco?: string
          horario_funcionamento?: Json | null
          id?: string
          modo_atendimento?: string | null
          nome_restaurante?: string
          status_funcionamento?: string | null
          tempo_entrega?: string | null
          whatsapp_oficial?: string
        }
        Update: {
          created_at?: string | null
          endereco?: string
          horario_funcionamento?: Json | null
          id?: string
          modo_atendimento?: string | null
          nome_restaurante?: string
          status_funcionamento?: string | null
          tempo_entrega?: string | null
          whatsapp_oficial?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "atendente" | "cozinha"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "atendente", "cozinha"],
    },
  },
} as const
