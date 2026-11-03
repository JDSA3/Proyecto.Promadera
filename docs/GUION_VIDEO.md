# Guion del video (2 partes)

Duración sugerida: 3 minutos por parte. Grabar con la pantalla completa, con la base ya cargada (README, pasos 1 a 5) y los 3 usuarios de demo creados. Tener la bandeja de Gmail abierta en otra pestaña.

## Antes de grabar
- [ ] Código congelado: nadie sube cambios mientras se graba
- [ ] Un pedido de prueba ya hecho no hace falta: se crea en vivo, así se ve el flujo completo
- [ ] El carpintero está registrado con un correo real
- [ ] Hay productos de los dos corralones en el catálogo y alguno con stock bajo
- [ ] Plan B si Mercado Pago falla: "Simular pago" (decirlo en voz alta)

## Parte 1: carpintero (graba Jairo)
1. **Presentación (10 s):** qué es ProMadera: el carpintero diseña, compra a varios corralones en una sola orden y el corralón gestiona su parte.
2. **Diseño:** elegir un mueble, cambiar una medida, mostrar presupuesto y materiales. Guardar el proyecto.
3. **Insumos:** buscar, filtrar por corralón, abrir un tirante y **cortarlo a medida** (cambiar de cm a mm). Agregar al carrito.
4. **Comunidad:** abrir un combo y agregarlo al carrito.
5. **Carrito:** mostrar la división en c1 y c2. Crear el pedido y mostrar el mensaje de pedido confirmado.
6. **Correo:** mostrar "Pedido recibido" en la bandeja.
7. **Pago:** pagar y mostrar el mensaje de pago confirmado. Abrir el correo con el comprobante PDF.
8. **Mis Pedidos:** mostrar el estado por corralón (queda en pendiente: sigue la parte 2).

## Parte 2: corralón (graba Dani; Ariel explica backend y correo)
1. **Inicio** del corralón: ventas del mes, pendientes y stock bajo.
2. **Pedidos:** abrir el pedido en el modal. Confirmar, marcar como enviado y como entregado.
3. **Devolución:** volver un momento al carpintero, reportar un problema sobre la parte entregada y mostrar cómo el corralón ve el motivo.
4. **Stock y Compras:** producto con stock bajo, atajo "Pedir al proveedor", crear la orden de compra y recibirla: el stock sube.
5. **Cierre (20 s, Ariel):** el aviso por correo al corralón, el comprobante propio (no es factura fiscal) y las limitaciones: sin JWT, pago real necesita URL pública.

## Qué decir de las limitaciones (15 s, sin disculparse)
"Es un MVP: validamos rol y dueño en cada acción pero todavía no hay login con token, el comprobante es propio y no una factura de ARCA/AFIP, y el webhook de Mercado Pago está programado pero necesita una URL pública; por eso mostramos Simular pago."

## Edición
- Unir las dos partes con un corte limpio (cualquier editor gratuito).
- Revisar que no se vean contraseñas, la contraseña de aplicación ni el token de Mercado Pago.
