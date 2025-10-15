import { useState, useRef, DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (imageUrl: string, thumbUrl: string) => void;
  itemName?: string;
}

const ImageUpload = ({ currentImageUrl, onImageUploaded, itemName }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const convertToWebP = async (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível obter contexto do canvas"));
          return;
        }

        // Otimização de qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Não foi possível converter para WebP"));
            }
          },
          "image/webp",
          0.85 // Qualidade otimizada para melhor compressão
        );
      };

      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    // Validações
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error("Use imagens JPG, PNG ou WEBP com até 2 MB.");
      return;
    }

    // Validação de tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande! Tamanho máximo: 2MB");
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Gerar nome do arquivo
      const slug = generateSlug(itemName || "produto");
      const uuid = crypto.randomUUID().split("-")[0];
      const fileName = `${slug}-${uuid}`;

      setProgress(30);

      // Converter para WebP - versão full (1200px)
      const fullBlob = await convertToWebP(file, 1200);
      setProgress(50);

      // Converter para WebP - versão thumb (400px)
      const thumbBlob = await convertToWebP(file, 400);
      setProgress(60);

      // Upload versão full
      const { data: fullData, error: fullError } = await supabase.storage
        .from("cardapio-images")
        .upload(`${fileName}.webp`, fullBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (fullError) throw fullError;
      setProgress(80);

      // Upload versão thumb
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from("cardapio-images")
        .upload(`thumbs/${fileName}.webp`, thumbBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (thumbError) throw thumbError;
      setProgress(90);

      // Obter URLs públicas
      const { data: fullUrl } = supabase.storage
        .from("cardapio-images")
        .getPublicUrl(fullData.path);

      const { data: thumbUrl } = supabase.storage
        .from("cardapio-images")
        .getPublicUrl(thumbData.path);

      setProgress(100);
      setPreviewUrl(fullUrl.publicUrl);
      onImageUploaded(fullUrl.publicUrl, thumbUrl.publicUrl);
      toast.success("Imagem enviada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      
      if (error.message?.includes("storage")) {
        toast.error("Erro no armazenamento. Verifique as permissões.");
      } else if (error.message?.includes("convert")) {
        toast.error("Erro ao processar imagem. Tente outro formato.");
      } else {
        toast.error("Não foi possível enviar a imagem. Tente novamente.");
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageUploaded("", "");
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) {
      toast.error("Digite uma URL válida");
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Fazer download da imagem
      const response = await fetch(importUrl);
      if (!response.ok) throw new Error("Não foi possível baixar a imagem");
      
      const blob = await response.blob();
      setProgress(30);

      // Verificar se é uma imagem válida
      if (!blob.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
        toast.error("URL não contém uma imagem válida (JPG, PNG ou WEBP)");
        return;
      }

      // Converter blob para File
      const file = new File([blob], "imported-image.jpg", { type: blob.type });
      
      // Usar a função existente de upload
      await handleFileUpload(file);
      
      setShowUrlImport(false);
      setImportUrl("");
    } catch (error) {
      console.error("Erro ao importar imagem:", error);
      toast.error("Não foi possível importar a imagem da URL");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="image-upload">Imagem do Produto</Label>
        {!previewUrl && currentImageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlImport(!showUrlImport)}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Importar de URL
          </Button>
        )}
      </div>

      {showUrlImport && (
        <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
          <Label htmlFor="import-url">URL da Imagem Externa</Label>
          <div className="flex gap-2">
            <Input
              id="import-url"
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={uploading}
            />
            <Button
              type="button"
              onClick={handleImportFromUrl}
              disabled={uploading || !importUrl}
            >
              Importar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A imagem será baixada, otimizada e armazenada no seu domínio
          </p>
        </div>
      )}
      
      {!previewUrl ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={uploading}
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                Arraste e solte aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, WEBP até 2 MB — recomendado 1:1
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Enviar imagem
            </Button>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="w-full max-w-xs space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Enviando imagem... {progress}%
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative border rounded-lg p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Substituir imagem
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
