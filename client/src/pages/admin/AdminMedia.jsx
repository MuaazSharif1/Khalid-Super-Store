import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { resolveImageUrl } from "../../api";

export default function AdminMedia() {
  const { token } = useAuth();
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const fileInput = useRef(null);

  function load() {
    api.adminMedia(token).then((d) => setMedia(d.media));
  }
  useEffect(load, [token]);

  async function handleFiles(files) {
    setError("");
    setUploading(true);
    try {
      for (const file of files) {
        await api.uploadMedia(file, token);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this media file? This can't be undone.")) return;
    await api.adminDeleteMedia(id, token);
    load();
  }

  function copyUrl(item) {
    navigator.clipboard.writeText(resolveImageUrl(item.url)).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Media Library</h2>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/mp4,video/webm"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files.length && handleFiles([...e.target.files])}
          />
          <button className="btn btn-primary" onClick={() => fileInput.current.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "+ Upload Media"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
        Upload images and short videos here once, then reuse them for banners, products, and categories — copy a
        file's URL and paste it wherever an image field is available.
      </p>

      {media.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: "center", color: "var(--ink-soft)" }}>
          No media uploaded yet.
        </div>
      ) : (
        <div className="media-grid">
          {media.map((item) => (
            <div className="media-tile" key={item.id}>
              {item.type === "video" ? (
                <video src={resolveImageUrl(item.url)} muted />
              ) : (
                <img src={resolveImageUrl(item.url)} alt={item.original_name || ""} />
              )}
              <div className="media-tile-actions">
                <button onClick={() => copyUrl(item)}>{copiedId === item.id ? "Copied!" : "Copy URL"}</button>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
