import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { resolveImageUrl } from "../../api";

const emptyForm = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  unit: "each",
  image: "",
  stock: 0,
  is_featured: false,
  sku: "",
  barcode: "",
  is_active: true,
  low_stock_threshold: 5,
};

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    api.adminProducts(token).then((d) => setProducts(d.products));
    api.getCategories().then((d) => setCategories(d.categories));
  }

  useEffect(load, [token]);

  const filteredProducts = products.filter((p) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    return (
      String(p.name || "").toLowerCase().includes(search) ||
      String(p.sku || "").toLowerCase().includes(search) ||
      String(p.barcode || "").toLowerCase().includes(search) ||
      String(p.category_name || "").toLowerCase().includes(search)
    );
  });

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(p) {
    setForm({
      category_id: p.category_id,
      name: p.name,
      description: p.description,
      price: p.price,
      compare_at_price: p.compare_at_price || "",
      unit: p.unit,
      image: p.image,
      stock: p.stock,
      is_featured: !!p.is_featured,
      sku: p.sku || "",
      barcode: p.barcode || "",
      is_active: p.is_active === undefined ? true : !!p.is_active,
      low_stock_threshold: p.low_stock_threshold ?? 5,
    });
    setEditingId(p.id);
    setError("");
    setShowModal(true);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file, token);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file later
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        stock: Number(form.stock),
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
      };
      if (editingId) {
        await api.adminUpdateProduct(editingId, payload, token);
      } else {
        await api.adminCreateProduct(payload, token);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    await api.adminDeleteProduct(id, token);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Products</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          maxWidth: 600,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 18,
              color: "var(--ink-soft)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product by name, SKU, barcode or category..."
            style={{
              width: "100%",
              padding: "12px 42px",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 18,
                color: "var(--ink-soft)",
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Sold</th>
            <th>Featured</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="table-thumb">
                  {p.image ? <img src={resolveImageUrl(p.image)} alt="" /> : "🛒"}
                </div>
              </td>
              <td>{p.name}</td>
              <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.sku || "—"}</td>
              <td>{p.category_name}</td>
              <td>Rs. {p.price.toLocaleString()}</td>
              <td>
                {p.stock}
                {p.stock <= 0 ? (
                  <span className="badge badge-cancelled" style={{ marginLeft: 6 }}>Out</span>
                ) : p.stock <= p.low_stock_threshold ? (
                  <span className="badge badge-pending" style={{ marginLeft: 6 }}>Low</span>
                ) : null}
              </td>
              <td>{p.sold_quantity || 0}</td>
              <td>{p.is_featured ? "Yes" : "-"}</td>
              <td>{p.is_active ? <span className="badge badge-completed">Active</span> : <span className="badge badge-cancelled">Disabled</span>}</td>
              <td>
                <button className="icon-btn" onClick={() => openEdit(p)}>Edit</button>
                <button className="icon-btn danger" onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filteredProducts.length === 0 && (
            <tr>
              <td colSpan={10} style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>
                {searchTerm ? `No products found for "${searchTerm}"` : "No products available."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 14 }}>{editingId ? "Edit Product" : "Add Product"}</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="two-col">
                <div className="form-row">
                  <label>Price (Rs.)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="form-row">
                  <label>Compare-at price</label>
                  <input type="number" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} />
                </div>
              </div>
              <div className="two-col">
                <div className="form-row">
                  <label>Unit (e.g. 1kg, dozen)</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>
              <div className="two-col">
                <div className="form-row">
                  <label>SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Barcode</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <label>Low-Stock Threshold</label>
                <input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Product Photo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="image-preview">
                    {form.image ? (
                      <img src={resolveImageUrl(form.image)} alt="Preview" />
                    ) : (
                      <span style={{ fontSize: 22 }}>🛒</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: "8px 16px" }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : form.image ? "Change Photo" : "Choose Photo"}
                    </button>
                    {form.image && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        style={{ textAlign: "left" }}
                        onClick={() => setForm((f) => ({ ...f, image: "" }))}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  style={{ width: "auto" }}
                />
                <label style={{ marginBottom: 0 }}>Feature on homepage</label>
              </div>
              <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: "auto" }}
                />
                <label style={{ marginBottom: 0 }}>Active (visible to customers)</label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">{editingId ? "Save Changes" : "Add Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}