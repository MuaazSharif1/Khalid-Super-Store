import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { resolveImageUrl } from "../api";

export default function ImagePicker({ value, onChange, label }) {
  const { token } = useAuth();
  const [browsing, setBrowsing] = useState(false);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (browsing) api.adminMedia(token).then((d) => setMedia(d.media));
  }, [browsing, token]);

  async function handleUpload(file) {
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file, token);
      onChange(url);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="form-row">
      {label && <label>{label}</label>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {value ? (
          <img
            src={resolveImageUrl(value)}
            alt=""
            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
          />
        ) : (
          <div
            style={{
              width: 56, height: 56, borderRadius: 8, border: "1px dashed var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink-soft)",
            }}
          >
            None
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
        />
        <button type="button" className="btn" onClick={() => fileInput.current.click()} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <button type="button" className="btn" onClick={() => setBrowsing(true)}>
          Choose from Library
        </button>
        {value && (
          <button type="button" className="btn" onClick={() => onChange("")}>
            Remove
          </button>
        )}
      </div>

      {browsing && (
        <div className="modal-overlay" onClick={() => setBrowsing(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong>Choose from Media Library</strong>
              <button type="button" className="icon-btn" onClick={() => setBrowsing(false)}>✕</button>
            </div>
            <div className="media-grid">
              {media
                .filter((m) => m.type === "image")
                .map((m) => (
                  <div
                    className="media-tile"
                    key={m.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      onChange(m.url);
                      setBrowsing(false);
                    }}
                  >
                    <img src={resolveImageUrl(m.url)} alt="" />
                  </div>
                ))}
              {media.filter((m) => m.type === "image").length === 0 && (
                <p style={{ color: "var(--ink-soft)" }}>No images in your library yet — upload one first.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
