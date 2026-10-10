// This bounds the initial provider import, not retention of already saved data.
export const IMPORT_HISTORY_MONTHS=12;
export const IMPORT_HISTORY_LABEL=`Hasta ${IMPORT_HISTORY_MONTHS} meses`;

export function importHistoryStart(now=new Date()) {
  const start=new Date(now);
  const day=start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth()-IMPORT_HISTORY_MONTHS);
  const lastDay=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
  start.setUTCDate(Math.min(day,lastDay));
  return start.toISOString();
}
