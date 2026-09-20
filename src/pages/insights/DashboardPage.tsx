import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Download,
  Package,
  PackageX,
  ShoppingBag,
  UserPlus,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { PageAlerts, PermissionButton } from "@/components/shared";
import {
  AttentionOrderRow,
  AttentionStockRow,
  InsightsAttentionPanel,
  InsightsPanelPager,
  InsightsRankedList,
} from "@/components/insights/InsightsAttentionPanel";
import {
  MixDonutChart,
  SalesByDayChart,
} from "@/components/insights/InsightsCharts";
import { InsightsFilters } from "@/components/insights/InsightsFilters";
import { InsightsKpiCard } from "@/components/insights/InsightsKpiCard";
import {
  InsightsBreakdownsSkeleton,
  InsightsChartsSkeleton,
  InsightsFiltersSkeleton,
  InsightsKpiSkeleton,
} from "@/components/insights/InsightsLoadingState";
import { paymentLabel, paymentTone, statusLabel, statusTone } from "@/components/insights/insightsUtils";
import { useInsightsScope } from "@/hooks/useInsightsScope";
import { useInsightsSection } from "@/hooks/useInsightsSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { InsightsAttentionOrder, InsightsAttentionStock, ListResponse } from "@/types";

const MODULE_PATH = MODULE_PATHS.DASHBOARD;
const LIST_LIMIT = 8;

function panelFooter(link: { to: string; label: string }, pager: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Link
        to={link.to}
        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
      >
        {link.label}
        <ArrowUpRight className="size-3" />
      </Link>
      <InsightsPanelPager
        page={pager.page}
        totalPages={pager.totalPages}
        disabled={pager.loading}
        onPageChange={pager.onPageChange}
      />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const scope = useInsightsScope();
  const scopeKey = JSON.stringify(scope.params);
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [refundsPage, setRefundsPage] = useState(1);
  const [stockPage, setStockPage] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUnpaidPage(1);
    setRefundsPage(1);
    setStockPage(1);
  }, [scopeKey]);

  const summary = useInsightsSection(scope.canFetch, `${scopeKey}|summary`, () =>
    api.getDashboardSummary(scope.params)
  );
  const charts = useInsightsSection(scope.canFetch, `${scopeKey}|charts`, () =>
    api.getDashboardCharts(scope.params)
  );
  const unpaid = useInsightsSection(scope.canFetch, `${scopeKey}|unpaid|${unpaidPage}`, () =>
    api.getDashboardUnpaid({ ...scope.params, page: unpaidPage, limit: LIST_LIMIT })
  );
  const refunds = useInsightsSection(scope.canFetch, `${scopeKey}|refunds|${refundsPage}`, () =>
    api.getDashboardRefunds({ ...scope.params, page: refundsPage, limit: LIST_LIMIT })
  );
  const stock = useInsightsSection(scope.canFetch, `${scopeKey}|stock|${stockPage}`, () =>
    api.getDashboardStockAlerts({ ...scope.params, page: stockPage, limit: LIST_LIMIT })
  );
  const breakdowns = useInsightsSection(scope.canFetch, `${scopeKey}|breakdowns`, () =>
    api.getDashboardBreakdowns(scope.params)
  );

  const currency = summary.data?.group.currency;
  const kpis = summary.data?.kpis;
  const money = (amount: number) => formatMoney(amount, currency);
  const followUpCount = kpis ? kpis.refundPending + kpis.lowStock + kpis.outOfStock : 0;
  const error = [
    scope.error,
    summary.error,
    charts.error,
    unpaid.error,
    refunds.error,
    stock.error,
    breakdowns.error,
  ]
    .filter(Boolean)
    .join(" ");

  const stockItems = stock.data?.items || [];

  function handleExport() {
    const payload = {
      summary: summary.data,
      charts: charts.data,
      breakdowns: breakdowns.data,
    };
    if (!summary.data && !charts.data && !breakdowns.data) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Dashboard exported.");
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        compact
        action={
          <PermissionButton
            modulePath={MODULE_PATH}
            action="export"
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={!summary.data && !charts.data && !breakdowns.data}
          >
            <Download className="size-3.5" />
            Export JSON
          </PermissionButton>
        }
      >
        <PageAlerts error={error} message={message} />

        {!scope.ready ? (
          <InsightsFiltersSkeleton />
        ) : (
          <InsightsFilters
            groups={scope.groups}
            groupId={scope.groupId}
            onGroupChange={scope.setGroupId}
            businesses={summary.data?.businesses || []}
            businessId={scope.businessId}
            onBusinessChange={scope.setBusinessId}
            range={scope.range}
            onRangeChange={scope.setRange}
            customFrom={scope.customFrom}
            customTo={scope.customTo}
            onCustomFromChange={scope.setCustomFrom}
            onCustomToChange={scope.setCustomTo}
            group={scope.group}
            rangeFrom={summary.data?.range.from}
            rangeTo={summary.data?.range.to}
            loading={summary.loading}
          />
        )}

        <div className="space-y-3">
          {summary.loading || !scope.ready ? (
            <InsightsKpiSkeleton />
          ) : !kpis ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No insight data yet. Try another period or branch.
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-7">
              <InsightsKpiCard
                label="Completed sales"
                value={money(kpis.sales)}
                hint={`${kpis.completedOrders} completed`}
                icon={Banknote}
                accent="emerald"
              />
              <InsightsKpiCard
                label="Orders placed"
                value={String(kpis.ordersPlaced)}
                hint={`${kpis.cancelledOrders} cancelled`}
                icon={ShoppingBag}
                accent="sky"
              />
              <InsightsKpiCard
                label="Open now"
                value={String(kpis.openOrders)}
                hint={
                  kpis.unpaidOpen
                    ? `${kpis.unpaidOpen} unpaid · ${money(kpis.unpaidAmount)}`
                    : "All paid"
                }
                icon={Package}
                accent="amber"
              />
              <InsightsKpiCard
                label="Follow-up"
                value={String(followUpCount)}
                hint={`${kpis.refundPending} refund · ${kpis.outOfStock} out`}
                icon={AlertTriangle}
                accent="rose"
              />
              <InsightsKpiCard
                label="New customers"
                value={String(kpis.newCustomers)}
                icon={UserPlus}
                accent="violet"
              />
              <InsightsKpiCard
                label="Low stock"
                value={String(kpis.lowStock)}
                icon={Package}
                accent="amber"
              />
              <InsightsKpiCard
                label="Out of stock"
                value={String(kpis.outOfStock)}
                icon={PackageX}
                accent="rose"
              />
            </section>
          )}

          {charts.loading || !scope.ready ? (
            <InsightsChartsSkeleton />
          ) : (
            <section className="grid gap-2 lg:grid-cols-3">
              <Card size="sm" className="lg:col-span-2">
                <CardHeader className="border-b py-2">
                  <CardTitle className="text-sm">Sales trend</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <SalesByDayChart rows={charts.data?.byDay || []} money={money} />
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader className="border-b py-2">
                  <CardTitle className="text-sm">Order status</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <MixDonutChart
                    rows={(charts.data?.byStatus || []).map((row) => ({
                      key: row.status,
                      count: row.count,
                      total: row.total,
                    }))}
                    labelFor={statusLabel}
                    money={money}
                    toneFor={statusTone}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {breakdowns.loading || !scope.ready ? (
            <InsightsBreakdownsSkeleton />
          ) : (
            <section className="grid gap-2 lg:grid-cols-3">
              <Card size="sm">
                <CardHeader className="border-b py-2">
                  <CardTitle className="text-sm">Sales by branch</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <InsightsRankedList
                    empty="No branch sales yet."
                    rows={(breakdowns.data?.byBranch || []).map((row) => ({
                      key: row.businessId || row.name,
                      title: row.name,
                      subtitle: `${row.quantity} items`,
                      amount: money(row.sales),
                    }))}
                  />
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader className="border-b py-2">
                  <CardTitle className="text-sm">Top products</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <InsightsRankedList
                    empty="No product sales yet."
                    rows={(breakdowns.data?.topProducts || []).map((row) => ({
                      key: `${row.name}-${row.sku}`,
                      title: row.name,
                      subtitle: row.sku ? `${row.sku} · ${row.quantity} sold` : `${row.quantity} sold`,
                      amount: money(row.sales),
                    }))}
                  />
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader className="border-b py-2">
                  <CardTitle className="text-sm">Payment status</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <MixDonutChart
                    rows={(breakdowns.data?.byPayment || []).map((row) => ({
                      key: row.paymentStatus,
                      count: row.count,
                      total: row.total,
                    }))}
                    labelFor={paymentLabel}
                    money={money}
                    toneFor={paymentTone}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          <section className="grid gap-2 lg:grid-cols-3">
            <AttentionOrdersPanel
              title="Unpaid open orders"
              icon={Wallet}
              tone="warning"
              empty="No unpaid open orders."
              loading={unpaid.loading}
              data={unpaid.data}
              page={unpaidPage}
              onPageChange={setUnpaidPage}
              money={money}
              link={{ to: MODULE_PATHS.ORDERS, label: "View orders" }}
              subtitleOf={(order) => `${order.customer} · ${statusLabel(order.status)}`}
              onOpen={(order) => navigate(`${MODULE_PATHS.ORDERS}/${order._id}`)}
            />

            <AttentionOrdersPanel
              title="Refund pending"
              icon={Banknote}
              tone="danger"
              empty="No cash or bank refunds waiting."
              loading={refunds.loading}
              data={refunds.data}
              page={refundsPage}
              onPageChange={setRefundsPage}
              money={money}
              link={{ to: MODULE_PATHS.ORDERS, label: "View orders" }}
              subtitleOf={(order) => `${order.customer} · ${paymentLabel(order.paymentStatus)}`}
              onOpen={(order) => navigate(`${MODULE_PATHS.ORDERS}/${order._id}`)}
            />

            <InsightsAttentionPanel
              title="Stock alerts"
              icon={PackageX}
              count={stock.data?.total || 0}
              empty="Stock levels look healthy."
              loading={stock.loading}
              footer={panelFooter(
                { to: MODULE_PATHS.STOCK, label: "View stock" },
                {
                  page: stockPage,
                  totalPages: stock.data?.totalPages || 1,
                  loading: stock.loading,
                  onPageChange: setStockPage,
                }
              )}
            >
              {stockItems.map((row: InsightsAttentionStock) => (
                <AttentionStockRow
                  key={row._id}
                  title={`${row.name}${row.variation ? ` · ${row.variation}` : ""}`}
                  subtitle={row.business}
                  quantity={row.quantity}
                  level={row.level === "out" ? "out" : "low"}
                />
              ))}
            </InsightsAttentionPanel>
          </section>
        </div>
      </PageShell>
    </RequirePermission>
  );
}

function AttentionOrdersPanel({
  title,
  icon,
  tone,
  empty,
  loading,
  data,
  page,
  onPageChange,
  money,
  link,
  subtitleOf,
  onOpen,
}: {
  title: string;
  icon: typeof Wallet;
  tone: "warning" | "danger";
  empty: string;
  loading: boolean;
  data: ListResponse<InsightsAttentionOrder> | null;
  page: number;
  onPageChange: (page: number) => void;
  money: (amount: number) => string;
  link: { to: string; label: string };
  subtitleOf: (order: InsightsAttentionOrder) => string;
  onOpen: (order: InsightsAttentionOrder) => void;
}) {
  const items = data?.items || [];

  return (
    <InsightsAttentionPanel
      title={title}
      icon={icon}
      count={data?.total || 0}
      empty={empty}
      tone={tone}
      loading={loading}
      footer={panelFooter(link, {
        page,
        totalPages: data?.totalPages || 1,
        loading,
        onPageChange,
      })}
    >
      {items.map((order) => (
        <AttentionOrderRow
          key={order._id}
          title={order.orderNumber}
          subtitle={subtitleOf(order)}
          amount={money(order.total)}
          onClick={() => onOpen(order)}
        />
      ))}
    </InsightsAttentionPanel>
  );
}
