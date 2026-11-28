"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Trash2, Check, X, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductLogoUploaderProps {
  productId?: number | null;
  currentLogoUrl?: string | null;
  currentLogoPath?: string | null;
  productName?: string;
  onSave?: (file: File) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  isSaving?: boolean;
  isDeleting?: boolean;
  onPendingFileChange?: (file: File | null) => void;
  compact?: boolean;
}

export function ProductLogoUploader({
  productId,
  currentLogoUrl,
  currentLogoPath,
  productName = "Product",
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  onPendingFileChange,
  compact = false,
}: ProductLogoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate local preview when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setImgLoadFailed(false);
    onPendingFileChange?.(selectedFile);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile, onPendingFileChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Format file tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Ukuran file melebihi batas maksimal 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onPendingFileChange?.(null);
  };

  const handleConfirmSave = async () => {
    if (!selectedFile || !onSave) return;
    try {
      await onSave(selectedFile);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      // Error handled by parent mutation toast
    }
  };

  const resolvedSavedSrc = previewUrl
    ? previewUrl
    : currentLogoUrl
    ? currentLogoUrl
    : currentLogoPath && productId
    ? `/api/products/${productId}/logo?v=${encodeURIComponent(currentLogoPath)}`
    : null;

  const hasImage = Boolean(resolvedSavedSrc && !imgLoadFailed);

  return (
    <div className="w-full space-y-3">
      {/* Upload & Preview Canvas */}
      <div
        className={`relative rounded-xl border border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${
          selectedFile
            ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5"
            : "border-border/80 bg-muted/20 hover:bg-muted/30"
        } ${compact ? "h-24 p-2" : "h-36 p-4"}`}
      >
        {isSaving || isDeleting ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand)]" />
            <span className="text-xs text-muted-foreground">
              {isSaving ? "Menyimpan logo..." : "Menghapus logo..."}
            </span>
          </div>
        ) : hasImage ? (
          <div className="relative h-full w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedSavedSrc!}
              alt={`${productName} logo`}
              className="max-h-full max-w-full object-contain"
              onError={() => setImgLoadFailed(true)}
            />
            {selectedFile && (
              <Badge
                variant="brand"
                className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 shadow-xs"
              >
                Preview Baru
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <div className="h-9 w-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-foreground">
              {compact ? "Pilih Logo" : "Upload Logo Brand Produk"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              PNG, JPG, atau WebP (maks 2MB)
            </p>
          </div>
        )}
      </div>

      {/* Validation Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
          disabled={isSaving || isDeleting}
        />

        {selectedFile ? (
          <>
            {onSave ? (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex-1 h-8 text-xs font-semibold gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Simpan Logo
              </Button>
            ) : (
              <div className="flex-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate px-1">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate font-medium">{selectedFile.name}</span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Batal
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving || isDeleting}
              className="flex-1 h-8 text-xs font-medium gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{hasImage ? "Ganti Logo" : "Pilih File"}</span>
            </Button>

            {hasImage && onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={isSaving || isDeleting}
                className="h-8 px-2.5 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
                title="Hapus Logo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
