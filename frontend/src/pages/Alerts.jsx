import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("unresolved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const navigate = useNavigate();

  useEffect(function () {
    fetchAlerts();
  }, [filter]);

  async function fetchAlerts() {
    setLoading(true);
    setError("");
    try {
      const query = filter === "all" ? "" : `?resolved=${filter === "resolved"}`;
      const response = await apiClient.get(`/alerts${query}`);
      setAlerts(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Failed to load alerts.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(alertId) {
    setResolvingId(alertId);
    try {
      await apiClient.put(`/alerts/${alertId}/resolve`);
      fetchAlerts();
    } catch (err) {
      setError("Failed to resolve alert.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to sites</Link>
      <h1>Alerts</h1>
      <p className="subtext">Across all sites and devices</p>

      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        {["unresolved", "resolved", "all"].map(function (option) {
          return (
            <button
              key={option}
              className={filter === option ? "btn btn-primary" : "btn btn-ghost"}
              style={{ fontSize: 13, padding: "6px 14px", textTransform: "capitalize" }}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="empty-state">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p className="empty-state">No {filter === "all" ? "" : filter} alerts.</p>
      ) : (
        <ul className="card-list">
          {alerts.map(function (alert) {
            return (
              <li key={alert.id} className={`alert-item ${alert.resolved ? "" : "unresolved"}`}>
                <div className="card-row">
                  <div>
                    <span className="alert-type">{alert.type}</span>
                    <p style={{ margin: "6px 0 0" }}>
                      <Link to={`/devices/${alert.device_id}`} style={{ fontWeight: 600 }}>
                        {alert.device_name}
                      </Link>{" "}
                      — {alert.message}
                    </p>
                    <p className="alert-timestamp">
                      {new Date(alert.created_at).toLocaleString()} {alert.resolved && "· resolved"}
                    </p>
                  </div>
                  {!alert.resolved && (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "4px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                    >
                      {resolvingId === alert.id ? "..." : "Resolve"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Alerts;