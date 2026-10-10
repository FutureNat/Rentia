# Reclamos, reembolsos y costos históricos

Cada orden conserva hechos de pagos y reclamos en `meli_post_sale_json`. La consulta de pagos verifica vendedor y moneda, deduplica importes por ID de pago y no deduce reembolsos de las acciones disponibles, del importe bruto de venta ni de un reclamo abierto. Importes ausentes o contradictorios quedan desconocidos. Una resolución `payment_refunded` informa el reembolso, pero no inventa su importe.

`Revisar pagos y reclamos` consulta una orden ya guardada de la misma tienda. Sólo propietario y administradores pueden usarla. Usa el mismo lease que la sincronización, un presupuesto acotado y GETs al proveedor. Nunca realiza devoluciones de dinero. Las notificaciones `claims` usan `/post-purchase/v1/claims/{id}`; configurar ese tópico en la aplicación de Mercado Libre para recibir eventos. Los reclamos deben tener vendedor respondiente y vínculo verificable a la orden. Reclamos de pack, envío o pago sin vínculo a la orden no se asignan por suposición.

Errores 403/404 mantienen el estado de reclamos sin confirmar; 206 y respuestas truncadas no eliminan hechos guardados. Las órdenes con costos pendientes, reclamos conocidos o reembolsos se vuelven a consultar por lotes pequeños, con pausa entre revisiones. Esta revisión no reemplaza un scheduler permanente ni promete importar recursos para los que la aplicación no tiene permisos.

Los reembolsos/contracargos se excluyen de ventas cobradas. Sus cargos retenidos, impuestos y estado físico del producto necesitan conciliación: su ganancia no se presenta como cero. Los reembolsos parciales se muestran pendientes de conciliación, no como venta bruta liquidada. Un reclamo abierto conserva el pago, pero excluye esa orden de la ganancia confirmada del canal. No se reintegra stock por suposición.

`Asignar costo de producto` guarda un costo unitario exclusivo de esa línea histórica en `order_item_cost_overrides`. No modifica el catálogo ni Mercado Libre, se conserva al sincronizar y puede restablecerse al costo de catálogo. Cero explícito es un costo conocido. No se asocian variantes históricas con productos por título ni se aplica el costo de una variante diferente automáticamente.

Dashboard e Informes permiten elegir total, Mercado Libre o Tiendanube. Las curvas por canal muestran ventas cobradas y ganancia de órdenes completas antes de Ads. Meta sólo se descuenta del combinado cuando la moneda es comparable; no se atribuye a un canal sin datos. Los costos conocidos y la cobertura se explican junto al informe y en CSV. Los cargos oficiales de facturación siguen separados para evitar descuentos duplicados.

Verificación: `node scripts/test-mercadolibre.cjs`, `node scripts/test-meli-billing.cjs`, `node scripts/test-connection-health.cjs` y TypeScript. Fixtures sintéticos, base SQLite en memoria y migraciones reales. La comprobación de reclamos/reembolsos de Naturae requiere consulta autenticada a Mercado Libre, no sólo estados previamente importados en la base.

Fuentes oficiales: [reclamos](https://developers.mercadolibre.com.ar/es_ar/que-es-un-reclamo), [notificaciones](https://developers.mercadolibre.com.ar/es_ar/productos-recibe-notificaciones), [órdenes](https://developers.mercadolibre.com.ar/es_ar/metricas/gestiona-ventas).
