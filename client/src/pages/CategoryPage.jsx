import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../api";
import ProductCard from "../components/ProductCard";

export default function CategoryPage({ mode = "category" }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(q);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (mode === "category") params.category = slug;
    if (mode === "search") params.search = q;

    Promise.all([
      mode === "category" ? api.getCategories() : Promise.resolve({ categories: [] }),
      api.getProducts(params),
    ])
      .then(([catData, prodData]) => {
        if (mode === "category") {
          const found = catData.categories.find((c) => c.slug === slug);
          setCategory(found || null);
        }
        setProducts(prodData.products);
      })
      .finally(() => setLoading(false));
    setKeyword(q);
  }, [slug, q, mode]);

  const title = mode === "category" ? category?.name || "Department" : q ? `Results for "${q}"` : "All Products";

  const filtered = mode === "category" && keyword
    ? products.filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
    : products;

  return (
    <div className="container page">
      <div className="section-title">
        <h2>{title}</h2>
        {mode === "category" && (
          <input
            type="text"
            placeholder="Filter within department..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{
              border: "1.5px solid var(--line)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 13,
            }}
          />
        )}
      </div>

      {loading && <p>Loading products...</p>}
      {!loading && filtered.length === 0 && <p>No products found here yet. Check back soon.</p>}

      <div className="product-grid">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
