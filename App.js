
import React, { useEffect, useState } from "react";



const TMDB_KEY = "408331b54dbff4a7446835e77afd29d4";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const LS = {
  FAVS: "ml_favs_v3",
  WISH: "ml_wish_v3",
  THEME: "ml_theme_v3",
};

export default function App() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [favorites, setFavorites] = useState(readLS(LS.FAVS, []));
  const [wishlist, setWishlist] = useState(readLS(LS.WISH, []));
  const [themeDark, setThemeDark] = useState(readLS(LS.THEME, true));

  const [hoveredId, setHoveredId] = useState(null);
  const [modalMovie, setModalMovie] = useState(null); // detailed object with videos
  const [toast, setToast] = useState(null);

  // initial fetch
  useEffect(() => {
    fetchMovies();
    // keep body background in sync
    document.body.style.background = themeDark ? "#05060a" : "#f4f7fb";
    document.body.style.color = themeDark ? "#e6eef8" : "#071024";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist lists + theme
  useEffect(() => writeLS(LS.FAVS, favorites), [favorites]);
  useEffect(() => writeLS(LS.WISH, wishlist), [wishlist]);
  useEffect(() => writeLS(LS.THEME, themeDark), [themeDark]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchMovies() {
    setLoading(true);
    try {
      const url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network response was not OK");
      const data = await res.json();
      setMovies(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      console.error("fetchMovies error:", e);
      setToast("Unable to fetch movies. Check network or API key.");
    } finally {
      setLoading(false);
    }
  }

  async function searchMovies() {
    if (!query || !query.trim()) {
      fetchMovies();
      return;
    }
    setLoading(true);
    try {
      const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=en-US&query=${encodeURIComponent(
        query
      )}&include_adult=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setMovies(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      console.error("searchMovies error:", e);
      setToast("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(movie) {
    const exists = favorites.some((m) => m.id === movie.id);
    if (exists) {
      setFavorites((p) => p.filter((m) => m.id !== movie.id));
      setToast("Removed from Favorites");
    } else {
      setFavorites((p) => [movie, ...p]);
      setToast("Added to Favorites");
    }
  }

  function toggleWishlist(movie) {
    const exists = wishlist.some((m) => m.id === movie.id);
    if (exists) {
      setWishlist((p) => p.filter((m) => m.id !== movie.id));
      setToast("Removed from Wishlist");
    } else {
      setWishlist((p) => [movie, ...p]);
      setToast("Added to Wishlist");
    }
  }

  // Fetch movie details + videos before opening modal
  async function openDetails(movie) {
    try {
      setLoading(true);
      const url = `${TMDB_BASE}/movie/${movie.id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=videos,credits`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setModalMovie(data);
    } catch (e) {
      console.error("openDetails error:", e);
      setToast("Failed to load movie details.");
    } finally {
      setLoading(false);
    }
  }

  // Find best YouTube trailer key from movie.videos
  function getYouTubeTrailerKey(movieDetail) {
    if (!movieDetail || !movieDetail.videos || !Array.isArray(movieDetail.videos.results))
      return null;
    // Prefer official trailers, then other trailers, then teasers
    const vids = movieDetail.videos.results;
    const candidates = vids.filter((v) => v.site === "YouTube");
    if (candidates.length === 0) return null;
    const prefer = ["Official Trailer", "Trailer", "Official"];
    for (const pref of prefer) {
      const found = candidates.find((v) => (v.name || "").toLowerCase().includes(pref.toLowerCase()));
      if (found) return found.key;
    }
    // fallback: first YouTube result
    return candidates[0].key;
  }

  function playTrailer(movieDetail) {
    const key = getYouTubeTrailerKey(movieDetail);
    if (!key) {
      setToast("Trailer not available for this movie.");
      return;
    }
    const url = `https://www.youtube.com/watch?v=${key}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareMovie(movie) {
    const title = movie.title || movie.name || "Movie";
    const year = movie.release_date ? `(${movie.release_date.slice(0, 4)})` : "";
    const text = `${title} ${year}\n\n${movie.overview || ""}`;
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {
        navigator.clipboard?.writeText(text);
        setToast("Movie details copied to clipboard");
      });
    } else {
      navigator.clipboard?.writeText(text);
      setToast("Movie details copied to clipboard");
    }
  }

  // Combined neon + netflix styles
  const styles = uiStyles(themeDark);

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.brandWrap}>
          <div style={styles.logo}>🎬</div>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Movie Explorer</div>
            <div style={styles.subtitle}>React • TMDB • Neon UI</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.searchWrap}>
            <input
              aria-label="Search movies"
              placeholder="Search movies e.g. Inception"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchMovies()}
              style={styles.searchInput}
            />
            <button onClick={searchMovies} style={styles.searchBtn}>
              Search
            </button>
          </div>

          <button
            title="Toggle theme"
            onClick={() => {
              setThemeDark((t) => !t);
              document.body.style.background = !themeDark ? "#05060a" : "#f4f7fb";
            }}
            style={styles.iconBtn}
          >
            {themeDark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <div style={styles.main}>
        {/* SIDEBAR */}
        <aside style={styles.sidebar}>
          <h4 style={styles.sidebarTitle}>Saved</h4>

          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>❤️ Favorites</div>
            {favorites.length === 0 ? (
              <div style={styles.sideEmpty}>No favorites yet</div>
            ) : (
              favorites.slice(0, 6).map((m) => (
                <SideRow
                  key={m.id}
                  movie={m}
                  imgSrc={m.poster_path ? IMG_BASE + m.poster_path : null}
                />
              ))
            )}
          </div>

          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>🔖 Wishlist</div>
            {wishlist.length === 0 ? (
              <div style={styles.sideEmpty}>No wishlist yet</div>
            ) : (
              wishlist.slice(0, 6).map((m) => (
                <SideRow
                  key={m.id}
                  movie={m}
                  imgSrc={m.poster_path ? IMG_BASE + m.poster_path : null}
                />
              ))
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => {
                setFavorites([]);
                setWishlist([]);
                setToast("Saved lists cleared");
              }}
              style={styles.clearBtn}
            >
              Clear saved
            </button>
          </div>
        </aside>

        {/* CONTENT */}
        <section style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading movies...</div>
          ) : movies.length === 0 ? (
            <div style={styles.loading}>No movies found</div>
          ) : (
            <div style={styles.grid}>
              {movies.map((movie) => (
                <article
                  key={movie.id}
                  style={styles.card}
                  onMouseEnter={() => setHoveredId(movie.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <img
                    src={movie.poster_path ? IMG_BASE + movie.poster_path : placeholderImage()}
                    alt={movie.title}
                    style={styles.poster}
                    onClick={() => openDetails(movie)}
                  />

                  <div style={styles.cardInfo}>
                    <div style={styles.cardTitle}>{movie.title}</div>
                    <div style={styles.cardMeta}>
                      <span style={styles.rating}>★ {movie.vote_average ?? "-"}</span>
                      <span style={styles.year}>{movie.release_date ? movie.release_date.slice(0, 4) : "—"}</span>
                    </div>
                  </div>

                  {/* overlay buttons shown when hovered */}
                  <div
                    style={{
                      ...styles.overlay,
                      opacity: hoveredId === movie.id ? 1 : 0,
                      pointerEvents: hoveredId === movie.id ? "auto" : "none",
                    }}
                  >
                    <button
                      title="Add to Favorites"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(movie);
                      }}
                      style={{
                        ...styles.overlayBtn,
                        background: favorites.some((m) => m.id === movie.id) ? "linear-gradient(45deg,#ff3b3b,#ff7b7b)" : undefined,
                      }}
                    >
                      ♥
                    </button>

                    <button
                      title="Add to Wishlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(movie);
                      }}
                      style={{
                        ...styles.overlayBtn,
                        background: wishlist.some((m) => m.id === movie.id) ? "linear-gradient(45deg,#ffd85a,#ffb84d)" : undefined,
                      }}
                    >
                      🔖
                    </button>

                    <button
                      title="Share"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareMovie(movie);
                      }}
                      style={styles.overlayBtn}
                    >
                      ⇪
                    </button>

                    <button
                      title="Details / Trailer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetails(movie);
                      }}
                      style={{ ...styles.overlayBtn, background: "linear-gradient(90deg,#8b5cf6,#06b6d4)" }}
                    >
                      ▶
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL */}
      {modalMovie && (
        <div style={styles.modalBackdrop} onClick={() => setModalMovie(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalLeft}>
              <img
                src={modalMovie.poster_path ? IMG_BASE + modalMovie.poster_path : placeholderImage()}
                alt={modalMovie.title}
                style={styles.modalPoster}
              />
            </div>

            <div style={styles.modalRight}>
              <h2 style={{ marginTop: 0 }}>{modalMovie.title}</h2>
              <div style={{ color: "#9fb0d6", marginBottom: 8 }}>
                {modalMovie.genres && modalMovie.genres.map((g) => g.name).join(" • ")}
              </div>
              <div style={{ marginBottom: 12, color: "#c9d7ef" }}>{modalMovie.overview || "No description available."}</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => playTrailer(modalMovie)}
                  style={{ ...styles.primaryBtn, display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  ▶ Watch Trailer
                </button>

                <button
                  onClick={() => {
                    toggleFavorite(modalMovie);
                  }}
                  style={styles.ghostBtn}
                >
                  ♥ Favorite
                </button>

                <button
                  onClick={() => {
                    toggleWishlist(modalMovie);
                  }}
                  style={styles.ghostBtn}
                >
                  🔖 Wishlist
                </button>

                <a
                  href={`https://www.themoviedb.org/movie/${modalMovie.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.linkBtn}
                >
                  View on TMDB
                </a>
              </div>

              <div style={{ marginTop: 14, color: "#9fb0d6", fontSize: 13 }}>
                Rating: {modalMovie.vote_average ?? "N/A"} • Runtime: {modalMovie.runtime ? modalMovie.runtime + "m" : "N/A"}
              </div>
            </div>

            <button style={styles.modalClose} onClick={() => setModalMovie(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Helper components & utils ---------------- */

function SideRow({ movie, imgSrc }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
      <img src={imgSrc || placeholderImage()} alt={movie.title} style={{ width: 46, height: 68, objectFit: "cover", borderRadius: 6 }} />
      <div style={{ fontSize: 13 }}>{movie.title}</div>
    </div>
  );
}

function placeholderImage() {
  return "https://via.placeholder.com/500x750?text=No+Image";
}

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/* ---------------- UI styles (returns style object) ---------------- */

function uiStyles(dark) {
  const neon = {
    accent: "linear-gradient(90deg,#ff416c,#ff4b2b)", // warm neon
    alt: "linear-gradient(90deg,#8b5cf6,#06b6d4)", // purple-cyan
  };
  return {
    app: {
      minHeight: "100vh",
      fontFamily: `'Inter', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`,
      background: dark ? "#05060a" : "#f4f7fb",
      color: dark ? "#e6eef8" : "#071024",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 20px",
      borderBottom: dark ? "1px solid rgba(255,255,255,0.03)" : "1px solid #e6eef8",
      backdropFilter: "blur(6px)",
    },
    brandWrap: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      background: dark ? "linear-gradient(135deg,#061221,#091122)" : "#fff",
      boxShadow: dark ? "0 6px 20px rgba(139,92,246,0.06)" : "0 6px 20px rgba(0,0,0,0.06)",
    },
    titleBlock: { lineHeight: 1 },
    title: { fontWeight: 800, fontSize: 18 },
    subtitle: { fontSize: 12, color: dark ? "#9fb0d6" : "#6b7280" },

    headerRight: { display: "flex", gap: 12, alignItems: "center" },
    searchWrap: { display: "flex", gap: 8, alignItems: "center" },
    searchInput: {
      padding: "8px 12px",
      borderRadius: 10,
      border: "none",
      width: 300,
      boxShadow: dark ? "inset 0 0 0 1px rgba(255,255,255,0.02)" : "inset 0 0 0 1px rgba(0,0,0,0.06)",
      background: dark ? "#071129" : "#fff",
      color: dark ? "#e6eef8" : "#071024",
    },
    searchBtn: {
      padding: "8px 12px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      background: neon.accent,
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 6px 20px rgba(255,65,108,0.12)",
    },
    iconBtn: {
      padding: "8px 10px",
      borderRadius: 8,
      border: "none",
      background: "transparent",
      color: dark ? "#d9eefc" : "#071024",
      cursor: "pointer",
    },

    main: { display: "flex", gap: 18, padding: 18 },
    sidebar: {
      width: 280,
      padding: 16,
      borderRadius: 12,
      background: dark ? "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.015))" : "#fff",
      boxShadow: dark ? "0 12px 40px rgba(2,6,23,0.6)" : "0 6px 20px rgba(0,0,0,0.06)",
      color: dark ? "#cfe6ff" : "#071024",
      minHeight: "70vh",
    },
    sidebarTitle: { margin: 0, marginBottom: 12 },
    sideSection: { marginBottom: 12 },
    sideHeader: { fontSize: 13, marginBottom: 8, opacity: 0.9 },
    sideEmpty: { color: "#9fb0d6", fontSize: 13 },
    clearBtn: {
      marginTop: 8,
      padding: "8px 10px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      background: "rgba(255,255,255,0.03)",
      color: dark ? "#e6eef8" : "#071024",
    },

    content: { flex: 1 },
    loading: { padding: 32, textAlign: "center", color: "#9fb0d6" },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 16,
    },
    card: {
      borderRadius: 12,
      overflow: "hidden",
      background: dark ? "#061226" : "#ffffff",
      position: "relative",
      boxShadow: dark ? "0 8px 30px rgba(3,7,18,0.6)" : "0 6px 20px rgba(0,0,0,0.06)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease",
    },
    poster: { width: "100%", display: "block", objectFit: "cover", height: 300, cursor: "pointer" },
    cardInfo: { padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
    cardTitle: { fontWeight: 700, fontSize: 15 },
    cardMeta: { display: "flex", gap: 10, alignItems: "center", opacity: 0.9 },
    rating: { color: "#ffd166", fontWeight: 700 },
    year: { color: dark ? "#9fb0d6" : "#6b7280", fontSize: 13 },

    overlay: {
      position: "absolute",
      top: 10,
      right: 10,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "opacity 0.18s ease",
    },
    overlayBtn: {
      border: "none",
      width: 44,
      height: 44,
      borderRadius: 10,
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    },

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(1,6,12,0.7)",
      zIndex: 9999,
      padding: 20,
    },
    modalCard: {
      width: "min(1000px, 96%)",
      display: "flex",
      gap: 18,
      background: dark ? "#08101b" : "#fff",
      borderRadius: 14,
      padding: 18,
      position: "relative",
      color: dark ? "#e6eef8" : "#071024",
      boxShadow: dark ? "0 20px 80px rgba(0,0,0,0.6)" : "0 20px 60px rgba(0,0,0,0.08)",
    },
    modalLeft: { minWidth: 240 },
    modalPoster: { width: "100%", borderRadius: 10, objectFit: "cover" },
    modalRight: { flex: 1 },
    modalClose: {
      position: "absolute",
      right: 12,
      top: 12,
      border: "none",
      background: "transparent",
      color: "#fff",
      fontSize: 20,
      cursor: "pointer",
    },

    primaryBtn: {
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      background: neon.alt,
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 12px 40px rgba(8,145,178,0.12)",
    },
    ghostBtn: {
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "transparent",
      color: "#fff",
      cursor: "pointer",
    },
    linkBtn: {
      padding: "8px 12px",
      borderRadius: 10,
      border: "none",
      background: "transparent",
      color: "#9fb0d6",
      textDecoration: "underline",
    },

    toast: {
      position: "fixed",
      right: 18,
      bottom: 18,
      background: "linear-gradient(90deg,#0f172a,#0b1220)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 10,
      boxShadow: "0 8px 30px rgba(2,6,23,0.6)",
      zIndex: 99999,
    },
  };
}
