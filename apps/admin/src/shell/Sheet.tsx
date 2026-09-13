import { useNav } from "./NavContext";

export function Sheet() {
  const { sheet, closeSheet } = useNav();
  return (
    <div className={`sheet${sheet.open ? " show" : ""}`}>
      <div className="sh-handle" />
      <div className="sh-head">
        <span className="sh-title">{sheet.title}</span>
        <span className="nav-btn" onClick={closeSheet}><i className="ri-close-line" /></span>
      </div>
      <div className="sh-body">{sheet.body}</div>
      {sheet.foot ? <div className="sh-foot">{sheet.foot}</div> : null}
    </div>
  );
}
