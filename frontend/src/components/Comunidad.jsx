import { useEffect, useState } from "react";
import { borrarCombo, crearCombo, obtenerCombos, obtenerProductos } from "../api.js";
import "./Carrito.css";
import "./Comunidad.css";

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

const PESTANAS = [
  { id: "todos", texto: "Todos" },
  { id: "promadera", texto: "De ProMadera" },
  { id: "comunidad", texto: "De la comunidad" },
  { id: "mios", texto: "Mis combos" },
];

// Achica la foto en el navegador para que entre en la base (máx. ~600 KB como texto).
function reducirImagen(archivo, maxLado = 900) {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith("image/")) {
      reject(new Error("El archivo tiene que ser una imagen."));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const calidad of [0.82, 0.7, 0.55, 0.4]) {
        const data = canvas.toDataURL("image/jpeg", calidad);
        if (data.length <= 600000) {
          resolve(data);
          return;
        }
      }
      reject(new Error("La foto es demasiado pesada. Probá con una más chica."));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function Portada({ combo }) {
  if (combo.imagen) {
    return <img className="co-portada" src={combo.imagen} alt={`Portada de ${combo.titulo}`} />;
  }
  return (
    <div className="co-portada co-portada-vacia" aria-hidden="true">
      {combo.titulo.charAt(0).toUpperCase()}
    </div>
  );
}

function DetalleCombo({ combo, usuario, carrito, onCerrar, onIrAlCarrito, onBorrado }) {
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(false);
  const esMio = combo.autor_id === usuario.id;

  function agregarAlCarrito() {
    const conStock = combo.items.filter((i) => i.stock > 0);
    conStock.forEach((i) =>
      carrito.agregar(
        {
          id: i.producto_id,
          nombre: i.nombre,
          precio: i.precio,
          stock: i.stock,
          proveedor_id: i.proveedor_id,
          proveedor_nombre: i.proveedor_nombre,
        },
        i.cantidad
      )
    );
    const incompletos = combo.items.filter((i) => !i.disponible).length;
    setAviso(
      incompletos === 0
        ? `Se agregaron los ${conStock.length} productos del combo al carrito.`
        : `Se agregó lo que hay en stock. ${incompletos} producto(s) no alcanzan para el combo completo.`
    );
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar tu combo "${combo.titulo}"?`)) return;
    setBorrando(true);
    setError("");
    try {
      await borrarCombo({ id: combo.id, usuarioId: usuario.id });
      onBorrado();
    } catch (e) {
      setError(limpiar(e.message));
      setBorrando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-contenido co-modal" role="dialog" aria-modal="true" aria-label={combo.titulo} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        <Portada combo={combo} />
        <div className="co-detalle-cabecera">
          <h2>{combo.titulo}</h2>
          <span className={combo.oficial ? "co-insignia" : "co-insignia co-insignia-autor"}>
            {combo.oficial ? "ProMadera" : `Por ${combo.autor_nombre}`}
          </span>
        </div>
        {combo.descripcion && <p className="cr-sub">{combo.descripcion}</p>}

        <div className="cr-tabla-wrap">
          <table className="cr-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Corralón</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {combo.items.map((i) => (
                <tr key={i.producto_id}>
                  <td>
                    {i.nombre}
                    {!i.disponible && <span className="co-sin-stock"> · {i.stock > 0 ? "stock justo" : "sin stock"}</span>}
                  </td>
                  <td>{i.proveedor_nombre || "—"}</td>
                  <td>{i.cantidad}</td>
                  <td>{dinero(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {aviso && (
          <p className="mensaje-exito" role="status">
            {aviso}
          </p>
        )}
        {error && (
          <p className="error-campo" role="alert">
            {error}
          </p>
        )}

        <div className="carrito-resumen">
          <span className="carrito-total">Total: {dinero(combo.total)}</span>
          <div className="carrito-acciones">
            {esMio && (
              <button type="button" className="co-btn-peligro" disabled={borrando} onClick={borrar}>
                Borrar combo
              </button>
            )}
            {aviso && (
              <button type="button" className="btn-secundario" onClick={onIrAlCarrito}>
                Ir al carrito
              </button>
            )}
            <button type="button" className="btn-tan" onClick={agregarAlCarrito}>
              Agregar combo al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArmarCombo({ usuario, onCerrar, onCreado }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [items, setItems] = useState([]); // { producto, cantidad }
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Busca productos 300 ms después de dejar de escribir
  useEffect(() => {
    const texto = busqueda.trim();
    if (texto.length < 2) {
      setResultados([]);
      return undefined;
    }
    let cancelado = false;
    const espera = setTimeout(() => {
      obtenerProductos({ query: texto })
        .then((datos) => {
          if (!cancelado) setResultados(datos.filter((p) => p.activo).slice(0, 8));
        })
        .catch(() => {
          if (!cancelado) setResultados([]);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [busqueda]);

  function agregarProducto(producto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: Math.min(i.cantidad + 1, 999) } : i));
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id, valor) {
    const n = Math.max(1, Math.min(999, Number(valor) || 1));
    setItems((prev) => prev.map((i) => (i.producto.id === id ? { ...i, cantidad: n } : i)));
  }

  const quitar = (id) => setItems((prev) => prev.filter((i) => i.producto.id !== id));

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError("");
    try {
      setImagen(await reducirImagen(archivo));
    } catch (err) {
      setImagen(null);
      setError(err.message);
    }
  }

  const total = items.reduce((suma, i) => suma + i.producto.precio * i.cantidad, 0);
  const puedePublicar = titulo.trim().length >= 2 && items.length > 0 && !enviando;

  async function publicar() {
    setEnviando(true);
    setError("");
    try {
      const combo = await crearCombo({
        autorId: usuario.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagen,
        items: items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
      });
      onCreado(combo);
    } catch (err) {
      setError(limpiar(err.message));
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-contenido co-modal" role="dialog" aria-modal="true" aria-label="Armar un combo" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
        <h2>Armar un combo</h2>
        <p className="cr-sub">Elegí los productos, poné una foto del mueble y compartilo con la comunidad.</p>

        <div className="co-form">
          <label className="co-campo">
            Título
            <input type="text" value={titulo} maxLength={100} placeholder="Ej.: Mesa de luz de pino" onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <label className="co-campo">
            Descripción
            <textarea value={descripcion} maxLength={500} placeholder="Contá para qué sirve y qué tiene de especial" onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <div className="co-campo">
            Foto de portada (del mueble)
            <input type="file" accept="image/*" onChange={elegirFoto} aria-label="Foto de portada" />
            {imagen && (
              <div className="co-foto-previa">
                <img src={imagen} alt="Vista previa de la portada" />
                <button type="button" className="btn-secundario" onClick={() => setImagen(null)}>
                  Quitar foto
                </button>
              </div>
            )}
          </div>

          <div className="co-campo">
            Productos del combo
            <input type="search" value={busqueda} placeholder="Buscá un producto para agregar..." onChange={(e) => setBusqueda(e.target.value)} />
            {resultados.length > 0 && (
              <ul className="co-resultados">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.nombre} <small>{dinero(p.precio)}</small>
                    </span>
                    <button type="button" className="btn-secundario" onClick={() => agregarProducto(p)}>
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length === 0 ? (
            <p className="mensaje">Todavía no agregaste productos.</p>
          ) : (
            <div className="cr-tabla-wrap">
              <table className="cr-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.producto.id}>
                      <td>{i.producto.nombre}</td>
                      <td>
                        <input
                          className="co-cantidad"
                          type="number"
                          min="1"
                          max="999"
                          value={i.cantidad}
                          aria-label={`Cantidad de ${i.producto.nombre}`}
                          onChange={(e) => cambiarCantidad(i.producto.id, e.target.value)}
                        />
                      </td>
                      <td>{dinero(i.producto.precio * i.cantidad)}</td>
                      <td>
                        <button type="button" className="cr-btn-icono peligro" aria-label={`Quitar ${i.producto.nombre}`} onClick={() => quitar(i.producto.id)}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <p className="error-campo" role="alert">
            {error}
          </p>
        )}

        <div className="carrito-resumen">
          <span className="carrito-total">Total: {dinero(total)}</span>
          <div className="carrito-acciones">
            <button type="button" className="btn-secundario" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="button" className="btn-tan" disabled={!puedePublicar} onClick={publicar}>
              {enviando ? "Publicando..." : "Publicar combo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Comunidad({ usuario, carrito, onIrAlCarrito }) {
  const [combos, setCombos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [pestana, setPestana] = useState("todos");
  const [detalle, setDetalle] = useState(null);
  const [armando, setArmando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let cancelado = false;
    obtenerCombos()
      .then((datos) => {
        if (cancelado) return;
        setCombos(datos);
        setError(false);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [recarga]);

  const visibles = (combos ?? []).filter((c) => {
    if (pestana === "promadera") return c.oficial;
    if (pestana === "comunidad") return !c.oficial;
    if (pestana === "mios") return c.autor_id === usuario.id;
    return true;
  });

  function cuerpo() {
    if (error) {
      return <p className="mensaje">No se pudieron cargar los combos. Verificá que la API esté encendida.</p>;
    }
    if (combos === null) return <div className="cr-esqueleto" />;
    if (visibles.length === 0) {
      return (
        <p className="mensaje">
          {pestana === "mios" ? "Todavía no armaste combos. Tocá \"Armar un combo\" para crear el primero." : "No hay combos para mostrar."}
        </p>
      );
    }
    return (
      <div className="co-grilla">
        {visibles.map((c) => (
          <article className="co-card" key={c.id}>
            <button type="button" className="co-card-boton" onClick={() => setDetalle(c)} aria-label={`Ver el combo ${c.titulo}`}>
              <Portada combo={c} />
              <div className="co-card-cuerpo">
                <span className={c.oficial ? "co-insignia" : "co-insignia co-insignia-autor"}>
                  {c.oficial ? "ProMadera" : `Por ${c.autor_nombre}`}
                </span>
                <h3>{c.titulo}</h3>
                <p className="co-card-datos">
                  {c.items.length} {c.items.length === 1 ? "producto" : "productos"} · <strong>{dinero(c.total)}</strong>
                </p>
                {!c.disponible && <p className="co-sin-stock">Algunos productos con poco stock</p>}
              </div>
            </button>
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="cr-pagina co-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Comunidad de diseño</h2>
          <p className="cr-sub">Combos de productos listos para comprar, de ProMadera y de otros carpinteros.</p>
        </div>
        <button type="button" className="btn-tan" onClick={() => setArmando(true)}>
          + Armar un combo
        </button>
      </div>

      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}

      <div className="cr-pills">
        {PESTANAS.map((p) => (
          <button key={p.id} type="button" className={p.id === pestana ? "cr-pill activo" : "cr-pill"} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      {cuerpo()}

      {detalle && (
        <DetalleCombo
          combo={detalle}
          usuario={usuario}
          carrito={carrito}
          onCerrar={() => setDetalle(null)}
          onIrAlCarrito={onIrAlCarrito}
          onBorrado={() => {
            setDetalle(null);
            setAviso("Tu combo fue borrado.");
            setRecarga((n) => n + 1);
          }}
        />
      )}

      {armando && (
        <ArmarCombo
          usuario={usuario}
          onCerrar={() => setArmando(false)}
          onCreado={(combo) => {
            setArmando(false);
            setPestana("mios");
            setAviso(`¡Listo! Tu combo "${combo.titulo}" ya está publicado.`);
            setRecarga((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
