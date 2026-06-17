import { ExpenseReport } from '../types';

export function generateCSV(report: ExpenseReport): string {
  const headers = ['Data', 'Descrição', 'Categoria', 'Valor (R$)'];
  const rows = report.categorized_items.map(item => [
    new Date(report.createdAt).toLocaleDateString('pt-BR'),
    `"${item.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
    item.category,
    item.amount.toString().replace('.', ',') // Brazilian decimal format
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadCSV(report: ExpenseReport) {
  const csv = generateCSV(report);
  // Add BOM for UTF-8 to ensure Excel/Google Sheets reads accents correctly
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `gastoclaro-${report.monthReference.replace(/\s+/g, '-').toLowerCase()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportSlug(report: ExpenseReport): string {
  return (report.monthReference || 'relatorio').replace(/\s+/g, '-').toLowerCase();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Exportação em Excel (.xls) — usa tabela HTML que o Excel abre nativamente (sem dependências).
export function downloadExcel(report: ExpenseReport) {
  const date = new Date(report.createdAt).toLocaleDateString('pt-BR');
  const rows = report.categorized_items
    .map(
      (item) =>
        `<tr><td>${date}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(
          item.category
        )}</td><td>${item.amount.toFixed(2).replace('.', ',')}</td></tr>`
    )
    .join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
    <table border="1">
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor (R$)</th></tr></thead>
      <tbody>
        ${rows}
        <tr><td colspan="3"><b>Total</b></td><td><b>${report.total_amount
          .toFixed(2)
          .replace('.', ',')}</b></td></tr>
      </tbody>
    </table>
  </body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `gastoclaro-${reportSlug(report)}.xls`);
}

// Exportação em PDF — abre uma janela formatada e dispara a impressão (Salvar como PDF).
export function exportPDF(report: ExpenseReport) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Permita pop-ups para exportar o PDF.');
    return;
  }
  const date = new Date(report.createdAt).toLocaleDateString('pt-BR');
  const itemRows = report.categorized_items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(
          item.category
        )}</td><td style="text-align:right">R$ ${item.amount.toFixed(2).replace('.', ',')}</td></tr>`
    )
    .join('');
  const insights = (report.insights || [])
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join('');
  const recs = (report.recommendations || [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join('');

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>GastoClaro - ${escapeHtml(report.monthReference || '')}</title>
    <style>
      *{font-family:Arial,Helvetica,sans-serif;color:#18181b}
      body{padding:32px;max-width:800px;margin:0 auto}
      h1{font-size:22px;margin:0 0 4px} .sub{color:#71717a;margin:0 0 24px;font-size:13px}
      .kpis{display:flex;gap:16px;margin-bottom:24px}
      .kpi{flex:1;border:1px solid #e4e4e7;border-radius:12px;padding:14px}
      .kpi b{display:block;font-size:10px;text-transform:uppercase;color:#a1a1aa;letter-spacing:1px}
      .kpi span{font-size:20px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}
      th,td{border-bottom:1px solid #e4e4e7;padding:8px;text-align:left}
      th{font-size:11px;text-transform:uppercase;color:#71717a}
      h3{font-size:14px;margin:18px 0 6px}
      ul{margin:0;padding-left:18px;font-size:13px;color:#3f3f46}
      .total{font-weight:bold}
    </style></head><body>
    <h1>GastoClaro — Análise de Gastos</h1>
    <p class="sub">Referente a ${escapeHtml(report.monthReference || '')} · gerado em ${date}</p>
    <div class="kpis">
      <div class="kpi"><b>Total Geral</b><span>R$ ${report.total_amount
        .toFixed(2)
        .replace('.', ',')}</span></div>
      <div class="kpi"><b>Maior Categoria</b><span>${escapeHtml(report.highest_category || '-')}</span></div>
      <div class="kpi"><b>Itens</b><span>${report.categorized_items.length}</span></div>
    </div>
    <table><thead><tr><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${itemRows}</tbody></table>
    ${insights ? `<h3>Insights</h3><ul>${insights}</ul>` : ''}
    ${recs ? `<h3>Recomendações</h3><ul>${recs}</ul>` : ''}
    <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
}

export async function copyToGoogleSheets(report: ExpenseReport): Promise<boolean> {
  const headers = ['Data', 'Descrição', 'Categoria', 'Valor'];
  const rows = report.categorized_items.map(item => [
    new Date(report.createdAt).toLocaleDateString('pt-BR'),
    item.description,
    item.category,
    item.amount.toString().replace('.', ',')
  ]);
  
  // TSV (Tab-Separated Values) format pastes perfectly into Google Sheets
  const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}
