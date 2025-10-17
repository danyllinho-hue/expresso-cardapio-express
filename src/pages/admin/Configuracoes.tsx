import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RestaurantConfig {
  id: string;
  nome_restaurante: string;
  razao_social?: string;
  site?: string;
  cep?: string;
  endereco: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  telefone?: string;
  email?: string;
  whatsapp_oficial: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  email_notificacao?: string;
  exibir_dados_publicos?: boolean;
  exibir_endereco?: boolean;
  status_funcionamento: string;
  habilitar_whatsapp?: boolean;
  whatsapp_mensagem?: string;
  valor_pedido_minimo?: number;
  valor_frete_gratis?: number;
  modo_atendimento: string;
  tempo_entrega: string;
  aceitar_loja_fechada?: boolean;
  horario_funcionamento?: any;
  logo_url?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
}

interface Neighborhood {
  id: string;
  nome: string;
  ativo: boolean;
  taxa_entrega: number;
  pedido_minimo: number;
  ordem: number;
}

const DIAS_SEMANA = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const Configuracoes = () => {
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchNeighborhoods();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_config")
        .select("*")
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const fetchNeighborhoods = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_neighborhoods")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      setNeighborhoods(data || []);
    } catch (error) {
      console.error("Erro ao carregar bairros:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurant_config")
        .update(config)
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cardapio-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cardapio-images')
        .getPublicUrl(filePath);

      // Atualizar no banco de dados imediatamente
      const { error: updateError } = await supabase
        .from("restaurant_config")
        .update({ logo_url: publicUrl })
        .eq("id", config.id);

      if (updateError) throw updateError;

      setConfig({ ...config, logo_url: publicUrl });
      toast.success("Logo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddNeighborhood = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_neighborhoods")
        .insert({
          nome: "Novo Bairro",
          ativo: false,
          taxa_entrega: 0,
          pedido_minimo: 0,
          ordem: neighborhoods.length,
        })
        .select()
        .single();

      if (error) throw error;
      setNeighborhoods([...neighborhoods, data]);
      toast.success("Bairro adicionado!");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao adicionar bairro");
    }
  };

  const handleUpdateNeighborhood = async (id: string, updates: Partial<Neighborhood>) => {
    try {
      const { error } = await supabase
        .from("delivery_neighborhoods")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      setNeighborhoods(neighborhoods.map(n => 
        n.id === id ? { ...n, ...updates } : n
      ));
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar bairro");
    }
  };

  const handleDeleteNeighborhood = async (id: string) => {
    try {
      const { error } = await supabase
        .from("delivery_neighborhoods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNeighborhoods(neighborhoods.filter(n => n.id !== id));
      toast.success("Bairro removido!");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao remover bairro");
    }
  };

  const updateHorario = (dia: string, field: string, value: any) => {
    if (!config) return;
    
    const horarios = config.horario_funcionamento || {};
    setConfig({
      ...config,
      horario_funcionamento: {
        ...horarios,
        [dia]: {
          ...(horarios[dia] || {}),
          [field]: value,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return <div>Configurações não encontradas</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Loja</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do seu estabelecimento
        </p>
      </div>

      <Tabs defaultValue="loja" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="loja">Loja</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="bairros">Bairros</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
        </TabsList>

        {/* ABA LOJA */}
        <TabsContent value="loja" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status da Loja</CardTitle>
              <CardDescription>Controle se sua loja está aberta ou fechada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="status">Loja Aberta</Label>
                <Switch
                  id="status"
                  checked={config.status_funcionamento === "aberto"}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, status_funcionamento: checked ? "aberto" : "fechado" })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Fantasia da Loja *</Label>
                  <Input
                    value={config.nome_restaurante}
                    onChange={(e) => setConfig({ ...config, nome_restaurante: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input
                    value={config.razao_social || ""}
                    onChange={(e) => setConfig({ ...config, razao_social: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Input
                    value={config.site || ""}
                    onChange={(e) => setConfig({ ...config, site: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={config.cep || ""}
                    onChange={(e) => setConfig({ ...config, cep: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Endereço *</Label>
                  <Input
                    value={config.endereco}
                    onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={config.numero || ""}
                    onChange={(e) => setConfig({ ...config, numero: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={config.bairro || ""}
                    onChange={(e) => setConfig({ ...config, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={config.cidade || ""}
                    onChange={(e) => setConfig({ ...config, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={config.estado || ""}
                    onChange={(e) => setConfig({ ...config, estado: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Complemento/Ponto de Referência</Label>
                <Input
                  value={config.complemento || ""}
                  onChange={(e) => setConfig({ ...config, complemento: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={config.telefone || ""}
                    onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={config.email || ""}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Redes Sociais</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Facebook"
                    value={config.facebook || ""}
                    onChange={(e) => setConfig({ ...config, facebook: e.target.value })}
                  />
                  <Input
                    placeholder="Instagram"
                    value={config.instagram || ""}
                    onChange={(e) => setConfig({ ...config, instagram: e.target.value })}
                  />
                  <Input
                    placeholder="Youtube"
                    value={config.youtube || ""}
                    onChange={(e) => setConfig({ ...config, youtube: e.target.value })}
                  />
                  <Input
                    placeholder="Twitter"
                    value={config.twitter || ""}
                    onChange={(e) => setConfig({ ...config, twitter: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Email para Notificação de Pedidos</Label>
                <Input
                  type="email"
                  value={config.email_notificacao || ""}
                  onChange={(e) => setConfig({ ...config, email_notificacao: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Exibir publicamente estes dados pelos canais de venda</Label>
                  <Switch
                    checked={config.exibir_dados_publicos || false}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, exibir_dados_publicos: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Deixar endereço da loja visível para o cliente</Label>
                  <Switch
                    checked={config.exibir_endereco || false}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, exibir_endereco: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Habilitar contato via WhatsApp</Label>
                <Switch
                  checked={config.habilitar_whatsapp || false}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, habilitar_whatsapp: checked })
                  }
                />
              </div>
              
              {config.habilitar_whatsapp && (
                <>
                  <div className="space-y-2">
                    <Label>Número do WhatsApp</Label>
                    <Input
                      value={config.whatsapp_oficial}
                      onChange={(e) => setConfig({ ...config, whatsapp_oficial: e.target.value })}
                      placeholder="75992315312"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem de redirecionamento para o WhatsApp</Label>
                    <Textarea
                      value={config.whatsapp_mensagem || ""}
                      onChange={(e) => setConfig({ ...config, whatsapp_mensagem: e.target.value })}
                      placeholder="Olá! Vim pelo Cardápio Digital..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </TabsContent>

        {/* ABA PEDIDOS */}
        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Valor de Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.valor_pedido_minimo || 0}
                  onChange={(e) =>
                    setConfig({ ...config, valor_pedido_minimo: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Valor de Pedido Mínimo para Frete Grátis (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.valor_frete_gratis || 0}
                  onChange={(e) =>
                    setConfig({ ...config, valor_frete_gratis: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Aceitar pedidos com a loja fechada</Label>
                <Switch
                  checked={config.aceitar_loja_fechada || false}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, aceitar_loja_fechada: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipo de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Escolha como deseja operar</Label>
                <Select
                  value={config.modo_atendimento}
                  onValueChange={(value) => setConfig({ ...config, modo_atendimento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrega">Apenas Entrega</SelectItem>
                    <SelectItem value="retirada">Apenas Retirada</SelectItem>
                    <SelectItem value="ambos">Entrega e Retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entrega e Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tempo de entrega inicial</Label>
                <Input
                  value={config.tempo_entrega}
                  onChange={(e) => setConfig({ ...config, tempo_entrega: e.target.value })}
                  placeholder="30-40 min"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </TabsContent>

        {/* ABA BAIRROS */}
        <TabsContent value="bairros" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Áreas e Taxas de Entrega</CardTitle>
                  <CardDescription>Gerencie os bairros e valores de entrega</CardDescription>
                </div>
                <Button onClick={handleAddNeighborhood}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Bairro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {neighborhoods.map((neighborhood) => (
                <Card key={neighborhood.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Input
                          value={neighborhood.nome}
                          onChange={(e) =>
                            handleUpdateNeighborhood(neighborhood.id, { nome: e.target.value })
                          }
                          className="text-lg font-semibold"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {neighborhood.ativo ? "Ativo" : "Inativo"}
                            </span>
                            <Switch
                              checked={neighborhood.ativo}
                              onCheckedChange={(checked) =>
                                handleUpdateNeighborhood(neighborhood.id, { ativo: checked })
                              }
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteNeighborhood(neighborhood.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pedido mínimo para o bairro (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={neighborhood.pedido_minimo}
                            onChange={(e) =>
                              handleUpdateNeighborhood(neighborhood.id, {
                                pedido_minimo: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Taxa de entrega (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={neighborhood.taxa_entrega}
                            onChange={(e) =>
                              handleUpdateNeighborhood(neighborhood.id, {
                                taxa_entrega: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {neighborhoods.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum bairro cadastrado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA HORÁRIOS */}
        <TabsContent value="horarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Disponibilidade</CardTitle>
              <CardDescription>
                Configure os dias e horários de funcionamento do estabelecimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DIAS_SEMANA.map(({ key, label }) => {
                const horario = config.horario_funcionamento?.[key] || { aberto: false };
                
                return (
                  <Card key={key}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">{label}</Label>
                          <Switch
                            checked={horario.aberto || false}
                            onCheckedChange={(checked) =>
                              updateHorario(key, "aberto", checked)
                            }
                          />
                        </div>

                        {horario.aberto && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Horário de Início</Label>
                              <Input
                                type="time"
                                value={horario.inicio || ""}
                                onChange={(e) =>
                                  updateHorario(key, "inicio", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Horário de Fim</Label>
                              <Input
                                type="time"
                                value={horario.fim || ""}
                                onChange={(e) =>
                                  updateHorario(key, "fim", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Horários
          </Button>
        </TabsContent>

        {/* ABA PERSONALIZAÇÃO */}
        <TabsContent value="personalizacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalize sua Loja</CardTitle>
              <CardDescription>
                Adicione logo e escolha as cores do cardápio digital
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Logotipo</Label>
                {config.logo_url && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img
                      src={config.logo_url}
                      alt="Logo"
                      className="max-h-32 object-contain mx-auto"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  <Button disabled={uploadingLogo} variant="outline">
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor da Marca (Primária)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.cor_primaria || "#FF6B35"}
                      onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={config.cor_primaria || "#FF6B35"}
                      onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor Secundária da Marca</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.cor_secundaria || "#F7931E"}
                      onChange={(e) => setConfig({ ...config, cor_secundaria: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={config.cor_secundaria || "#F7931E"}
                      onChange={(e) => setConfig({ ...config, cor_secundaria: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Personalização
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
