import { useRef, useState } from "react";
import { apiUploadConfigImage } from "../data/api";
import { useNav } from "../shell/NavContext";
import { AdminImage } from "./AdminImage";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function ConfigImagePicker({
  value,
  scene,
  useMock,
  disabled,
  onChange
}: {
  value: string;
  scene: "gameplay" | "style";
  useMock: boolean;
  disabled?: boolean;
  onChange: (url: string) => void;
}) {
  const { toast } = useNav();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const choose = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("请选择图片文件"); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast("封面图片不能超过10MB"); return; }
    setUploading(true);
    try {
      const url = useMock ? await readFileAsDataUrl(file) : (await apiUploadConfigImage(scene, file)).imageUrl;
      onChange(url);
      toast(useMock ? "图片已选择" : "图片已上传");
    } catch (error) {
      toast(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => { void choose(event.target.files?.[0]); }}
      />
      <button
        type="button"
        className="card"
        style={{ width: "100%", height: 112, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", borderStyle: "dashed", cursor: "pointer", overflow: "hidden", position: "relative" }}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <AdminImage eager src={value} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="封面预览" />
            <span style={{ position: "absolute", right: 8, bottom: 8, padding: "3px 8px", borderRadius: 999, color: "#fff", background: "rgba(0,0,0,.58)", fontSize: 12 }}>点击更换</span>
          </>
        ) : (
          <span><i className={uploading ? "ri-loader-4-line" : "ri-upload-cloud-line"} style={{ fontSize: 22 }} />&nbsp;{uploading ? "上传中" : "点击上传封面"}</span>
        )}
      </button>
      <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg-muted)" }}>支持 JPG、PNG、WEBP、GIF，最大10MB</div>
    </>
  );
}
