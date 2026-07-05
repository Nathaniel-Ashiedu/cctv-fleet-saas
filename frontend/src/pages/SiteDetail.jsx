import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";

const statusColors = {
  online: "#2e7d32",
  offline: "#c62828",
  unknown: "#999",
};

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

  useEffect(
    function () {
      fetchDevices();
    },
    [siteId]
  );

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
      await apiClient.post("/devices", {
        siteId: siteId,
        name: newName,
        ipAddress: newIp,
        type: newType,
      });
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
    <div style={{ maxWidth: 700, margin: "60px auto", fontFamily: "sans-serif" }}>
      <Link to="/dashboard">← Back to sites</Link>
      <h1>Devices</h1>

      <form onSubmit={handleAddDevice} style={{ margin: "24px 0", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Add a new device</h3>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Device name (e.g. Front Gate Cam)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="IP address (e.g. 192.168.1.50)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="camera">Camera</option>
            <option value="nvr">NVR</option>
            <option value="sensor">Sensor</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add device"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading devices...</p>
      ) : devices.length === 0 ? (
        <p>No devices yet — add one above to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {devices.map(function (device) {
            return (
              <li
                key={device.id}
                style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 8 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link to={`/devices/${device.id}`} style={{ fontSize: 16, fontWeight: "bold", textDecoration: "none" }}>
                    {device.name}
                  </Link>
                  <span
                    style={{
                      color: "white",
                      background: statusColors[device.status] || statusColors.unknown,
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    {device.status}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#666" }}>
                  {device.ip_address} · {device.type}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SiteDetail;