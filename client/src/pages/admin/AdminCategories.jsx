import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { resolveImageUrl } from "../../api";
import ImagePicker from "../../components/ImagePicker";

export default function AdminCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    api.adminCategories(token).then((d) => setCategories(d.categories));
  }
  useEffect(load, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.adminUpdateCategory(editingId, { name, icon, image }, token);
      } else {
        await api.adminCreateCategory({ name, icon, image }, token);
      }
      setName("");
      setIcon("🛒");
      setImage("");
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setName(c.name);
    setIcon(c.icon);
    setImage(c.image || "");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this category? Its products will also be removed.")) return;
    await api.adminDeleteCategory(id, token);
    load();
  }

  async function toggleActive(c) {
    await api.adminUpdateCategory(c.id, { is_active: c.is_active ? 0 : 1 }, token);
    load();
  }

  async function reorder(id, direction) {
    await api.adminReorderCategory(id, direction, token);
    load();
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Categories</h2>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-row" style={{ flex: 1, marginBottom: 0, minWidth: 180 }}>
          <label>Category Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-row" style={{ width: 90, marginBottom: 0 }}>
          <label>Icon</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <ImagePicker label="Image" value={image} onChange={setImage} />
        <button className="btn btn-primary">{editingId ? "Save" : "+ Add"}</button>
        {editingId && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setEditingId(null);
              setName("");
              setIcon("🛒");
              setImage("");
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Image</th>
            <th>Icon</th>
            <th>Name</th>
            <th>Products</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c, idx) => (
            <tr key={c.id}>
              <td>
                <button className="icon-btn" disabled={idx === 0} onClick={() => reorder(c.id, "up")}>↑</button>
                <button className="icon-btn" disabled={idx === categories.length - 1} onClick={() => reorder(c.id, "down")}>↓</button>
              </td>
              <td>
                <div className="table-thumb">
                  {c.image ? <img src={resolveImageUrl(c.image)} alt="" /> : c.icon}
                </div>
              </td>
              <td style={{ fontSize: 18 }}>{c.icon}</td>
              <td>{c.name}</td>
              <td>{c.product_count}</td>
              <td>
                <button className={`badge ${c.is_active ? "badge-completed" : "badge-cancelled"}`} onClick={() => toggleActive(c)} style={{ border: "none", cursor: "pointer" }}>
                  {c.is_active ? "Active" : "Disabled"}
                </button>
              </td>
              <td>
                <button className="icon-btn" onClick={() => startEdit(c)}>Edit</button>
                <button className="icon-btn danger" onClick={() => handleDelete(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
