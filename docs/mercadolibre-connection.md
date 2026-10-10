# Mercado Libre: importador implementado, validación real pendiente

OAuth, importador reanudable, consumidor de avisos y renovación cifrada están
implementados. Las pruebas son sintéticas: no prueban los permisos ni las respuestas
de una cuenta real. `MELI_APP_ID` y `MELI_APP_SECRET` están configurados en la
revisión 6 del entorno publicado, verificada por presencia y marca de secreto,
sin exportar sus valores. Falta `RENTIA_CRON_SECRET`. Esta corrección no modifica
secretos, datos de Naturae, conexiones Tiendanube/Meta ni el esquema SQL.

Sin la clave, el panel muestra «En preparación». Al autorizar, la conexión queda
`authorized`; solo pasa a `connected` al terminar el historial y el catálogo.
No se anuncia una integración comercial ni liquidación financiera completa.

## Direcciones para el DevCenter

- Retorno OAuth: `https://rentia-ecommerce.scardullacatalina.chatgpt.site/api/integrations/mercadolibre/callback`
- Avisos: `https://rentia-ecommerce.scardullacatalina.chatgpt.site/api/webhooks/mercadolibre`

Estas direcciones deben coincidir con `RENTIA_PUBLIC_ORIGIN`. No usar la página
de inicio como retorno, parámetros variables ni el ID de otra aplicación.

## Configuración prevista

- Unidad de negocio: Mercado Libre (Argentina en esta primera etapa).
- Authorization Code, Refresh Token y PKCE S256. No necesitamos Client Credentials.
- Acceso de consulta para ventas/envíos, publicaciones y los cargos necesarios.
- Sin mensajería, modificación de publicaciones, promociones ni gestión publicitaria.
- Avisos soportados en esta etapa: `orders_v2`, `items`, `shipments`.
- `MELI_APP_ID` y `MELI_APP_SECRET` son valores del servidor, gestionados como
  configuración/secreto en Sites. Nunca incluir la clave en capturas o chats.
- Reutilizar `TOKEN_ENCRYPTION_KEY`; no rotarla, porque cifra conexiones existentes.

## Seguridad y estado actual

El inicio requiere propietario o administrador. La respuesta requiere el mismo
actor y tienda, una cookie HttpOnly cifrada con vencimiento de diez minutos, PKCE
y un estado de un solo uso consumido atómicamente en D1. Los tokens y su fecha de
expiración quedan cifrados; nunca se entregan al navegador. Un vendedor no puede
asociarse silenciosamente a dos tiendas ni reemplazar otra cuenta conectada.

El retorno lee la cookie del `NextRequest` que ya entrega el servidor, decodificando
exactamente una vez lo que `NextResponse.cookies` codifica. No construye una copia
con `new NextRequest(request)`: Vinext entrega un Proxy de seguimiento que no pasa
la comprobación nativa de Request en Workerd; esa copia producía el error 500.
La prueba aislada con Workerd y el Proxy real reproduce ese fallo anterior y
verifica el retorno nuevo, sin red externa ni cuentas reales.
Leer el encabezado crudo dejaba `%2B`,
`%2F` y `%3D` en el IV/cifrado base64 y rechazaba un intento legítimo. La regresión
se reprodujo con el serializador real de Vinext, no con un mock de cookies.
Los rechazos registran solo categorías fijas; nunca cookies, códigos OAuth,
estados, identificadores, credenciales ni cuerpos de respuesta de Mercado Libre.

Los intentos reales del 6/10/2026 a las 11:09 (Argentina) ya devolvieron 307,
pero terminaron en `connection_failed`. Ese registro anterior no distinguía
intercambio, cifrado o guardado: no permite atribuir el rechazo a permisos o clave.
Ahora se registra la etapa fija y, al fallar `/oauth/token`, solo el estado HTTP
y un código de una lista permitida. No se registra `error_description`, cuerpo,
mensaje de excepción ni un código desconocido. El panel muestra instrucciones
distintas para credenciales, permisos, operador, bloqueo y fallos temporales.
La prueba ampliada con `fetch` nativo de Workerd (sin mock de `globalThis.fetch`)
reprodujo una causa concreta: `redirect:'error'` arroja `TypeError` antes de
transmitir la solicitud. Se sustituyó por `manual` en intercambio, renovación e
importador. Las respuestas 3xx se rechazan sin seguir Location ni enviar
credenciales a otro destino. Las respuestas sintéticas llegan a un servicio
aislado de Miniflare, nunca a la API real. El intento real de las 11:30 del 6/10
ya autorizó la cuenta. La lectura de `sync_status` confirmó cero órdenes guardadas
y `mercadolibre_resource_owner` durante la fase de órdenes; ese código anterior
no distinguía el rechazo de una orden del de su envío.

Se encontró una incompatibilidad verificable con el contrato documentado de
`/shipments/:id/orders`: usa `requested_quantity`, pero Rentia leía `quantity`.
Además, la propiedad se comprobaba mediante una distribución de costos, que puede
ser desconocida aunque existan órdenes del vendedor. Ahora se comprueba por las
órdenes asociadas y su `seller_id`, independientemente del costo. Se acepta el campo
actual y el antiguo solo cuando falta el actual; cantidades ambiguas quedan NULL.
Una orden comprobada como propia se guarda aun si su envío no se puede verificar,
sin copiar estado ni cargo de un envío ajeno. Los avisos de envíos/órdenes ajenos
se siguen descartando. Las pausas registran solo categoría y fase fijas, no datos
de clientes ni respuestas. Falta confirmar la reanudación real con esta corrección.

El receptor valida tamaño, aplicación, tópico y recursos permitidos, y guarda
solo metadatos en la cola durable. Las notificaciones no autentican su origen:
son avisos no confiables, no datos de ventas. Después del ACK, `after()` usa el
`waitUntil` del Worker existente para procesar un lote. El consumidor consulta
únicamente rutas permitidas con el token del vendedor y comprueba propiedad.
Avisos repetidos se deduplican; un envío genera trabajo durable por orden.

## Importación y recuperación

- `sync_jobs` conserva ventanas de fechas, IDs pendientes, cursor y pausas.
  Lotes de hasta 18 segundos/20 unidades no limitan el historial total. Ventanas
  con más de 900 resultados se subdividen antes de usar offsets profundos.
  Si no se puede subdividir, se informa el problema: no se omiten ventas.
- Productos usan `search_type=scan`. Cada página se guarda antes de procesar.
  Un cursor vencido o una petición cuyo resultado se perdió reinicia el scan;
  los upserts permiten repetir páginas sin duplicación.
- El panel continúa lotes mientras está visible, incluso al cambiar de sección.
  Los conteos son registros únicos guardados, no páginas/intentos.
- El 6/10 a las 15:10 (Argentina) un POST se canceló tras 3,7 segundos, dejando
  una orden guardada y una lease de diez minutos. El panel repetía POSTs cada
  cinco segundos durante ese bloqueo y alternaba los textos del botón sin avance.
  Ahora el mismo lote se registra inmediatamente con `after(promise)`/`waitUntil`,
  de modo que recargar o cerrar la pestaña no abandone la solicitud ya iniciada.
  La lease del importador es de 60 segundos y se renueva con cada checkpoint;
  las de tokens y otros proveedores no cambian. No se fuerza la liberación de
  una lease activa. GET expone solo vencimiento/último checkpoint, nunca su token.
  El panel consulta el estado, espera bloqueos/backoff y no dispara POSTs mientras
  otro lote conserva la lease. El botón mantiene «Importando…» durante la tarea
  lógica completa, con ancho fijo. Un bloqueo antiguo se informa como espera,
  no como avance; los errores que requieren revisión no se ocultan con un spinner.
  Las regresiones verifican recuperación, exclusión de escritores obsoletos,
  etiquetas estables y permisos. La finalización del historial real sigue pendiente.
- Una lease por tienda y transacciones por orden impiden líneas parciales y
  escrituras tardías. Versiones antiguas no sustituyen órdenes más nuevas.
- Se conserva trabajo fallido con backoff y Retry-After. Los costos antiguos
  pendientes se consultan por lotes, con pausa de un día entre comprobaciones.
- Renovación bajo una lease independiente: la nueva pareja se cifra y guarda
  mediante compare-and-swap. Ante timeout ambiguo se exige reautorizar; no se
  reenvía ciegamente un refresh token posiblemente consumido.

## Alcance y límites financieros

- Mercado Libre documenta búsquedas de órdenes creadas hasta **12 meses**.
  Rentia conserva lo importado, pero no promete recuperar historia anterior
  que la API no exponga.
- Órdenes, publicaciones y variantes quedan separadas por tienda y `provider`.
  No se copian costos de otro canal/tienda solo por coincidir un SKU.
- `sale_fee` es por unidad: se multiplica por cantidad; no se suma de nuevo
  `marketplace_fee`. La etiqueta es «tarifa de venta informada», no liquidación.
- Envío: `senders[].cost` es el cargo del vendedor, no lo cobrado al comprador.
  Se distribuye por cantidades entre sus órdenes del envío, con centavos y resto
  determinista. Sin una distribución verificable queda NULL, nunca cero inventado.
- El costo de compra de producto no está disponible/verificado en esta integración:
  se configura por SKU. Las actualizaciones conservan costos manuales.
- Comisiones/envíos faltantes dejan incompleta la calidad de datos, aun con un
  promedio de Tiendanube configurado. No se aplica Pago Nube al canal Mercado Libre.
- Reembolsos parciales/contracargos no se muestran como venta originalmente cobrada.
  Cancelaciones se actualizan sin duplicar. La conciliación financiera completa de
  devoluciones, cargos posteriores, retenciones, cuotas y promociones contra Billing/
  Mercado Pago **no está implementada** y requiere desarrollo y validación adicional.

## Actualización cuando nadie tiene el panel abierto

El dashboard ya no muestra una franja de éxito exclusiva de Tiendanube. El
indicador inferior reúne Tiendanube, Mercado Libre y Meta, abre Integraciones y
solo marca «Datos al día» con actividad o trabajo terminado reciente en **cada**
conexión. Estados desconocidos/atrasados no se presentan como éxito. Arriba solo
se muestran importaciones iniciales, pausas y problemas que requieren atención;
la consulta normal entre lotes no cambia la etiqueta de importación.

Las fechas de actualización y las acciones manuales quedan en Integraciones.
«Conectada» no equivale a un programador desatendido activo. Meta mantiene su
actualización con el panel abierto; todavía no está incluida en el endpoint de
conciliación desatendida. Esta limpieza visual no activa ni promete ejecución
periódica con el navegador cerrado. Regresión: `node scripts/test-connection-health.cjs`.

Los avisos recibidos disparan trabajo de fondo; no sustituyen un scheduler durable
para recuperar entregas perdidas, Workers interrumpidos o importaciones grandes.
Se incorporó Mercado Libre a `POST /api/cron/reconcile`, protegido con
`Authorization: Bearer RENTIA_CRON_SECRET`. Ese secreto no está configurado y no hay
scheduler vinculado en Sites. **La conciliación periódica desatendida no está activa.**

Antes de crear una automatización, completar y verificar un mecanismo de acceso
de servicio soportado y escritura/readback sin sesión de navegador. No incluir
secretos en prompts. Reutilizar el endpoint y la misma tienda, no republicaciones.

## Antes de habilitar comercialmente

1. Secret Key configurada por el usuario en el entorno seguro de Sites y publicada
   en revisión 6. No volver a exportarla por un mecanismo bloqueado.
2. Autorizar un vendedor de prueba; verificar identidad, permisos, rechazo OAuth,
   renovación y reautorización.
3. Comparar operaciones reales, variantes, envíos agrupados, importes y cancelaciones.
   Las cuotas/retenciones/devoluciones requieren la conciliación adicional indicada.
4. Comprobar un aviso real, su ACK rápido, propiedad y actualización; recuperar
   interrupciones/429 y finalizar un historial grande.
5. Configurar y verificar recuperación desatendida antes de prometerla.

Pruebas locales: `node scripts/test-mercadolibre.cjs`,
`node scripts/test-mercadolibre-oauth.cjs` y `node scripts/test-mercadolibre-worker.mjs`.
`node scripts/test-mercadolibre-lifetime.mjs` verifica `after(promise)` con
Workerd/Vinext reales: respuesta desacoplada, un solo lote y liberación final.
SQLite en memoria, migraciones reales,
1.205 órdenes de un día y 1.002 publicaciones sintéticas. Cubren reanudación, leases,
propiedad, tokens, backoff, versiones, manuales y calidad de costos. No son un
benchmark de capacidad de producción. No usan datos/cuentas de Naturae ni red real.

Métricas por canal y devoluciones:
- Las métricas se agrupan por `orders.provider`, sin mezclar Mercado Libre con
  Tiendanube. Los canales conectados sin ventas muestran cero. La ganancia por
  canal no atribuye automáticamente Meta Ads y queda pendiente si faltan costos.
- Reembolsos detectados: siguen excluidos de ventas cobradas; en Órdenes se muestran
  como resultado en revisión, no ganancia cero. Falta conciliar reembolsos parciales,
  cargos retenidos, logística inversa y el estado recuperable del producto. Este
  cambio no implementa esa conciliación ni inicia devoluciones de dinero.

Referencias oficiales:
- https://developers.mercadolibre.com.ar/autenticacion-y-autorizacion
- https://developers.mercadolibre.com.ar/es_ar/descripcion-de-articulos/seguridad-apps
- https://developers.mercadolibre.com.ar/es_ar/servicio-recibe-notificaciones/productos-recibe-notificaciones
- https://developers.mercadolibre.com.ar/es_ar/trabajar-con-imagenes/gestiona-ventas
- https://developers.mercadolibre.com.ar/es_ar/guia-para-carrito-de-compras/items-y-busquedas
- https://developers.mercadolibre.com.ar/es_ar/envios
- https://developers.mercadolibre.com.ar/es_ar/mercadoenvios-modo-1/provisiones
