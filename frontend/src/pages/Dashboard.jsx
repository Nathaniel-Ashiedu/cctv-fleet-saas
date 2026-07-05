import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../api/client";

function Dashboard() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(function () {
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/sites");
      setSites(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Failed to load sites.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSite(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await apiClient.post("/sites", { name: newSiteName, address: newSiteAddress });
      setNewSiteName("");
      setNewSiteAddress("");
      fetchSites();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create site.");
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 700, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your Sites</h1>
        <button onClick={handleLogout}>Log out</button>
      </div>

      <form onSubmit={handleAddSite} style={{ margin: "24px 0", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Add a new site</h3>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Site name (e.g. Accra HQ)"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Address (optional)"
            value={newSiteAddress}
            onChange={(e) => setNewSiteAddress(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add site"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading sites...</p>
      ) : sites.length === 0 ? (
        <p>No sites yet — add one above to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sites.map(function (site) {
            return (
              <li
                key={site.id}
                style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 8 }}
              >
                <Link to={`/sites/${site.id}`} style={{ fontSize: 18, fontWeight: "bold", textDecoration: "none" }}>
                  {site.name}
                </Link>
                {site.address && <p style={{ margin: "4px 0 0", color: "#666" }}>{site.address}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Dashboard;