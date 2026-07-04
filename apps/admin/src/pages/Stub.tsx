import { pageTitle } from "../shell/menu";

export function Stub({ id }: { id: string }) {
  return (
    <div className="empty">
      <i className="ri-tools-line" />
      <div className="et">{pageTitle(id)}（待补充）</div>
    </div>
  );
}
