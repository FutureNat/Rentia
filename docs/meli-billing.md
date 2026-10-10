# Mercado Libre: detalle de cargos

La sección `Cargos de Mercado Libre` consulta el detalle oficial de facturación por mes, separando ML y MP. Conserva cada descripción y código original, importe, moneda, documento, estado y referencias a órdenes/operaciones. No conserva nombres ni datos fiscales de compradores.

## Importación

- Dos páginas de hasta 50 conceptos por petición, secuenciales, con `from_id=last_id`, orden ID ascendente. Nunca se usa un límite de órdenes o de códigos como límite de historial.
- Una página corta no termina el reporte: hay que llegar a una página vacía para BILL y otra para CREDIT_NOTE.
- Una clave de concepto por tienda, vendedor, grupo y período evita duplicados entre páginas/documentos. Los importes se guardan en centavos.
- La generación visible durante un nuevo recorrido se marca parcial. Los totales excluyen conceptos no vistos en esa generación; las filas anteriores se conservan en la base para recuperación, sin borrado del historial guardado.
- Lease de D1 y guardas de vendedor/conexión protegen las escrituras. El cursor se guarda después de persistir el lote. Si se interrumpe antes de guardar el cursor, repetir la página es idempotente.
- 206 o errores del cuerpo no avanzan el cursor. 429 respeta la pausa. 403 no se interpreta como cargos $0; se pausa 12 horas y muestra falta de acceso.
- Caché de 12 horas para reportes completos. Actualización manual con mínimo de 5 minutos. La sección retoma mientras está visible; `after` conserva el lote ya iniciado al navegar. No se afirma que exista un scheduler de facturación permanente.

## Interpretación financiera

CHARGE suma cargos; BONUS suma bonificaciones. El estado BONIFICADO del cargo original no cambia su signo: la bonificación es un movimiento separado. Tipos futuros/desconocidos siguen visibles y quedan fuera del neto conocido. No se mezclan monedas. Los filtros de búsqueda no cambian los totales del período.

El neto de conceptos no equivale a ganancia, saldo bancario ni saldo a pagar. Esta vista no modifica el motor de rentabilidad ni descuenta de nuevo la tarifa de venta/envío importada en una orden. Las percepciones/retenciones fiscales y reembolsos de ventas necesitan conciliación independiente. La categoría por nombre es sólo orientativa.

Las consultas son del período de facturación, no necesariamente del mes de la venta. Un concepto puede afectar varias órdenes o ninguna. Las fechas del selector global de ventas no filtran este reporte; usa su selector propio.

## Fuentes oficiales

- https://developers.mercadolibre.com.ar/es_ar/descripcion-de-articulos/provisiones
- https://developers.mercadolibre.com.ar/en_us/tools/best-practices-for-consuming-billing-reports-apis

Verificación offline: `node scripts/test-meli-billing.cjs`. La validación con la cuenta real requiere una sesión autorizada de Rentia y que Mercado Libre habilite acceso a los reportes de facturación para la aplicación.
