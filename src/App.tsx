import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BrandThemeProvider } from "@/context/BrandThemeContext";
import { MediaConfigProvider } from "@/components/MediaConfigProvider";
import { ConfirmDialogProvider } from "@/components/shared";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GuestRoute } from "@/components/layout/RouteGuards";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ProductsPage from "@/pages/catalog/ProductsPage";
import CategoriesPage from "@/pages/catalog/CategoriesPage";
import CustomersPage from "@/pages/customers/CustomersPage";
import CustomerDetailPage from "@/pages/customers/CustomerDetailPage";
import OrdersPage from "@/pages/orders/OrdersPage";
import OrderCreatePage from "@/pages/orders/OrderCreatePage";
import OrderDetailPage from "@/pages/orders/OrderDetailPage";
import StockPage from "@/pages/stock/StockPage";
import BusinessGroupsPage from "@/pages/businesses/BusinessGroupsPage";
import BusinessGroupCreatePage from "@/pages/businesses/BusinessGroupCreatePage";
import BusinessGroupDetailPage from "@/pages/businesses/BusinessGroupDetailPage";
import BusinessesListPage from "@/pages/businesses/BusinessesListPage";
import BusinessSettingsPage from "@/pages/businesses/BusinessSettingsPage";
import ModulesPage from "@/pages/settings/ModulesPage";
import RolesPage from "@/pages/settings/RolesPage";
import SystemUsersPage from "@/pages/settings/SystemUsersPage";
import ThemeSettingsPage from "@/pages/settings/ThemeSettingsPage";
import NotificationEventsPage from "@/pages/settings/NotificationEventsPage";
import PaymentsSettingsPage from "@/pages/settings/PaymentsSettingsPage";
import DashboardPage from "@/pages/insights/DashboardPage";
import PaymentThankYouPage from "@/pages/public/PaymentThankYouPage";
import PaymentCancelledPage from "@/pages/public/PaymentCancelledPage";
import RecycleBinPage from "@/pages/recycle-bin/RecycleBinPage";

export default function App() {
  return (
    <MediaConfigProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <BrandThemeProvider>
            <BrowserRouter>
              <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route path="/pay/thank-you" element={<PaymentThankYouPage />} />
          <Route path="/pay/cancelled" element={<PaymentCancelledPage />} />

          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
            <Route path="/businesses" element={<Navigate to="/businesses/list" replace />} />
            <Route path="/businesses/groups" element={<BusinessGroupsPage />} />
            <Route path="/businesses/groups/new" element={<BusinessGroupCreatePage />} />
            <Route path="/businesses/groups/:groupId" element={<BusinessGroupDetailPage />} />
            <Route path="/businesses/list" element={<BusinessesListPage />} />
            <Route path="/businesses/list/:businessId/settings" element={<BusinessSettingsPage />} />
            <Route path="/catalog" element={<Navigate to="/catalog/products" replace />} />
            <Route path="/catalog/products" element={<ProductsPage />} />
            <Route path="/catalog/categories" element={<CategoriesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderCreatePage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/recycle-bin" element={<RecycleBinPage />} />
            <Route path="/products" element={<Navigate to="/catalog/products" replace />} />
            <Route path="/settings" element={<Navigate to="/settings/modules" replace />} />
            <Route path="/settings/modules" element={<ModulesPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/settings/users" element={<SystemUsersPage />} />
            <Route path="/settings/themes" element={<ThemeSettingsPage />} />
            <Route path="/settings/notifications" element={<NotificationEventsPage />} />
            <Route path="/settings/payments" element={<PaymentsSettingsPage />} />
          </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </BrandThemeProvider>
      </ConfirmDialogProvider>
    </AuthProvider>
    </MediaConfigProvider>
  );
}
