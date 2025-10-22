import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImageData {
  url: string;
  thumbUrl: string;
  ordem: number;
}

interface MultiImageUploadProps {
  currentImages: ImageData[];
  onImagesChanged: (images: ImageData[]) => void;
  itemName?: string;
  maxImages?: number;
}

const MultiImageUpload = ({ 
  currentImages, 
  onImagesChanged, 
  itemName,
  maxImages = 3 
}: MultiImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
          0.85
        );
      };

      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (currentImages.length >= maxImages) {
      toast.error(`Máximo de ${maxImages} fotos permitidas`);
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error("Use imagens JPG, PNG ou WEBP com até 2 MB.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande! Tamanho máximo: 2MB");
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      const slug = generateSlug(itemName || "produto");
      const uuid = crypto.randomUUID().split("-")[0];
      const fileName = `${slug}-${uuid}-${currentImages.length}`;

      setProgress(30);

      const fullBlob = await convertToWebP(file, 1200);
      setProgress(50);

      const thumbBlob = await convertToWebP(file, 400);
      setProgress(60);

      const { data: fullData, error: fullError } = await supabase.storage
        .from("cardapio-images")
        .upload(`${fileName}.webp`, fullBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (fullError) throw fullError;
      setProgress(80);

      const { data: thumbData, error: thumbError } = await supabase.storage
        .from("cardapio-images")
        .upload(`thumbs/${fileName}.webp`, thumbBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (thumbError) throw thumbError;
      setProgress(90);

      const { data: fullUrl } = supabase.storage
        .from("cardapio-images")
        .getPublicUrl(fullData.path);

      const { data: thumbUrl } = supabase.storage
        .from("cardapio-images")
        .getPublicUrl(thumbData.path);

      const newImage: ImageData = {
        url: fullUrl.publicUrl,
        thumbUrl: thumbUrl.publicUrl,
        ordem: currentImages.length
      };

      setProgress(100);
      onImagesChanged([...currentImages, newImage]);
      toast.success("Imagem adicionada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = currentImages
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, ordem: i }));
    onImagesChanged(newImages);
    toast.success("Imagem removida!");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Fotos do Produto (até {maxImages})</Label>
        <span className="text-sm text-muted-foreground">
          {currentImages.length}/{maxImages} fotos
        </span>
      </div>

      {/* Preview das imagens */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {currentImages.map((image, index) => (
            <div key={index} className="relative border rounded-lg p-2 group">
              <img
                src={image.thumbUrl || image.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
              >
                <X className="w-3 h-3" />
              </Button>
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão de upload */}
      {currentImages.length < maxImages && (
        <div className="relative">
          <input
            type="file"
            id="multi-image-upload"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={uploading}
          />
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => document.getElementById('multi-image-upload')?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-pulse" />
                Enviando... {progress}%
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Adicionar Foto
              </>
            )}
          </Button>

          {uploading && (
            <div className="mt-2">
              <Progress value={progress} />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPG, PNG, WEBP até 2 MB • Primeira foto será a principal
      </p>
    </div>
  );
};

export default MultiImageUpload;