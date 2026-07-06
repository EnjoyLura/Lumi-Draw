import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface StackEntry {
  id: string;
  param?: string;
}

interface SheetState {
  open: boolean;
  title: string;
  body: ReactNode;
  foot: ReactNode;
}

interface DialogState {
  open: boolean;
  title: string;
  msg: string;
  danger: boolean;
  onOk?: () => void;
}

interface NavContextValue {
  stack: StackEntry[];
  current: StackEntry;
  dir: "in" | "back";
  drawerOpen: boolean;
  sheet: SheetState;
  dialog: DialogState;
  toastMsg: string;
  toastShow: boolean;
  go: (id: string, param?: string, root?: boolean) => void;
  back: () => void;
  onNavLeft: () => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (title: string, body: ReactNode, foot?: ReactNode) => void;
  closeSheet: () => void;
  confirmDlg: (title: string, msg: string, onOk?: () => void, danger?: boolean) => void;
  closeDialog: () => void;
  closeAll: () => void;
  toast: (msg: string) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

const CLOSED_SHEET: SheetState = { open: false, title: "", body: null, foot: null };
const CLOSED_DIALOG: DialogState = { open: false, title: "", msg: "", danger: false, onOk: undefined };

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([{ id: "home" }]);
  const [dir, setDir] = useState<"in" | "back">("in");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(CLOSED_SHEET);
  const [dialog, setDialog] = useState<DialogState>(CLOSED_DIALOG);
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const go = useCallback((id: string, param?: string, root?: boolean) => {
    setDir("in");
    setStack((prev) => (root ? [{ id, param }] : [...prev, { id, param }]));
    setDrawerOpen(false);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      setDir("back");
      return prev.slice(0, -1);
    });
  }, []);

  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);

  const onNavLeft = useCallback(() => {
    if (stack.length > 1) {
      setDir("back");
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      return;
    }
    setDrawerOpen((v) => !v);
  }, [stack.length]);

  const openSheet = useCallback((title: string, body: ReactNode, foot?: ReactNode) => {
    setSheet({ open: true, title, body, foot: foot ?? null });
  }, []);

  const closeSheet = useCallback(() => setSheet(CLOSED_SHEET), []);

  const confirmDlg = useCallback((title: string, msg: string, onOk?: () => void, danger?: boolean) => {
    setDialog({ open: true, title, msg, onOk, danger: !!danger });
  }, []);

  const closeDialog = useCallback(() => setDialog(CLOSED_DIALOG), []);

  const closeAll = useCallback(() => {
    setDrawerOpen(false);
    setSheet(CLOSED_SHEET);
    setDialog(CLOSED_DIALOG);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 1800);
  }, []);

  const value = useMemo<NavContextValue>(
    () => ({
      stack,
      current: stack[stack.length - 1],
      dir,
      drawerOpen,
      sheet,
      dialog,
      toastMsg,
      toastShow,
      go,
      back,
      onNavLeft,
      toggleDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      confirmDlg,
      closeDialog,
      closeAll,
      toast
    }),
    [stack, dir, drawerOpen, sheet, dialog, toastMsg, toastShow, go, back, onNavLeft, toggleDrawer, closeDrawer, openSheet, closeSheet, confirmDlg, closeDialog, closeAll, toast]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
