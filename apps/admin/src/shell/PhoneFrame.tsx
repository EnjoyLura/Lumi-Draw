import { renderPage } from "../pages/registry";
import { useOpenAdminMenu } from "./AdminMenu";
import { pageTitle } from "./menu";
import { useNav } from "./NavContext";
import { PageBoundary } from "./PageBoundary";

export function PhoneFrame() {
  const { stack, current, dir, onNavLeft } = useNav();
  const openAdminMenu = useOpenAdminMenu();
  const depth = stack.length;
  const bodyKey = `${current.id}:${current.param ?? ""}:${depth}`;

  return (
    <>
      <div className="status-bar">
        <span>9:41</span>
        <span className="sb-right"><i className="ri-signal-wifi-fill" /><i className="ri-battery-fill" /></span>
      </div>
      <div className="nav-header">
        <span className="nav-btn" onClick={onNavLeft}>
          <i className={depth > 1 ? "ri-arrow-left-line" : "ri-menu-2-line"} />
        </span>
        <span className="nav-title">{pageTitle(current.id, current.param)}</span>
        <span className="nav-avatar" onClick={openAdminMenu}>管</span>
      </div>
      <div className="content">
        <div key={bodyKey} className={`page-body ${dir === "back" ? "anim-back" : "anim-in"}`}>
          <PageBoundary resetKey={bodyKey}>{renderPage(current.id, current.param)}</PageBoundary>
        </div>
      </div>
    </>
  );
}
