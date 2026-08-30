import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const pages = [
  "Dashboard",
  "Live Fleet",
  "Vehicles",
  "Drivers",
  "Assignments",
  "Maintenance",
  "Audits",
  "Routes",
  "Settings",
];

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("Dashboard");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">FLEET MANAGEMENT</div>
            <h1>{page}</h1>
          </div>

          <button
            className="secondary-button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </header>

        <div className="content">
          {page === "Dashboard" && <Dashboard />}
          {page === "Live Fleet" && <LiveFleet />}
          {page === "Vehicles" && <Vehicles />}
          {page === "Drivers" && <Drivers />}
          {page === "Assignments" && <Assignments />}
          {page === "Maintenance" && <Maintenance />}
          {page === "Audits" && <Audits />}
          {page === "Routes" && <Routes />}
          {page === "Settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }

    setBusy(false);
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={signIn}>
        <div className="eyebrow">FLEET MANAGEMENT</div>
        <h1>Sign in</h1>
        <p className="muted">
          Private fleet operations dashboard
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="primary-button" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <div>
          <strong>Fleet</strong>
          <span>Management</span>
        </div>
      </div>

      <nav>
        {pages.map((item) => (
          <button
            key={item}
            className={`nav-button ${
              page === item ? "active" : ""
            }`}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [events, setEvents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  useEffect(() => {
    async function load() {
      const [
        { data: vehicleData },
        { data: eventData },
        { data: maintenanceData },
      ] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase
          .from("vehicle_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("maintenance_records")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setVehicles(vehicleData || []);
      setEvents(eventData || []);
      setMaintenance(maintenanceData || []);
    }

    load();
  }, []);

  const inService = vehicles.filter(
    (v) => v.status === "IN_SERVICE"
  ).length;

  const available = vehicles.filter(
    (v) => v.status === "AVAILABLE"
  ).length;

  const maintenanceCount = vehicles.filter(
    (v) => v.status === "MAINTENANCE"
  ).length;

  return (
    <>
      <div className="stats-grid">
        <Stat title="Total Vehicles" value={vehicles.length} />
        <Stat title="In Service" value={inService} />
        <Stat title="Available" value={available} />
        <Stat
          title="Maintenance"
          value={maintenanceCount}
        />
      </div>

      <div className="two-column">
        <section className="panel">
          <PanelTitle title="Recent Activity" />

          {events.length === 0 ? (
            <Empty />
          ) : (
            events.map((event) => (
              <div className="list-row" key={event.id}>
                <div>
                  <strong>
                    {event.event_type}
                  </strong>
                  <div className="muted">
                    {event.description || "No description"}
                  </div>
                </div>

                <div className="muted">
                  {formatDate(event.created_at)}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <PanelTitle title="Maintenance" />

          {maintenance.length === 0 ? (
            <Empty />
          ) : (
            maintenance.map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <strong>
                    {item.maintenance_type}
                  </strong>
                  <div className="muted">
                    {item.description || "No description"}
                  </div>
                </div>

                <StatusBadge status={item.status} />
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}

function LiveFleet() {
  const [fleet, setFleet] = useState([]);
  const [selected, setSelected] = useState(null);

  async function loadFleet() {
    const { data, error } = await supabase
      .from("fleet_live")
      .select("*")
      .order("fleet_number");

    if (!error) {
      setFleet(data || []);
    }
  }

  useEffect(() => {
    loadFleet();

    const interval = setInterval(
      loadFleet,
      60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fleet-layout">
      <section className="panel fleet-map">
        <div className="map-placeholder">
          <div>
            <strong>Fleet Map</strong>
            <span>
              Custom Roblox map will be placed here.
            </span>
          </div>
        </div>
      </section>

      <section className="panel fleet-list">
        <PanelTitle
          title={`Fleet (${fleet.length})`}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fleet</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Speed</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {fleet.map((bus) => (
                <tr
                  key={bus.fleet_number}
                  onClick={() => setSelected(bus)}
                  className="clickable"
                >
                  <td>{bus.fleet_number}</td>
                  <td>
                    {bus.driver_name || "—"}
                  </td>
                  <td>
                    {bus.route_name || "—"}
                  </td>
                  <td>
                    {Number(bus.speed || 0).toFixed(0)} MPH
                  </td>
                  <td>
                    <StatusBadge
                      status={bus.effective_status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="selection-card">
            <PanelTitle
              title={`Bus ${selected.fleet_number}`}
            />

            <div className="detail-grid">
              <Detail
                label="Driver"
                value={selected.driver_name || "—"}
              />

              <Detail
                label="Route"
                value={selected.route_name || "—"}
              />

              <Detail
                label="Speed"
                value={`${Number(
                  selected.speed || 0
                ).toFixed(0)} MPH`}
              />

              <Detail
                label="RPM"
                value={selected.rpm ?? "—"}
              />

              <Detail
                label="Coolant"
                value={
                  selected.coolant_temp != null
                    ? `${selected.coolant_temp}°F`
                    : "—"
                }
              />

              <Detail
                label="Oil"
                value={
                  selected.oil_temp != null
                    ? `${selected.oil_temp}°F`
                    : "—"
                }
              />

              <Detail
                label="Last Ping"
                value={formatDate(
                  selected.last_ping
                )}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("*")
      .order("fleet_number")
      .then(({ data }) => setVehicles(data || []));
  }, []);

  const filtered = vehicles.filter((bus) =>
    [
      bus.fleet_number,
      bus.make,
      bus.model,
      bus.garage,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="panel">
      <PanelTitle title="Vehicles">
        <input
          className="search"
          placeholder="Search fleet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PanelTitle>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fleet #</th>
              <th>Year</th>
              <th>Make</th>
              <th>Model</th>
              <th>Engine</th>
              <th>Mileage</th>
              <th>Status</th>
              <th>Garage</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((bus) => (
              <tr key={bus.fleet_number}>
                <td>{bus.fleet_number}</td>
                <td>{bus.year ?? "—"}</td>
                <td>{bus.make ?? "—"}</td>
                <td>{bus.model ?? "—"}</td>
                <td>{bus.engine ?? "—"}</td>
                <td>{bus.mileage ?? "—"}</td>
                <td>
                  <StatusBadge status={bus.status} />
                </td>
                <td>{bus.garage ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Drivers() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    supabase
      .from("drivers")
      .select("*")
      .order("name")
      .then(({ data }) => setDrivers(data || []));
  }, []);

  return (
    <section className="panel">
      <PanelTitle title="Drivers" />

      <SimpleTable
        columns={[
          "Name",
          "Roblox User ID",
          "Employee #",
          "Status",
        ]}
        rows={drivers.map((driver) => [
          driver.name,
          driver.roblox_user_id ?? "—",
          driver.employee_number ?? "—",
          driver.status,
        ])}
      />
    </section>
  );
}

function Assignments() {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    supabase
      .from("assignments")
      .select(`
        *,
        vehicles(fleet_number),
        drivers(name),
        routes(name)
      `)
      .eq("status", "ACTIVE")
      .order("started_at", { ascending: false })
      .then(({ data }) => setAssignments(data || []));
  }, []);

  return (
    <section className="panel">
      <PanelTitle title="Active Assignments" />

      <SimpleTable
        columns={[
          "Vehicle",
          "Driver",
          "Route",
          "Status",
          "Started",
        ]}
        rows={assignments.map((item) => [
          item.vehicles?.fleet_number ?? "—",
          item.drivers?.name ?? "—",
          item.routes?.name ?? "—",
          item.status,
          formatDate(item.started_at),
        ])}
      />
    </section>
  );
}

function Maintenance() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    supabase
      .from("maintenance_records")
      .select(`
        *,
        vehicles(fleet_number)
      `)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRecords(data || []));
  }, []);

  return (
    <section className="panel">
      <PanelTitle title="Maintenance" />

      <SimpleTable
        columns={[
          "Vehicle",
          "Type",
          "Description",
          "Mileage",
          "Status",
          "Due",
        ]}
        rows={records.map((item) => [
          item.vehicles?.fleet_number ?? "—",
          item.maintenance_type,
          item.description ?? "—",
          item.mileage ?? "—",
          item.status,
          formatDate(item.due_at),
        ])}
      />
    </section>
  );
}

function Audits() {
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    supabase
      .from("audits")
      .select(`
        *,
        vehicles(fleet_number),
        drivers(name)
      `)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAudits(data || []));
  }, []);

  return (
    <section className="panel">
      <PanelTitle title="Audits" />

      <SimpleTable
        columns={[
          "Vehicle",
          "Driver",
          "Type",
          "Result",
          "Completed",
        ]}
        rows={audits.map((item) => [
          item.vehicles?.fleet_number ?? "—",
          item.drivers?.name ?? "—",
          item.audit_type,
          item.result,
          formatDate(item.completed_at),
        ])}
      />
    </section>
  );
}

function Routes() {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    supabase
      .from("routes")
      .select("*")
      .order("name")
      .then(({ data }) => setRoutes(data || []));
  }, []);

  return (
    <section className="panel">
      <PanelTitle title="Routes" />

      <SimpleTable
        columns={["Name", "Description", "Status"]}
        rows={routes.map((route) => [
          route.name,
          route.description ?? "—",
          route.status,
        ])}
      />
    </section>
  );
}

function Settings() {
  return (
    <section className="panel">
      <PanelTitle title="Settings" />

      <div className="settings-item">
        <strong>Fleet tracking interval</strong>
        <span>60 seconds</span>
      </div>

      <div className="settings-item">
        <strong>Telemetry source</strong>
        <span>Roblox</span>
      </div>

      <div className="settings-item">
        <strong>Map type</strong>
        <span>Custom Roblox map</span>
      </div>
    </section>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelTitle({ title, children }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`status status-${String(status)
      .toLowerCase()
      .replaceAll("_", "-")}`}>
      {status || "UNKNOWN"}
    </span>
  );
}

function SimpleTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((value, cellIndex) => (
                <td key={cellIndex}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return <div className="empty">No records found.</div>;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

export default App;