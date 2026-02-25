import type { SaleWithItems } from "../services/sales";
import type { FinancialSummary, Transaction } from "../services/transactions";

interface DashboardData {
  totalSales: number;
  totalUnitsSold: number;
  bestSellingProduct: string;
}

interface ReportData {
  companyName: string;
  dateFilterLabel: string;
  summary: FinancialSummary;
  dashboard: DashboardData;
  transactions: Transaction[];
  sales: SaleWithItems[];
}

export function generateReportHTML(data: ReportData): string {
  const {
    companyName,
    dateFilterLabel,
    summary,
    dashboard,
    transactions,
    sales,
  } = data;
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const txRows = transactions
    .map((tx) => {
      const amount = Number(tx.amount) || 0;
      const isIncome = tx.type === "income";
      const color = isIncome ? "#10b981" : "#f87171";
      const sign = isIncome ? "+" : "-";
      return `
        <tr>
          <td>${tx.transaction_date || ""}</td>
          <td>${tx.description || "Sin descripción"}</td>
          <td style="text-align:center">${isIncome ? "Ingreso" : "Gasto"}</td>
          <td style="text-align:right;color:${color};font-weight:700">${sign}$${amount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  const allSalesRows = sales
    .map((sale) => {
      const total = Number(sale.total_amount) || 0;
      const isCancelled = sale.status === "cancelled";
      const items = sale.items
        .map((i) => `${i.product_name} x${i.quantity}`)
        .join(", ");
      const date = new Date(sale.created_at).toLocaleDateString();
      const statusLabel = isCancelled ? "Cancelada" : "Completada";
      const statusColor = isCancelled ? "#f87171" : "#10b981";
      return `
        <tr${isCancelled ? ' style="opacity:0.6"' : ""}>
          <td>${date}</td>
          <td>${sale.customer_name || "Venta en tienda"}</td>
          <td>${items || "—"}</td>
          <td style="text-align:center;color:${statusColor};font-weight:600;font-size:10px">${statusLabel}</td>
          <td style="text-align:right;font-weight:700${isCancelled ? ";text-decoration:line-through;color:#999" : ""}">\$${total.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  const customerStats: Record<
    string,
    { name: string; total: number; count: number }
  > = {};

  sales.forEach((sale) => {
    if (sale.status !== "completed") return;

    const name = sale.customer_name || "Venta en tienda";

    if (!customerStats[name]) {
      customerStats[name] = { name, total: 0, count: 0 };
    }

    customerStats[name].total += Number(sale.total_amount) || 0;
    customerStats[name].count += 1;
  });

  const customerRows = Object.values(customerStats)
    .sort((a, b) => b.total - a.total)
    .map(
      (c) => `
    <tr>
      <td>${c.name}</td>
      <td style="text-align:center">${c.count}</td>
      <td style="text-align:right;font-weight:700">$${c.total.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Arial, sans-serif; color: #1a1a1a; padding: 30px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 28px; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
    .logo { font-size: 28px; font-weight: 900; letter-spacing: 6px; }
    .logo span:nth-child(1) { color: #10b981; }
    .logo span:nth-child(2) { color: #22d3ee; }
    .logo span:nth-child(3) { color: #34d399; }
    .logo span:nth-child(4) { color: #f59e0b; }
    .logo span:nth-child(5) { color: #8b5cf6; }
    .logo span:nth-child(6) { color: #10b981; }
    .company { font-size: 18px; font-weight: 700; margin-top: 8px; }
    .meta { color: #666; font-size: 11px; margin-top: 4px; }

    .section-title {
      font-size: 13px; color: #333; margin: 24px 0 12px;
      text-transform: uppercase; letter-spacing: 2px; font-weight: 800;
      border-bottom: 2px solid #10b981; padding-bottom: 8px;
    }

    .card {
      border: 1px solid #e0e0e0; border-radius: 10px;
      padding: 18px; margin-bottom: 16px; background: #fafffe;
    }
    .card-title {
      font-size: 10px; color: #888; text-transform: uppercase;
      letter-spacing: 2px; margin-bottom: 14px; text-align: center;
    }

    .summary-row {
      display: flex; justify-content: space-around;
    }
    .summary-item { text-align: center; flex: 1; }
    .summary-item + .summary-item { border-left: 1px solid #e0e0e0; }
    .summary-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .summary-value { font-size: 22px; font-weight: 800; margin-top: 4px; }
    .income { color: #10b981; }
    .expense { color: #f87171; }

    .dash-row { display: flex; justify-content: space-around; }
    .dash-item { text-align: center; flex: 1; }
    .dash-item + .dash-item { border-left: 1px solid #e0e0e0; }
    .dash-value { font-size: 24px; font-weight: 800; color: #f59e0b; }
    .dash-best { font-size: 14px; font-weight: 700; color: #f59e0b; }
    .dash-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th { background: #f0fdf4; color: #333; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 8px; text-align: left; border-bottom: 2px solid #10b981; }
    td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) { background: #fafafa; }

    .table-card {
      border: 1px solid #e0e0e0; border-radius: 10px;
      overflow: hidden; margin-bottom: 16px;
    }
    .table-card table { margin-bottom: 0; }

    .count-label {
      font-size: 10px; color: #999; margin-bottom: 8px;
      text-align: right; letter-spacing: 0.5px;
    }

    .footer { text-align: center; color: #999; font-size: 10px; margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; }

    .print-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #10b981; padding: 12px 20px;
      display: flex; justify-content: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-bar button {
      background: #fff; color: #1a1a1a; border: none; border-radius: 8px;
      padding: 10px 24px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .print-bar button:hover { background: #f0fdf4; }
    .print-spacer { height: 56px; }

    @media print {
      .print-bar, .print-spacer { display: none !important; }
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
    <script>document.title='prisma-reporte-${dateStr.split("/").join("-")}';</script>
  </div>
  <div class="print-spacer"></div>
  <div class="header">
    <div class="logo">
      <span>P</span><span>R</span><span>I</span><span>S</span><span>M</span><span>A</span>
    </div>
    <div class="company">${companyName}</div>
    <div class="meta">Reporte Prisma - ${dateFilterLabel} &bull; Generado: ${dateStr}</div>
  </div>

  <!-- RESUMEN FINANCIERO -->
  <div class="section-title">Resumen Financiero</div>
  <div class="card">
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-label">Ingresos</div>
        <div class="summary-value income">\$${summary.totalIncome.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Gastos</div>
        <div class="summary-value expense">\$${summary.totalExpense.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Balance</div>
        <div class="summary-value ${summary.balance >= 0 ? "income" : "expense"}">\$${summary.balance.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- DASHBOARD -->
  <div class="section-title">Dashboard</div>
  <div class="card">
    <div class="dash-row">
      <div class="dash-item">
        <div class="dash-value">${dashboard.totalSales}</div>
        <div class="dash-label">Ventas</div>
      </div>
      <div class="dash-item">
        <div class="dash-value">${dashboard.totalUnitsSold}</div>
        <div class="dash-label">Unidades vendidas</div>
      </div>
      <div class="dash-item">
        <div class="dash-best">${dashboard.bestSellingProduct}</div>
        <div class="dash-label">Más vendido</div>
      </div>
    </div>
  </div>

  <!-- HISTORIAL DE TRANSACCIONES -->
  <div class="section-title">Historial de Transacciones</div>
  <div class="count-label">${transactions.length} transacciones</div>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Descripción</th>
          <th style="text-align:center">Tipo</th>
          <th style="text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${txRows || '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">Sin transacciones</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- HISTORIAL DE VENTAS -->
  <div class="section-title">Historial de Ventas</div>
  <div class="count-label">${sales.length} ventas</div>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Productos</th>
          <th style="text-align:center">Estado</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${allSalesRows || '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Sin ventas</td></tr>'}
      </tbody>
    </table>
  </div>

    <!-- CLIENTES -->
  <div class="section-title">Clientes</div>
  <div class="count-label">${Object.keys(customerStats).length} clientes</div>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th style="text-align:center">Compras</th>
          <th style="text-align:right">Total gastado</th>
        </tr>
      </thead>
      <tbody>
        ${customerRows || '<tr><td colspan="3" style="text-align:center;color:#999;padding:20px">Sin clientes</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Prisma Cactus &bull; Control financiero inteligente &bull; ${dateStr}
  </div>
</body>
</html>`;
}
