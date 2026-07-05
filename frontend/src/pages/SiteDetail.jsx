import { Link, useParams } from "react-router-dom";

function SiteDetail() {
  const { siteId } = useParams();
  return (
    <div style={{ maxWidth: 700, margin: "60px auto", fontFamily: "sans-serif" }}>
      <Link to="/dashboard">← Back to sites</Link>
      <h1>Site {siteId}</h1>
      <p>Devices for this site will show up here next.</p>
    </div>
  );
}

export default SiteDetail;