/**
 * @file server/routes/export.js
 * @description Export routes: /api/export/excel and /api/export/pdf.
 * Generates downloadable spreadsheets and PDF summaries for Meera's event plan.
 */

import { Router } from 'express';
import { computePlan } from '../../shared/engine/index.js';
import { runStressTest } from '../../shared/engine/stress.js';
import { forecastRsvp } from '../../shared/engine/rsvp.js';
import { validatePlanInputs } from '../util/validate.js';
import { sendError } from '../util/errors.js';
import { logger } from '../util/logger.js';

const router = Router();

/** Format INR without external libraries */
function fmtINR(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * POST /api/export/excel
 * Body: PlanInputs JSON
 * Returns: xlsx file download
 */
router.post('/excel', async (req, res) => {
  try {
    const inputs = /** @type {import('../../shared/engine/index.js').PlanInputs} */ (validatePlanInputs(req.body));
    const plan = computePlan(inputs);
    const stress = runStressTest(inputs, { simulations: 1000 });
    const rsvp = forecastRsvp(inputs.type, inputs.guests);

    // Dynamic import so the module load doesn't fail if exceljs isn't installed
    let ExcelJS;
    try {
      ExcelJS = (await import('exceljs')).default;
    } catch {
      return sendError(res, 503, 'EXPORT_UNAVAILABLE', 'Excel export library not installed');
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Utsav Event Planner';
    wb.created = new Date();

    // ── Sheet 1: Budget Overview ──────────────────────────────────────────────
    const budgetSheet = wb.addWorksheet('Budget Overview');
    budgetSheet.columns = [
      { header: 'Category', key: 'name', width: 28 },
      { header: 'Allocated (INR)', key: 'amount', width: 20 },
      { header: '% of Total', key: 'pct', width: 14 },
    ];
    budgetSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    budgetSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };

    for (const cat of plan.budget.categories) {
      budgetSheet.addRow({ name: cat.name, amount: cat.amount, pct: cat.pct });
    }
    budgetSheet.addRow({ name: 'Contingency Buffer', amount: plan.budget.contingency, pct: plan.budget.contingencyPct });
    budgetSheet.addRow({});
    budgetSheet.addRow({ name: 'TOTAL', amount: plan.budget.totalBudget, pct: 100 });

    const totalRow = budgetSheet.lastRow;
    if (totalRow) totalRow.font = { bold: true };

    // ── Sheet 2: Summary ──────────────────────────────────────────────────────
    const summarySheet = wb.addWorksheet('Event Summary');
    const summaryData = [
      ['Field', 'Value'],
      ['Event Name', inputs.name],
      ['Type', inputs.type],
      ['Date', inputs.date],
      ['Guests Invited', inputs.guests],
      ['Expected Attendance', rsvp.expectedAttendance],
      ['Vibe', inputs.vibe],
      ['Total Budget', fmtINR(plan.budget.totalBudget)],
      ['Per-Head Budget', fmtINR(plan.perGuest)],
      ['Catering Per-Head', fmtINR(plan.feasibility.perHeadActual)],
      ['Feasibility Tier', plan.feasibility.tier],
      ['Days to Event', plan.daysToGo],
      ['Vegetarian Only', inputs.vegOnly ? 'Yes' : 'No'],
    ];
    for (const [field, value] of summaryData) {
      const row = summarySheet.addRow([field, value]);
      if (field === 'Field') {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
      }
    }
    summarySheet.getColumn(1).width = 26;
    summarySheet.getColumn(2).width = 32;

    // ── Sheet 3: Stress Test ──────────────────────────────────────────────────
    const stressSheet = wb.addWorksheet('Stress Test');
    const stressData = [
      ['Metric', 'Value'],
      ['Simulations Run', stress.simulations],
      ['Budget Overrun %', `${stress.overrunPct}%`],
      ['Verdict', stress.verdict],
      ['P50 (Median Cost)', fmtINR(stress.p50)],
      ['P75 Cost', fmtINR(stress.p75)],
      ['P95 Cost', fmtINR(stress.p95)],
      ['Mean Overrun (if over)', fmtINR(stress.meanOverrun)],
      ['Top Risk Categories', stress.topRiskCategories.join(', ')],
    ];
    for (const [field, value] of stressData) {
      const row = stressSheet.addRow([field, value]);
      if (field === 'Metric') {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      }
    }
    stressSheet.getColumn(1).width = 28;
    stressSheet.getColumn(2).width = 24;

    // ── Timeline sheet ────────────────────────────────────────────────────────
    const timelineSheet = wb.addWorksheet('Timeline');
    timelineSheet.columns = [
      { header: 'Task', key: 'task', width: 40 },
      { header: 'Due Date', key: 'date', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    timelineSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    timelineSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
    for (const m of plan.timeline.milestones) {
      timelineSheet.addRow({ task: m.task, date: m.dueDate, status: m.isPast ? 'Past' : 'Upcoming' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="utsav-plan-${inputs.date}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
    logger.info('Excel export served', { name: inputs.name });
  } catch (err) {
    logger.error('Excel export error', { message: err.message });
    sendError(res, 400, 'EXPORT_ERROR', err.message);
  }
});

/**
 * POST /api/export/pdf
 * Body: PlanInputs JSON
 * Returns: PDF file download
 */
router.post('/pdf', async (req, res) => {
  try {
    const inputs = /** @type {import('../../shared/engine/index.js').PlanInputs} */ (validatePlanInputs(req.body));
    const plan = computePlan(inputs);
    const stress = runStressTest(inputs, { simulations: 1000 });
    const rsvp = forecastRsvp(inputs.type, inputs.guests);

    let PDFDocument;
    try {
      PDFDocument = (await import('pdfkit')).default;
    } catch {
      return sendError(res, 503, 'EXPORT_UNAVAILABLE', 'PDF export library not installed');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="utsav-plan-${inputs.date}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Title ─────────────────────────────────────────────────────────────────
    doc.fontSize(22).fillColor('#6B21A8').text('Utsav Event Plan', { align: 'center' });
    doc.fontSize(14).fillColor('#555').text(inputs.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#888').text(`Generated ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown();

    // ── Summary Box ───────────────────────────────────────────────────────────
    doc.fontSize(13).fillColor('#6B21A8').text('Event Summary');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#C4B5FD').stroke();
    doc.moveDown(0.3);

    const summaryLines = [
      `Type: ${inputs.type} | Date: ${inputs.date} | Days to Event: ${plan.daysToGo}`,
      `Guests: ${inputs.guests} invited | Expected: ${rsvp.expectedAttendance} | Vibe: ${inputs.vibe}`,
      `Total Budget: ${fmtINR(plan.budget.totalBudget)} | Per-Head: ${fmtINR(plan.perGuest)}`,
      `Catering Per-Head: ${fmtINR(plan.feasibility.perHeadActual)} | Feasibility: ${plan.feasibility.tier}`,
      `Vegetarian Only: ${inputs.vegOnly ? 'Yes (8% catering savings)' : 'No'}`,
    ];
    doc.fontSize(10).fillColor('#333');
    for (const line of summaryLines) {
      doc.text(line, { lineGap: 3 });
    }
    doc.moveDown();

    // ── Budget Breakdown ──────────────────────────────────────────────────────
    doc.fontSize(13).fillColor('#6B21A8').text('Budget Breakdown');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#C4B5FD').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');

    // Table header
    doc.font('Helvetica-Bold').text('Category', 50, doc.y, { width: 200, continued: true });
    doc.text('Allocated (INR)', 250, doc.y, { width: 150, continued: true });
    doc.text('% Budget', 400, doc.y);
    doc.font('Helvetica');

    for (const cat of plan.budget.categories) {
      const y = doc.y;
      doc.text(cat.name, 50, y, { width: 200, continued: true });
      doc.text(fmtINR(cat.amount), 250, y, { width: 150, continued: true });
      doc.text(`${cat.pct}%`, 400, y);
    }
    // Contingency row
    const cy = doc.y;
    doc.fillColor('#7C3AED');
    doc.text('Contingency Buffer', 50, cy, { width: 200, continued: true });
    doc.text(fmtINR(plan.budget.contingency), 250, cy, { width: 150, continued: true });
    doc.text(`${plan.budget.contingencyPct}%`, 400, cy);
    doc.fillColor('#333');
    doc.moveDown(0.5);

    // ── Stress Test ───────────────────────────────────────────────────────────
    doc.fontSize(13).fillColor('#6B21A8').text('Budget Stress Test (Monte Carlo)');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#C4B5FD').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Verdict: ${stress.verdict} | Overrun Risk: ${stress.overrunPct}%`);
    doc.text(`P50 Median Cost: ${fmtINR(stress.p50)} | P95 Cost: ${fmtINR(stress.p95)}`);
    if (stress.meanOverrun > 0) {
      doc.text(`Mean Overrun (if over budget): ${fmtINR(stress.meanOverrun)}`);
    }
    doc.text(`Top Risk Categories: ${stress.topRiskCategories.join(', ')}`);
    doc.moveDown();

    // ── Timeline ──────────────────────────────────────────────────────────────
    doc.fontSize(13).fillColor('#6B21A8').text('Planning Timeline');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#C4B5FD').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    for (const m of plan.timeline.milestones) {
      const status = m.isPast ? '✓' : '○';
      doc.text(`${status}  ${m.dueDate}  –  ${m.task}`, { lineGap: 3 });
    }
    doc.moveDown();

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor('#aaa').text('Created with Utsav – Thoughtful Indian Event Planning Assistant', { align: 'center' });

    doc.end();
    logger.info('PDF export served', { name: inputs.name });
  } catch (err) {
    logger.error('PDF export error', { message: err.message });
    sendError(res, 400, 'EXPORT_ERROR', err.message);
  }
});

export default router;
