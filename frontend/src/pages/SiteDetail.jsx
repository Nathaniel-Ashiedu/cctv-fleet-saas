import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot"></span>
      {status}
    </span>
  );
}

function SiteDetail() {
  const { siteId } = useParams();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newIp, setNewIp] = useState("");
  const [newType, setNewType] = useState("camera");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(function () {
    fetchDevices();
  }, [siteId]);

  async function fetchDevices() {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(`/devices?siteId=${siteId}`);
      setDevices(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Failed to load devices.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDevice(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await apiClient.post("/devices", { siteId: siteId, name: newName, ipAddress: newIp, type: newType });
      setNewName("");
      setNewIp("");
      setNewType("camera");
      fetchDevices();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create device.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to sites</Link>
      <h1>Devices</h1>
      <p className="subtext">{devices.length} device{devices.length === 1 ? "" : "s"} at this site</p>

      <div className="panel">
        <h3 style={{ marginBottom: 16 }}>Add a device</h3>
        <form onSubmit={handleAddDevice}>
          <div className="field">
            <label>Device name</label>
            <input type="text" placeholder="Front Gate Cam" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="field">
            <label>IP address</label>
            <input type="text" placeholder="192.168.1.50" value={newIp} onChange={(e) => setNewIp(e.target.value)} required />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="camera">Camera</option>
              <option value="nvr">NVR</option>
              <option value="sensor">Sensor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Adding..." : "Add device"}
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="empty-state">Loading devices...</p>
      ) : devices.length === 0 ? (
        <p className="empty-state">No devices yet. Add one above to start tracking health.</p>
      ) : (
        <ul className="card-list">
          {devices.map(function (device) {
            return (
              <li key={device.id} className="card">
                <div className="card-row">
                  <Link to={`/devices/${device.id}`} className="card-link">{device.name}</Link>
                  <StatusBadge status={device.status} />
                </div>
                <p className="card-meta">{device.ip_address} · {device.type}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SiteDetail;