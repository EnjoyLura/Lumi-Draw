import { ConfigProvider, App as AntApp, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminSessionProvider, useAdminSession } from "./data/adminSession";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminLayout } from "./shell/AdminLayout";
import { NavProvider } from "./shell/NavContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1
    },
    mutations: { retry: 0 }
  }
});

function Shell() {
  const { useMock, loggedIn } = useAdminSession();
  if (!useMock && !loggedIn) {
    return <AdminLogin />;
  }
  return (
    <NavProvider>
      <Routes>
        <Route path="*" element={<AdminLayout />} />
        <Route path="/" element={<Navigate to="/workbench" replace />} />
      </Routes>
    </NavProvider>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#5B9FE8",
          colorInfo: "#5B9FE8",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          colorError: "#EF4444",
          borderRadius: 10,
          colorBgLayout: "#F4F7FB",
          colorText: "#1F2733",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
        },
        components: {
          Table: { headerBg: "#F7F9FC", headerColor: "#5B6675" },
          Card: { borderRadiusLG: 14 },
          Layout: { siderBg: "#FFFFFF", headerBg: "#FFFFFF" }
        }
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AdminSessionProvider>
              <Shell />
            </AdminSessionProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
