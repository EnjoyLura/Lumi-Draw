import { useNav } from "./NavContext";
import { DRAWER_MENU } from "./menu";

export function Drawer() {
  const { drawerOpen, current, go } = useNav();
  return (
    <div className={`drawer${drawerOpen ? " show" : ""}`}>
      <div className="drawer-head">
        <div className="dh-title"><i className="ri-palette-line" />露米绘画后台</div>
        <div className="dh-sub">运营管理系统 v1.0</div>
      </div>
      <div className="drawer-body">
        {DRAWER_MENU.map((grp) => (
          <div key={grp.g}>
            <div className="dgroup-label">{grp.g}</div>
            {grp.items.map((it) => (
              <div
                key={it.id}
                className={`ditem${it.id === current.id ? " active" : ""}`}
                onClick={() => go(it.id, undefined, true)}
              >
                <i className={it.i} />{it.t}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
