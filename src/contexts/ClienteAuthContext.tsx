import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface ClienteAuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  displayName: string | null;
  signOut: () => Promise<void>;
}

const ClienteAuthContext = createContext<ClienteAuthContextType | undefined>(undefined);

export const ClienteAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Register listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setIsLoading(false);
    });

    // Then hydrate
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const displayName =
    (user?.user_metadata?.nome as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : null);

  return (
    <ClienteAuthContext.Provider value={{ session, user, isLoading, displayName, signOut }}>
      {children}
    </ClienteAuthContext.Provider>
  );
};

export const useClienteAuth = () => {
  const ctx = useContext(ClienteAuthContext);
  if (!ctx) throw new Error("useClienteAuth must be used inside ClienteAuthProvider");
  return ctx;
};
