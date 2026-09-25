import { TOPICS } from './types.ts';
import type { RequestRecord, Topic } from './types.ts';

export interface Summary { total: number; handoffs: number; topics: Record<Topic, number> }
export function summarize(records: readonly RequestRecord[]): Summary {
  const topics: Record<Topic, number> = {
    'urun-sorusu': 0, fiyat: 0, 'siparis-durumu': 0, 'iade-sikayet': 0, 'istenmeyen-etki': 0, diger: 0,
  };
  for (const record of records) topics[record.konu]++;
  return { total: records.length, handoffs: records.filter(record => record.devret).length, topics };
}

export function escapeHtml(value: string | number): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, char => entities[char] ?? char);
}

export function renderHtml(records: readonly RequestRecord[]): string {
  const summary = summarize(records);
  const cards = TOPICS.map(topic => `<li><span>${escapeHtml(topic)}</span><strong>${escapeHtml(summary.topics[topic])}</strong></li>`).join('\n');
  const rows = records.map(record => `<tr><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.konu)}</td><td>${escapeHtml(record.devret ? 'Evet' : 'Hayır')}</td><td><p>${escapeHtml(record.cevap_taslagi || 'Yanıt önerilmiyor.')}</p><small>${escapeHtml(record.not)}</small></td></tr>`).join('\n');
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Müşteri talepleri özeti</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f5;color:#18382e;font:15px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:36px 24px}h1{margin:4px 0 12px;font-size:30px}header>p{margin:0;color:#51685f}.metrics{display:flex;gap:24px;margin:22px 0}.metrics strong{font-size:28px}ul{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;list-style:none;padding:0}li{background:#e4ede8;border:1px solid #c9dbd1;border-radius:8px;padding:12px}li span{display:block;font-size:13px}li strong{font-size:24px}table{width:100%;border-collapse:collapse;background:white}caption{text-align:left;font-size:20px;font-weight:600;padding:16px 0}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #d6e1da}th{background:#18382e;color:white}td p{margin:0 0 6px}small{color:#52655d}footer{margin-top:20px;color:#52655d}.table-wrap{overflow:auto}td:last-child{min-width:300px}td{overflow-wrap:anywhere}@media(max-width:800px){ul{grid-template-columns:repeat(2,1fr)}main{padding:20px 12px}}@media print{body{background:white}main{padding:0}tr{break-inside:avoid}th{color:#18382e;background:white}}
</style></head><body><main>
<header><p>BÖLÜM A · TEMSİLCİ ÇALIŞMA LİSTESİ</p><h1>Müşteri talepleri</h1><p>Kural tabanlı değerlendirme · Taslaklar otomatik gönderilmez.</p></header>
<div class="metrics"><div>Toplam mesaj <strong>${escapeHtml(summary.total)}</strong></div><div>Temsilciye devir <strong>${escapeHtml(summary.handoffs)}</strong></div></div>
<ul aria-label="Konu sayıları">${cards}</ul>
<div class="table-wrap"><table><caption>Talep listesi</caption><thead><tr><th scope="col">ID</th><th scope="col">Konu</th><th scope="col">Devret</th><th scope="col">Cevap taslağı / not</th></tr></thead><tbody>${rows}</tbody></table></div>
<footer>Yalnızca güvenlik kontrolünden geçmiş çıktı alanları gösterilir. Test API’si kargo durumu sağlamaz.</footer>
</main></body></html>\n`;
}
