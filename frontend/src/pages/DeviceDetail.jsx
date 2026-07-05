import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import apiClient from "../api/client";

const statusColors = {
  online: "#2e7d32",
  offline: "#c62828",
  unknown: "#999",
};

function DeviceDetail() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [healthLogs, setHealthLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(
    function () {
      fetchAll();
      // Poll every 15s so the chart updates as new health checks come in
      const interval = setInterval(fetchAll, 15000);
      return function () {
        clearInterval(interval);
      };
    },
    [deviceId]
  );

  async function fetchAll() {
    try {
      const [deviceRes, healthRes, alertsRes] = await Promise.all([
        apiClient.get(`/devices/${deviceId}`),
        apiClient.get(`/devices/${deviceId}/health`),
        apiClient.get(`/alerts`),
      ]);

      setDevice(deviceRes.data);

      // Reverse so the chart reads oldest -> newest, left to right
      const chartData = healthRes.data
        .slice()
        .reverse()
        .map(function (log) {
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

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", fontFamily: "sans-serif" }}>
        <p>Loading device...</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", fontFamily: "sans-serif" }}>
        <Link to="/dashboard">← Back to sites</Link>
        <p style={{ color: "red" }}>{error || "Device not found."}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", fontFamily: "sans-serif" }}>
      <Link to="/dashboard">← Back to sites</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>{device.name}</h1>
        <span
          style={{
            color: "white",
            background: statusColors[device.status] || statusColors.unknown,
            padding: "4px 14px",
            borderRadius: 12,
            fontSize: 13,
            textTransform: "uppercase",
          }}
        >
          {device.status}
        </span>
      </div>
      <p style={{ color: "#666" }}>
        {device.ip_address} · {device.type}
        {device.last_seen_at && <> · last seen {new Date(device.last_seen_at).toLocaleString()}</>}
      </p>

      <h3>Storage & Latency (last 50 checks)</h3>
      {healthLogs.length === 0 ? (
        <p>No health data yet — the background check runs every 30 seconds, check back shortly.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={healthLogs}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" label={{ value: "Storage %", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: "Latency ms", angle: 90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="storage" stroke="#1976d2" name="Storage %" />
            <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#ef6c00" name="Latency (ms)" />
          </LineChart>
        </ResponsiveContainer>
      )}

      <h3 style={{ marginTop: 32 }}>Alerts</h3>
      {alerts.length === 0 ? (
        <p>No alerts for this device.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {alerts.map(function (alert) {
            return (
              <li
                key={alert.id}
                style={{
                  padding: 10,
                  border: "1px solid #eee",
                  borderRadius: 8,
                  marginBottom: 8,
                  background: alert.resolved ? "#f5f5f5" : "#fff3e0",
                }}
              >
                <strong>{alert.type}</strong> — {alert.message}
                <div style={{ fontSize: 12, color: "#666" }}>
                  {new Date(alert.created_at).toLocaleString()} {alert.resolved && "· resolved"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default DeviceDetail;