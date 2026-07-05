import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 600, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Dashboard</h1>
      <p>You're logged in. Sites and devices will show up here next.</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}

export default Dashboard;