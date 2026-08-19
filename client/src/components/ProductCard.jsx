import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { resolveImageUrl } from "../api";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const outOfStock = product.stock <= 0;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  return (
    <div className="product-card">
      {hasDiscount && <span className="sale-ribbon">Sale</span>}
      {product.stock > 0 && product.stock <= 5 && (
        <span className="stock-flag">Only {product.stock} left</span>
      )}
      {outOfStock && <span className="stock-flag">Out of stock</span>}
      <Link to={`/product/${product.slug}`}>
        <div className="product-thumb">
          {product.image ? (
            <img src={resolveImageUrl(product.image)} alt={product.name} />
          ) : (
            "🛒"
          )}
        </div>
      </Link>
      <Link to={`/product/${product.slug}`}>
        <div className="product-name">{product.name}</div>
      </Link>
      <div className="product-unit">{product.unit}</div>
      <div className="price-tag">
        <span className="now">Rs. {product.price.toLocaleString()}</span>
        {product.compare_at_price && (
          <span className="was">Rs. {product.compare_at_price.toLocaleString()}</span>
        )}
      </div>
      <button className="add-btn" disabled={outOfStock} onClick={() => addItem(product, 1)}>
        {outOfStock ? "Unavailable" : "Add to Cart"}
      </button>
    </div>
  );
}
