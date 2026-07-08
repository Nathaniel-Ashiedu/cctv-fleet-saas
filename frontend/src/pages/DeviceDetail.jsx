import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import apiClient from "../api/client";

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot"></span>
      {status}
    </span>
  );
}

function DeviceDetail() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [healthLogs, setHealthLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIp, setEditIp] = useState("");
  const [editType, setEditType] = useState("camera");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [snapshotError, setSnapshotError] = useState("");
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const navigate = useNavigate();

  useEffect(function () {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return function () {
      clearInterval(interval);
    };
  }, [deviceId]);

  async function fetchAll() {
    try {
      const [deviceRes, healthRes, alertsRes] = await Promise.all([
        apiClient.get(`/devices/${deviceId}`),
        apiClient.get(`/devices/${deviceId}/health`),
        apiClient.get(`/alerts`),
      ]);

      setDevice(deviceRes.data);
      setEditName(deviceRes.data.name);
      setEditIp(deviceRes.data.ip_address);
      setEditType(deviceRes.data.type);

      const chartData = healthRes.data.slice().reverse().map(function (log) {
        return {
          time: new Date(log.checked_at).toLocaleTimeString(),
          storage: log.storage_used_pct,
          latency: log.latency_ms,
        };
      });
      setHealthLogs(chartData);

      const deviceAlerts = alertsRes.data.filter(function (a) {
        return a.device_id === deviceId;
      });
      setAlerts(deviceAlerts);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Failed to load device data.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/devices/${deviceId}`, {
        name: editName,
        ipAddress: editIp,
        type: editType,
      });
      setEditing(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update device.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${device.name}"? This can't be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/devices/${deviceId}`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete device.");
      setDeleting(false);
    }
  }

  async function handleFetchSnapshot() {
    setLoadingSnapshot(true);
    setSnapshotError("");
    setSnapshotUrl(null);
    try {
      const response = await apiClient.get(`/devices/${deviceId}/snapshot`);
      // NOTE: no cache-busting query param — this specific ONVIF simulator returns
      // a 500 error on unexpected query strings. Real camera hardware may behave
      // differently; this hasn't been tested against physical devices.
      setSnapshotUrl(response.data.uri);
    } catch (err) {
      setSnapshotError(err.response?.data?.error || "Failed to load snapshot.");
    } finally {
      setLoadingSnapshot(false);
    }
  }

  if (loading) {
    return <div className="page"><p className="empty-state">Loading device...</p></div>;
  }

  if (error || !device) {
    return (
      <div className="page">
        <Link to="/dashboard" className="back-link">← Back to sites</Link>
        <p className="error-text">{error || "Device not found."}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to sites</Link>

      <div className="card-row detail-header" style={{ marginTop: 4 }}>
        <h1>{device.name}</h1>
        <div className="detail-header-actions">
          <StatusBadge status={device.status} />
          <button className="btn btn-ghost" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button className="btn btn-ghost" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      <p className="subtext">
        {device.ip_address} · {device.type}
        {device.last_seen_at && <> · last seen {new Date(device.last_seen_at).toLocaleString()}</>}
      </p>

      <div className="panel">
        <div className="card-row" style={{ marginBottom: snapshotUrl || snapshotError ? 16 : 0 }}>
          <div>
            <h3 style={{ margin: 0 }}>Live snapshot</h3>
            <p className="subtext" style={{ marginTop: 4 }}>
              Only loads when viewed from the same network as the camera.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={handleFetchSnapshot} disabled={loadingSnapshot}>
            {loadingSnapshot ? "Loading..." : "Refresh snapshot"}
          </button>
        </div>
        {snapshotError && <p className="error-text">{snapshotError}</p>}
        {snapshotUrl && (
          <img
            src={snapshotUrl}
            alt="Live camera snapshot"
            style={{ width: "100%", borderRadius: 8, display: "block" }}
            onError={() => setSnapshotError("Image failed to load — camera may be unreachable from this network.")}
          />
        )}
      </div>

      {editing && (
        <div className="panel">
          <h3 style={{ marginBottom: 16 }}>Edit device</h3>
          <form onSubmit={handleSaveEdit}>
            <div className="field">
              <label>Device name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="field">
              <label>IP address</label>
              <input type="text" value={editIp} onChange={(e) => setEditIp(e.target.value)} required />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                <option value="camera">Camera</option>
                <option value="nvr">NVR</option>
                <option value="sensor">Sensor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <h3 style={{ marginTop: 32, marginBottom: 16 }}>Storage &amp; latency — last 50 checks</h3>
      {healthLogs.length === 0 ? (
        <p className="empty-state">No health data yet. The background check runs every 30 seconds.</p>
      ) : (
        <div className="panel">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={healthLogs}>
              <CartesianGrid stroke="#263038" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7c8894" }} stroke="#263038" />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#7c8894" }} stroke="#263038" label={{ value: "Storage %", angle: -90, position: "insideLeft", fill: "#7c8894", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#7c8894" }} stroke="#263038" label={{ value: "Latency ms", angle: 90, position: "insideRight", fill: "#7c8894", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#161d22", border: "1px solid #263038", borderRadius: 8, fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
              <Line yAxisId="left" type="monotone" dataKey="storage" stroke="#f5a623" name="Storage %" dot={{ r: 3 }} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#3ddc97" name="Latency (ms)" dot={{ r: 3 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h3 style={{ marginTop: 32, marginBottom: 16 }}>Alerts</h3>
      {alerts.length === 0 ? (
        <p className="empty-state">No alerts for this device.</p>
      ) : (
        <ul className="card-list">
          {alerts.map(function (alert) {
            return (
              <li key={alert.id} className={`alert-item ${alert.resolved ? "" : "unresolved"}`}>
                <span className="alert-type">{alert.type}</span>
                <p style={{ margin: "6px 0 0" }}>{alert.message}</p>
                <p className="alert-timestamp">
                  {new Date(alert.created_at).toLocaleString()} {alert.resolved && "· resolved"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default DeviceDetail;