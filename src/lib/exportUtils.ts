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
