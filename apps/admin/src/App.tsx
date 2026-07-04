import { Dialog } from "./shell/Dialog";
import { Drawer } from "./shell/Drawer";
import { NavProvider, useNav } from "./shell/NavContext";
import { PhoneFrame } from "./shell/PhoneFrame";
import { Sheet } from "./shell/Sheet";
import { Toast } from "./shell/Toast";

function Overlay() {
  const { drawerOpen, sheet, dialog, closeAll } = useNav();
  const show = drawerOpen || sheet.open || dialog.open;
  return <div className={`overlay${show ? " show" : ""}`} onClick={closeAll} />;
}

export default function App() {
  return (
    <NavProvider>
      <div className="phone-frame">
        <div className="phone-screen">
          <PhoneFrame />
          <Drawer />
          <Overlay />
          <Sheet />
          <Dialog />
          <Toast />
        </div>
      </div>
    </NavProvider>
  );
}
