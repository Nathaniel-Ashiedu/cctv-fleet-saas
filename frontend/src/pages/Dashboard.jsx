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
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  function startEdit(site) {
    setEditingId(site.id);
    setEditName(site.name);
    setEditAddress(site.address || "");
  }

  async function handleSaveEdit(e, siteId) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiClient.put(`/sites/${siteId}`, { name: editName, address: editAddress });
      setEditingId(null);
      fetchSites();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update site.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(siteId, siteName) {
    const confirmed = window.confirm(
      `Delete "${siteName}"? This will also delete all its devices and health history. This can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(siteId);
    try {
      await apiClient.delete(`/sites/${siteId}`);
      fetchSites();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete site.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sites</h1>
          <p className="subtext">{sites.length} site{sites.length === 1 ? "" : "s"} under management</p>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 16 }}>Add a site</h3>
        <form onSubmit={handleAddSite}>
          <div className="field">
            <label>Site name</label>
            <input type="text" placeholder="Accra HQ" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Address (optional)</label>
            <input type="text" placeholder="Osu, Accra" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Adding..." : "Add site"}
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="empty-state">Loading sites...</p>
      ) : sites.length === 0 ? (
        <p className="empty-state">No sites yet. Add one above to start monitoring devices.</p>
      ) : (
        <ul className="card-list">
          {sites.map(function (site) {
            const isEditing = editingId === site.id;
            return (
              <li key={site.id} className="card">
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveEdit(e, site.id)}>
                    <div className="field">
                      <label>Site name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div className="field">
                      <label>Address</label>
                      <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="card-row">
                    <div>
                      <Link to={`/sites/${site.id}`} className="card-link">{site.name}</Link>
                      {site.address && <p className="card-meta">{site.address}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(site)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => handleDelete(site.id, site.name)}
                        disabled={deletingId === site.id}
                      >
                        {deletingId === site.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
export default Dashboard;