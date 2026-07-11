import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, unlinkSync } from "fs";

const SCRIPT_PATH = join(process.cwd(), "scripts", "gen-report-pdf.py");

export interface ReportData {
  title: string;
  repName: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  summary: {
    totalOrders: number;
    totalVisits: number;
    visitedShops: number;
    totalCartons: number;
    totalAmount: number;
    successRate: number;
    remainingCustomers: number;
  };
  orders: {
    date: Date;
    customer: string;
    cartons: number;
    amount: number;
    items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  }[];
  visits: {
    date: Date;
    customer: string;
    result: string;
    objection: string | null;
    notes: string | null;
  }[];
  products: { id: string; name: string; qty: number; amount: number }[];
  areaStats: { id: string; name: string; orders: number; cartons: number }[];
  objections: { reason: string; count: number }[];
}

export class ReportLabHelper {
  static async generateReport(data: ReportData): Promise<Buffer> {
    const payload = {
      title: data.title,
      repName: data.repName,
      periodStart: data.periodStart.toISOString(),
      periodEnd: data.periodEnd.toISOString(),
      generatedAt: data.generatedAt.toISOString(),
      summary: data.summary,
      orders: data.orders.map((o) => ({
        date: o.date.toISOString(),
        customer: o.customer,
        cartons: o.cartons,
        amount: o.amount,
        items: o.items,
      })),
      visits: data.visits.map((v) => ({
        date: v.date.toISOString(),
        customer: v.customer,
        result: v.result,
        objection: v.objection,
        notes: v.notes,
      })),
      products: data.products,
      areaStats: data.areaStats,
      objections: data.objections,
    };

    try {
      const pdfBuffer = execFileSync("python3", [SCRIPT_PATH], {
        input: JSON.stringify(payload),
        maxBuffer: 20 * 1024 * 1024,
        timeout: 30_000,
      });
      return pdfBuffer as unknown as Buffer;
    } catch (e: any) {
      throw new Error(`PDF generation failed: ${e?.message ?? e}`);
    }
  }
}
