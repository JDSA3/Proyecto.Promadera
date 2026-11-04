# Checklist de pruebas (QA)

Marcar cada punto con `[x]` cuando se probó y funciona. Si algo falla, anotar al lado qué pasó. Probar con la API y la base reales, no con datos inventados.

Usuarios: `carpintero@promadera.com`, `corralon.pino@promadera.com`, `corralon.cedro@promadera.com`.

## Cuenta
- [ ] Registrar un carpintero y un corralón; el email repetido muestra un error claro
- [ ] Login con contraseña incorrecta muestra un error
- [ ] Cada rol ve su propio menú (carpintero y corralón)
- [ ] "Recordarme" mantiene la sesión al recargar; cerrar sesión la termina

## Catálogo (carpintero)
- [ ] El buscador, el filtro por categoría y el filtro por corralón funcionan juntos
- [ ] Cada producto muestra el corralón que lo vende
- [ ] El detalle muestra medidas, stock y "Productos que combinan"
- [ ] Un producto sin stock no se puede agregar al carrito
- [ ] Favoritos: agregar, quitar y ver la lista

## Diseño y proyectos
- [ ] Cambiar una medida actualiza materiales y presupuesto
- [ ] "Agregar materiales al carrito" suma los productos y avisa
- [ ] Guardar un proyecto y abrirlo desde Mis Proyectos con las mismas medidas
- [ ] Filtrar proyectos por ambiente y eliminar uno

## Comunidad
- [ ] Aparecen los 6 combos de ProMadera
- [ ] El detalle muestra productos, corralón, total y aviso de stock justo
- [ ] "Agregar combo al carrito" suma los productos
- [ ] Armar un combo con foto, publicarlo y verlo en Mis combos
- [ ] Borrar un combo propio; los de ProMadera no tienen botón de borrar

## Carrito y pedido
- [ ] Productos de dos corralones se muestran separados en c1 y c2
- [ ] Cambiar la cantidad respeta el stock; quitar un producto actualiza el total
- [ ] Crear el pedido muestra "Pedido confirmado" y queda pendiente
- [ ] "Pagar más tarde" lleva a Mis Pedidos con el pedido pendiente
- [ ] "Simular pago" pasa a pagado y muestra "Pago confirmado"
- [ ] "Pagar con Mercado Pago" abre el checkout de prueba
- [ ] Cancelar un pedido pendiente devuelve el stock
- [ ] Pedir más de lo que hay en stock da un error claro y no crea nada

## Pedidos del corralón
- [ ] Cada corralón ve solo los pedidos con sus productos y su parte del total
- [ ] Confirmar solo se puede con el pedido pagado
- [ ] El estado avanza: confirmado, enviado, entregado
- [ ] El carpintero ve el estado de cada corralón en Mis Pedidos
- [ ] "Reportar problema" solo aparece con la parte entregada y exige un motivo
- [ ] El corralón ve la devolución con su motivo

## Stock y productos del corralón
- [ ] Mis Productos: crear, editar y dar de baja un producto
- [ ] Stock: editar una fila y ver el estado (ok, bajo, agotado) actualizado
- [ ] Los productos de un corralón no aparecen en el panel del otro

## Compras del corralón
- [ ] Crear, editar y borrar un proveedor de insumos
- [ ] Crear una orden de compra: queda pendiente y el stock no cambia
- [ ] Recibir la orden suma el stock
- [ ] No se puede recibir dos veces la misma orden

## Corte a medida (slider de Insumos)
- [ ] El slider cambia entre metros, cm y mm y recalcula el precio solo
- [ ] El precio del corte es proporcional al largo de la pieza
- [ ] El carrito y el pedido muestran el largo del corte
- [ ] El stock baja en piezas enteras

## Correos y comprobante
- [x] Al crear un pedido llega "Pedido recibido" al correo del carpintero (revisar también spam)
- [x] Al pagar (Simular pago o Mercado Pago) llega "Pago confirmado" con el comprobante PDF adjunto
- [x] El PDF muestra número 0001-000000NN, fecha, cliente, ítems por corralón (con el largo si es un corte) y total
- [x] Cada corralón del pedido recibe el aviso "pedido pagado para preparar"
- [ ] Con GMAIL_USER vacío en el .env, el pedido y el pago funcionan igual (solo no sale el correo)
- [x] `GET /pedidos/{id}/comprobante?usuario_id=` devuelve 409 con el pedido pendiente y 403 con un usuario ajeno

## Paginación de productos
- [x] `GET /productos?limit=12&offset=0` devuelve 12 y el header `X-Total-Count` trae el total
- [x] Sin `limit` la lista sale completa (Stock y Compras siguen funcionando)

## General
- [ ] Con la API apagada, cada pantalla muestra un mensaje y no se rompe
- [ ] Todas las pantallas se ven bien en el celular (390 px de ancho)
- [ ] No hay errores en la consola del navegador durante el recorrido completo
- [ ] El guion de demo del README sale completo sin tocar la base a mano
