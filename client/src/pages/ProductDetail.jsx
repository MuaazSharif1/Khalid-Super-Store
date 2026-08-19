import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { resolveImageUrl } from "../api";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    setAdded(false);
    api.getProduct(slug).then((d) => setProduct(d.product)).catch(() => setProduct(null));
  }, [slug]);

  if (!product) return <div className="container page">Loading product...</div>;

  return (
    <div className="container page">
      <p style={{ fontSize: 13, marginBottom: 18 }}>
        <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link> / {product.name}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div className="card product-detail-image">
          {product.image ? (
            <img src={resolveImageUrl(product.image)} alt={product.name} />
          ) : (
            <span style={{ fontSize: 90 }}>🛒</span>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 34, textTransform: "none", marginBottom: 8 }}>{product.name}</h1>
          <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>{product.unit}</p>
          <div className="price-tag" style={{ fontSize: 18, marginBottom: 20 }}>
            <span className="now">Rs. {product.price.toLocaleString()}</span>
            {product.compare_at_price && <span className="was">Rs. {product.compare_at_price.toLocaleString()}</span>}
          </div>
          <p style={{ marginBottom: 24, lineHeight: 1.6 }}>{product.description}</p>

          {product.stock > 0 ? (
            <>
              <div className="qty-control" style={{ width: "fit-content", marginBottom: 18 }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                <span style={{ minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addItem(product, qty);
                  setAdded(true);
                }}
              >
                Add {qty} to Cart
              </button>
              {added && <span style={{ marginLeft: 12, color: "var(--green-dark)", fontWeight: 700 }}>Added ✓</span>}
            </>
          ) : (
            <p style={{ color: "var(--brick)", fontWeight: 700 }}>Currently out of stock</p>
          )}
        </div>
      </div>
    </div>
  );
}
