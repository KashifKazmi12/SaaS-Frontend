import { useCallback, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Star, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import {
  normalizeProductImages,
  resolveMediaUrl,
  type ProductImage,
} from "@/lib/media";
import { FieldLabel } from "./FormField";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

interface FileUploadFieldBaseProps {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  folder?: string;
  accept?: string;
  maxFiles?: number;
  deleteOnRemove?: boolean;
  className?: string;
  hint?: string;
}

interface SingleFileUploadFieldProps extends FileUploadFieldBaseProps {
  mode?: "single";
  value: string;
  onChange: (value: string) => void;
}

interface MultipleFileUploadFieldProps extends FileUploadFieldBaseProps {
  mode: "multiple";
  value: ProductImage[];
  onChange: (value: ProductImage[]) => void;
  featuredEnabled?: boolean;
}

export type FileUploadFieldProps =
  | SingleFileUploadFieldProps
  | MultipleFileUploadFieldProps;

function isMultipleProps(props: FileUploadFieldProps): props is MultipleFileUploadFieldProps {
  return props.mode === "multiple";
}

export function FileUploadField(props: FileUploadFieldProps) {
  const {
    id,
    label,
    required,
    disabled,
    folder = "general",
    accept = DEFAULT_ACCEPT,
    maxFiles = 10,
    deleteOnRemove = false,
    className,
    hint,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const isMultiple = isMultipleProps(props);
  const featuredEnabled = isMultiple ? props.featuredEnabled ?? true : false;
  const images = isMultiple
    ? normalizeProductImages(props.value)
    : props.value
      ? normalizeProductImages([{ path: props.value, isFeatured: true }])
      : [];

  const canAddMore = isMultiple ? images.length < maxFiles : images.length === 0;
  const isUploading = uploadingCount > 0;

  const setSingleValue = useCallback(
    (path: string) => {
      if (!isMultiple) {
        props.onChange(path);
      }
    },
    [isMultiple, props]
  );

  const setMultipleValue = useCallback(
    (nextImages: ProductImage[]) => {
      if (isMultiple) {
        props.onChange(normalizeProductImages(nextImages));
      }
    },
    [isMultiple, props]
  );

  async function removeStoredFile(path: string) {
    if (!deleteOnRemove || !path || /^https?:\/\//i.test(path)) return;
    try {
      await api.deleteUpload(path);
    } catch {
      // File may already be removed or in use elsewhere.
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length || disabled) return;

    setError("");

    const slotsLeft = isMultiple ? maxFiles - images.length : 1 - images.length;
    const filesToUpload = files.slice(0, Math.max(slotsLeft, 0));

    if (!filesToUpload.length) {
      setError(`Maximum ${maxFiles} file(s) allowed.`);
      return;
    }

    setUploadingCount((count) => count + filesToUpload.length);

    const uploaded: ProductImage[] = [];

    for (const file of filesToUpload) {
      try {
        const result = await api.uploadFile(file, folder);
        uploaded.push({ path: result.path, isFeatured: false });
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "Unable to upload file."
        );
      } finally {
        setUploadingCount((count) => count - 1);
      }
    }

    if (!uploaded.length) return;

    if (isMultiple) {
      const merged = normalizeProductImages([...images, ...uploaded]);
      setMultipleValue(merged);
    } else {
      setSingleValue(uploaded[0].path);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.length) {
      uploadFiles(files);
    }
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled && canAddMore) {
      setDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled || !canAddMore) return;
    const files = event.dataTransfer.files;
    if (files?.length) {
      uploadFiles(files);
    }
  }

  async function handleRemove(path: string) {
    if (disabled) return;

    if (isMultiple) {
      const next = images.filter((item) => item.path !== path);
      setMultipleValue(next);
    } else {
      setSingleValue("");
    }

    await removeStoredFile(path);
  }

  function handleSetFeatured(path: string) {
    if (!isMultiple || !featuredEnabled || disabled) return;

    setMultipleValue(
      images.map((item) => ({
        ...item,
        isFeatured: item.path === path,
      }))
    );
  }

  function openFilePicker() {
    if (!disabled && canAddMore && !isUploading) {
      inputRef.current?.click();
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-3",
            isMultiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"
          )}
        >
          {images.map((image) => (
            <div
              key={image.path}
              className="group relative overflow-hidden rounded-lg border bg-muted/20"
            >
              <img
                src={resolveMediaUrl(image.path)}
                alt=""
                className={cn(
                  "w-full object-cover",
                  isMultiple ? "aspect-square" : "aspect-video max-h-48"
                )}
              />

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
                {featuredEnabled && isMultiple ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className={cn(
                            "text-white hover:bg-white/20",
                            image.isFeatured && "text-amber-300"
                          )}
                          aria-label={
                            image.isFeatured ? "Featured image" : "Set as featured"
                          }
                          disabled={disabled}
                          onClick={() => handleSetFeatured(image.path)}
                        />
                      }
                    >
                      <Star
                        className={cn("size-3.5", image.isFeatured && "fill-current")}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {image.isFeatured ? "Featured image" : "Set as featured"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span />
                )}

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-white hover:bg-white/20 hover:text-destructive"
                        aria-label="Remove image"
                        disabled={disabled}
                        onClick={() => handleRemove(image.path)}
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              </div>

              {image.isFeatured && featuredEnabled && isMultiple && (
                <span className="absolute top-2 left-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Featured
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
            disabled || isUploading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
            dragActive && "border-primary bg-primary/5",
            images.length > 0 && "py-4"
          )}
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : images.length > 0 ? (
            <ImagePlus className="size-5 text-muted-foreground" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading
                ? "Uploading..."
                : images.length > 0
                  ? isMultiple
                    ? "Add more images"
                    : "Replace image"
                  : isMultiple
                    ? "Upload images"
                    : "Upload image"}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or click to browse. JPG, PNG, WebP, or GIF.
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={isMultiple}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
