import { useNav } from "./NavContext";

export function Dialog() {
  const { dialog, closeDialog } = useNav();
  const onOk = () => {
    closeDialog();
    dialog.onOk?.();
  };
  return (
    <div className={`dialog${dialog.open ? " show" : ""}`}>
      <div className="dg-title">{dialog.title}</div>
      <div className="dg-msg">{dialog.msg}</div>
      <div className="dg-btns">
        <button className="btn btn-ghost btn-block" onClick={closeDialog}>取消</button>
        <button className={`btn btn-block ${dialog.danger ? "btn-danger" : "btn-primary"}`} onClick={onOk}>确定</button>
      </div>
    </div>
  );
}
