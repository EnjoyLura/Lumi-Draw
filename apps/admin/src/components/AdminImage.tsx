import { useEffect, useState, type ImgHTMLAttributes } from "react";

type AdminImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> & {
  eager?: boolean;
};

export function AdminImage({ eager = false, className = "", src, onLoad, onError, ...props }: AdminImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    setState("loading");
  }, [src]);

  return (
    <img
      {...props}
      className={`${className} admin-image ${state}`.trim()}
      src={src}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      draggable={false}
      onLoad={(event) => {
        setState("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        setState("failed");
        onError?.(event);
      }}
    />
  );
}
