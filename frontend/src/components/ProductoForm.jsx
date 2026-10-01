import { useState, useEffect } from "react";

const vacio = { nombre: "", precio: "", stock: "", categoria_id: "" };

export default function ProductoForm({ producto, categorias, onSubmit, onCancel }) {
  const [form, setForm] = useState(vacio);

  useEffect(() => {
    setForm(producto ?? vacio);
  }, [producto]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      nombre: form.nombre,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock, 10),
      categoria_id: parseInt(form.categoria_id, 10),
    });
    setForm(vacio);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="nombre" placeholder="Nombre" value={form.nombre}
             onChange={handleChange} required />
      <input name="precio" type="number" step="0.01" placeholder="Precio"
             value={form.precio} onChange={handleChange} required />
      <input name="stock" type="number" placeholder="Stock"
             value={form.stock} onChange={handleChange} required />
      <select name="categoria_id" value={form.categoria_id}
              onChange={handleChange} required>
        <option value="">Categoría...</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <button type="submit">{producto ? "Guardar cambios" : "Crear"}</button>
      {producto && <button type="button" onClick={onCancel}>Cancelar</button>}
    </form>
  );
}