import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveImageUrl } from "../api";
import ProductCard from "../components/ProductCard";
import DeliveryBanner from "../components/DeliveryBanner";

const DEFAULT_HOMEPAGE = {
  hero_title: "Everything You Need.",
  hero_subtitle:
    "Fresh groceries, daily essentials, household products and more — all at honest prices, delivered straight to your door.",
  hero_image: "",
  banner_image: "",
  cta_text: "Shop Now",
  cta_link: "/search?q=",
  announcement: "",
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [homepage, setHomepage] = useState(DEFAULT_HOMEPAGE);

  useEffect(() => {
    api.getCategories().then((d) => setCategories(d.categories)).catch(() => {});
    api.getProducts({ featured: "true" }).then((d) => setFeatured(d.products)).catch(() => {});
    api
      .getSiteSettings()
      .then((d) => d.homepage && setHomepage({ ...DEFAULT_HOMEPAGE, ...d.homepage }))
      .catch(() => {});
  }, []);

  // Admin can set a full hero title in Settings → Homepage; the "trailing
  // highlighted line" only shows when they provide a second line via "\n".
  const [heroLine1, heroLine2] = (homepage.hero_title || DEFAULT_HOMEPAGE.hero_title).split("\n");

  return (
    <div>
      {homepage.announcement && (
        <div className="store-announcement-bar">{homepage.announcement}</div>
      )}

      {/* NEW HERO BANNER */}
      <section
        className="hero-new"
        style={
          homepage.banner_image
            ? {
                backgroundImage: `linear-gradient(rgba(70,75,113,0.82), rgba(70,75,113,0.82)), url(${resolveImageUrl(homepage.banner_image)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >

        <div className="hero-new-container">

          <div className="hero-new-content">

            <span className="hero-new-eyebrow">
              KHALID SUPER STORE
            </span>

            <h1>
              {heroLine1}
              {heroLine2 ? <span>{heroLine2}</span> : <span>Delivered Fresh.</span>}
            </h1>

            <p>
              {homepage.hero_subtitle || DEFAULT_HOMEPAGE.hero_subtitle}
            </p>

            <div className="hero-new-actions">

              <Link to={homepage.cta_link || "/search?q="} className="hero-new-button">
                {homepage.cta_text || "Shop Now"} →
              </Link>

              <div className="hero-new-trust">
                <strong>✓ Same-Day Delivery</strong>
                <span>Fresh & reliable</span>
              </div>

            </div>

          </div>


          <div className="hero-new-products">
            {homepage.hero_image ? (
              <div className="hero-new-card hero-new-card-big hero-new-card-image">
                <img src={resolveImageUrl(homepage.hero_image)} alt="" />
              </div>
            ) : (
              <div className="hero-new-card hero-new-card-big">
                <span>🥦</span>
                <strong>Fresh Produce</strong>
              </div>
            )}

            <div className="hero-new-card">
              <span>🥛</span>
              <strong>Dairy</strong>
            </div>

            <div className="hero-new-card">
              <span>🍞</span>
              <strong>Bakery</strong>
            </div>

            <div className="hero-new-card">
              <span>🧴</span>
              <strong>Essentials</strong>
            </div>

          </div>

        </div>


        <div className="hero-new-bottom">

          <span>🥬 Fresh Products</span>
          <span>🚚 Fast Delivery</span>
          <span>💳 Easy Payment</span>
          <span>⭐ Trusted Store</span>

        </div>

      </section>


      <DeliveryBanner />

      <div className="container">

        <div className="section-title">
          <h2>Shop by Department</h2>
        </div>

        <div className="category-grid">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className="category-tile"
            >
              {c.image ? (
                <img
                  src={resolveImageUrl(c.image)}
                  alt=""
                  style={{ width: 32, height: 32, objectFit: "contain", marginBottom: 6 }}
                />
              ) : (
                <span className="icon">{c.icon}</span>
              )}
              <span className="name">{c.name}</span>
              <div className="count">
                {c.product_count} items
              </div>
            </Link>
          ))}
        </div>

        <div className="promo-banner">
          <img src="/atta-banner.jpg" alt="Khalid Chakki Atta — 100% Whole Wheat Flour" />
        </div>

        <div className="section-title">

          <h2>Today's Picks</h2>

          <Link to="/search?q=">
            Shop all
          </Link>

        </div>


        <div className="product-grid">

          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
            />
          ))}

        </div>

      </div>

    </div>
  );
}
