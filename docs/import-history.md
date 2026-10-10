# Historial inicial por canal

Todos los planes, incluida la prueba y Gratis, comparten una importación inicial
de hasta 12 meses calendario para Tiendanube, Mercado Libre y Meta Ads. El corte
común vive en `lib/import-history.ts`; los datos efectivamente disponibles dependen
de la antigüedad de la cuenta, los permisos y la respuesta de cada proveedor.

Esta política no es una caducidad de almacenamiento. No se borran órdenes,
productos, costos ni métricas históricas guardadas. El historial acumulado sigue
creciendo y los rangos personalizados pueden consultarlo. El catálogo de
productos se importa completo: la antigüedad de un producto no determina si
puede tener ventas actuales.

Las importaciones iniciales de Tiendanube que aún tenían ventanas desde 1970
recortan solo sus intervalos pendientes al reanudarse; una ventana recortada
reinicia su página para no omitir registros. Los trabajos completos y sus
actualizaciones incrementales conservan el cursor existente. Los eventos de
órdenes históricas siguen pudiendo actualizar reclamos, reembolsos y costos.

Meta actualiza su ventana de 12 meses sin eliminar métricas anteriores al corte.
Los precios, cupos de equipo y volúmenes de los planes no cambian con este ajuste.
