import { Link, useParams } from "react-router-dom";

function DeviceDetail() {
  const { deviceId } = useParams();
  return (
    <div style={{ maxWidth: 700, margin: "60px auto", fontFamily: "sans-serif" }}>
      <Link to="/dashboard">← Back to sites</Link>
      <h1>Device {deviceId}</h1>
      <p>Health history chart will show up here next.</p>
    </div>
  );
}

export default DeviceDetail;