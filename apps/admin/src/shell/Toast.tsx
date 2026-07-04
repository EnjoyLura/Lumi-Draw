import { useNav } from "./NavContext";

export function Toast() {
  const { toastMsg, toastShow } = useNav();
  return <div className={`toast${toastShow ? " show" : ""}`}>{toastMsg}</div>;
}
