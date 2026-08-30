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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFleet() {
    const { data, error } = await supabase
      .from("fleet_live")
      .select("*")
      .order("fleet_number");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const sortedFleet = (data || []).sort((a, b) => {
    const garageOrder = {
      CLIO: 0,
      MAPLECREST: 1,
    };

    const aGarage =
      garageOrder[String(a.garage || "").toUpperCase()] ?? 999;

    const bGarage =
      garageOrder[String(b.garage || "").toUpperCase()] ?? 999;

    // Garage first
    if (aGarage !== bGarage) {
      return aGarage - bGarage;
    }

    // Oldest buses first
    const aYear = Number(a.year) || 9999;
    const bYear = Number(b.year) || 9999;

    if (aYear !== bYear) {
      return aYear - bYear;
    }

    // Same year: lowest fleet number first
    return String(a.fleet_number).localeCompare(
      String(b.fleet_number),
      undefined,
      { numeric: true }
    );
  });

    setFleet(sortedFleet);
    setLastRefresh(new Date());
    setLoading(false);
    setError("");
  }

  useEffect(() => {
    loadFleet();

    const interval = setInterval(loadFleet, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredFleet = fleet.filter((bus) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      String(bus.fleet_number)
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.driver_name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.route_name || "")
        .toLowerCase()
        .includes(searchValue);

    const matchesStatus =
      statusFilter === "ALL" ||
      bus.effective_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    ALL: fleet.length,
    IN_SERVICE: fleet.filter(
      (bus) => bus.effective_status === "IN_SERVICE"
    ).length,
    AVAILABLE: fleet.filter(
      (bus) => bus.effective_status === "AVAILABLE"
    ).length,
    STALE: fleet.filter(
      (bus) => bus.effective_status === "STALE"
    ).length,
    OFFLINE: fleet.filter(
      (bus) => bus.effective_status === "OFFLINE"
    ).length,
    MAINTENANCE: fleet.filter(
      (bus) => bus.effective_status === "MAINTENANCE"
    ).length,
  };

  return (
    <>
      <div className="fleet-toolbar">
        <div className="fleet-status-summary">
          <button
            className={
              statusFilter === "ALL"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("ALL")}
          >
            All <span>{statusCounts.ALL}</span>
          </button>

          <button
            className={
              statusFilter === "IN_SERVICE"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("IN_SERVICE")}
          >
            In Service <span>{statusCounts.IN_SERVICE}</span>
          </button>

          <button
            className={
              statusFilter === "AVAILABLE"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("AVAILABLE")}
          >
            Available <span>{statusCounts.AVAILABLE}</span>
          </button>

          <button
            className={
              statusFilter === "STALE"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("STALE")}
          >
            Stale <span>{statusCounts.STALE}</span>
          </button>

          <button
            className={
              statusFilter === "OFFLINE"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("OFFLINE")}
          >
            Offline <span>{statusCounts.OFFLINE}</span>
          </button>

          <button
            className={
              statusFilter === "MAINTENANCE"
                ? "fleet-filter active"
                : "fleet-filter"
            }
            onClick={() => setStatusFilter("MAINTENANCE")}
          >
            Maintenance <span>{statusCounts.MAINTENANCE}</span>
          </button>
        </div>

        <div className="fleet-actions">
          <input
            className="search"
            placeholder="Search fleet, driver, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="secondary-button"
            onClick={loadFleet}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error fleet-error">
          Unable to load fleet: {error}
        </div>
      )}

      <div className="fleet-meta">
        <span>
          {filteredFleet.length} of {fleet.length} vehicles shown
        </span>

        <span>
          Last refresh:{" "}
          {lastRefresh
            ? lastRefresh.toLocaleTimeString()
            : "Never"}
        </span>
      </div>

      <div className="fleet-layout">
        <section className="panel fleet-map">
          <div className="map-placeholder">
            <div>
              <strong>Fleet Map</strong>
              <span>
                Custom Roblox map will be placed here.
              </span>
              <small>
                Live vehicle positions are already being received.
              </small>
            </div>
          </div>
        </section>

        <section className="panel fleet-list">
          <PanelTitle title="Fleet" />

          {filteredFleet.length === 0 ? (
            <Empty />
          ) : (
            <div className="fleet-vehicle-list">
              {filteredFleet.map((bus) => (
                <button
                  key={bus.fleet_number}
                  className={
                    selected?.fleet_number === bus.fleet_number
                      ? "fleet-vehicle selected"
                      : "fleet-vehicle"
                  }
                  onClick={() => setSelected(bus)}
                >
                  <div className="fleet-vehicle-main">
                    <strong>
                      Bus {bus.fleet_number}
                    </strong>

                    <span>
                      {bus.driver_name || "Unassigned"}
                    </span>
                  </div>

                  <div className="fleet-vehicle-secondary">
                    <span>
                      {bus.route_name || "No route"}
                    </span>

                    <StatusBadge
                      status={bus.effective_status}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="selection-card">
              <PanelTitle
                title={`Bus ${selected.fleet_number}`}
              />

              <div className="detail-grid">
                <Detail
                  label="Status"
                  value={selected.effective_status}
                />

                <Detail
                  label="Driver"
                  value={selected.driver_name || "Unassigned"}
                />

                <Detail
                  label="Route"
                  value={selected.route_name || "No route"}
                />

                <Detail
                  label="Speed"
                  value={`${Number(
                    selected.speed || 0
                  ).toFixed(0)} MPH`}
                />

                <Detail
                  label="RPM"
                  value={
                    selected.rpm != null
                      ? Number(selected.rpm).toFixed(0)
                      : "—"
                  }
                />

                <Detail
                  label="Heading"
                  value={
                    selected.heading != null
                      ? `${Number(selected.heading).toFixed(0)}°`
                      : "—"
                  }
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
                  value={formatDate(selected.last_ping)}
                />

                <Detail
                  label="Position"
                  value={
                    selected.x != null
                      ? `${Number(selected.x).toFixed(1)}, ${Number(
                          selected.y
                        ).toFixed(1)}, ${Number(
                          selected.z
                        ).toFixed(1)}`
                      : "—"
                  }
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [garageFilter, setGarageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadVehicles() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("vehicles")
      .select("*");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const sorted = (data || []).sort((a, b) => {
      const garageOrder = {
        CLIO: 0,
        MAPLECREST: 1,
      };

      const aGarage =
        garageOrder[String(a.garage || "").toUpperCase()] ?? 999;

      const bGarage =
        garageOrder[String(b.garage || "").toUpperCase()] ?? 999;

      if (aGarage !== bGarage) {
        return aGarage - bGarage;
      }

      const aYear = Number(a.year) || 9999;
      const bYear = Number(b.year) || 9999;

      if (aYear !== bYear) {
        return aYear - bYear;
      }

      return String(a.fleet_number).localeCompare(
        String(b.fleet_number),
        undefined,
        { numeric: true }
      );
    });

    setVehicles(sorted);
    setLoading(false);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((bus) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      String(bus.fleet_number)
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.make || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.model || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.engine || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(bus.garage || "")
        .toLowerCase()
        .includes(searchValue);

    const matchesGarage =
      garageFilter === "ALL" ||
      String(bus.garage || "").toUpperCase() === garageFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      bus.status === statusFilter;

    return (
      matchesSearch &&
      matchesGarage &&
      matchesStatus
    );
  });

  const garages = [
    "ALL",
    ...Array.from(
      new Set(
        vehicles
          .map((bus) =>
            String(bus.garage || "").toUpperCase()
          )
          .filter(Boolean)
      )
    ),
  ];

  const statuses = [
    "ALL",
    ...Array.from(
      new Set(
        vehicles
          .map((bus) => bus.status)
          .filter(Boolean)
      )
    ),
  ];

  return (
    <>
      <div className="vehicle-toolbar">
        <input
          className="search"
          placeholder="Search fleet, make, model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={garageFilter}
          onChange={(e) => setGarageFilter(e.target.value)}
        >
          {garages.map((garage) => (
            <option key={garage} value={garage}>
              {garage === "ALL"
                ? "All Garages"
                : garage}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === "ALL"
                ? "All Statuses"
                : status}
            </option>
          ))}
        </select>

        <button
          className="secondary-button"
          onClick={loadVehicles}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="fleet-meta">
        <span>
          {filteredVehicles.length} of{" "}
          {vehicles.length} vehicles shown
        </span>
      </div>

      {error && (
        <div className="error fleet-error">
          Unable to load vehicles: {error}
        </div>
      )}

      <section className="panel">
        <PanelTitle title="Vehicle Fleet" />

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
              {filteredVehicles.map((bus) => (
                <tr
                  key={bus.fleet_number}
                  className="clickable"
                  onClick={() => setSelected(bus)}
                >
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

        {filteredVehicles.length === 0 && !loading && (
          <Empty />
        )}
      </section>

      {selected && (
        <VehicleDetails
          vehicle={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function VehicleDetails({ vehicle, onClose }) {
  const [live, setLive] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);

  async function loadLive() {
    setLoadingLive(true);

    const { data } = await supabase
      .from("fleet_live")
      .select("*")
      .eq("fleet_number", vehicle.fleet_number)
      .maybeSingle();

    setLive(data || null);
    setLoadingLive(false);
  }

  useEffect(() => {
    loadLive();

    const interval = setInterval(
      loadLive,
      60 * 1000
    );

    return () => clearInterval(interval);
  }, [vehicle.fleet_number]);

  return (
    <div className="vehicle-detail-overlay">
      <div className="vehicle-detail">
        <div className="vehicle-detail-header">
          <div>
            <div className="eyebrow">
              VEHICLE DETAILS
            </div>

            <h2>Bus {vehicle.fleet_number}</h2>
          </div>

          <button
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="vehicle-detail-section">
          <h3>Vehicle Information</h3>

          <div className="detail-grid">
            <Detail
              label="Fleet Number"
              value={vehicle.fleet_number}
            />

            <Detail
              label="Year"
              value={vehicle.year ?? "—"}
            />

            <Detail
              label="Make"
              value={vehicle.make ?? "—"}
            />

            <Detail
              label="Model"
              value={vehicle.model ?? "—"}
            />

            <Detail
              label="Engine"
              value={vehicle.engine ?? "—"}
            />

            <Detail
              label="Mileage"
              value={vehicle.mileage ?? "—"}
            />

            <Detail
              label="Garage"
              value={vehicle.garage ?? "—"}
            />

            <Detail
              label="Fleet Status"
              value={vehicle.status}
            />
          </div>
        </div>

        <div className="vehicle-detail-section">
          <h3>Current Operation</h3>

          {loadingLive ? (
            <div className="empty">
              Loading live information...
            </div>
          ) : live ? (
            <div className="detail-grid">
              <Detail
                label="Live Status"
                value={live.effective_status}
              />

              <Detail
                label="Driver"
                value={
                  live.driver_name || "Unassigned"
                }
              />

              <Detail
                label="Route"
                value={
                  live.route_name || "No route"
                }
              />

              <Detail
                label="Speed"
                value={`${Number(
                  live.speed || 0
                ).toFixed(0)} MPH`}
              />

              <Detail
                label="RPM"
                value={
                  live.rpm != null
                    ? Number(live.rpm).toFixed(0)
                    : "—"
                }
              />

              <Detail
                label="Heading"
                value={
                  live.heading != null
                    ? `${Number(
                        live.heading
                      ).toFixed(0)}°`
                    : "—"
                }
              />

              <Detail
                label="Coolant"
                value={
                  live.coolant_temp != null
                    ? `${live.coolant_temp}°F`
                    : "—"
                }
              />

              <Detail
                label="Oil"
                value={
                  live.oil_temp != null
                    ? `${live.oil_temp}°F`
                    : "—"
                }
              />

              <Detail
                label="Last Ping"
                value={formatDate(live.last_ping)}
              />

              <Detail
                label="Server"
                value={live.server_id || "—"}
              />
            </div>
          ) : (
            <div className="empty">
              No live telemetry available.
            </div>
          )}
        </div>

        <div className="vehicle-detail-section">
          <h3>Notes</h3>

          <div className="notes-box">
            {vehicle.notes || "No notes recorded."}
          </div>
        </div>
      </div>
    </div>
  );
}

function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  async function loadDrivers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("name");

    if (error) {
      setError(error.message);
      setDrivers([]);
      setLoading(false);
      return;
    }

    setDrivers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredDrivers = drivers.filter((driver) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      String(driver.name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(driver.roblox_user_id || "")
        .includes(searchValue) ||
      String(driver.employee_number || "")
        .toLowerCase()
        .includes(searchValue);

    const matchesStatus =
      statusFilter === "ALL" ||
      driver.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statuses = [
    "ALL",
    ...Array.from(
      new Set(
        drivers
          .map((driver) => driver.status)
          .filter(Boolean)
      )
    ),
  ];

  return (
    <>
      <div className="vehicle-toolbar">
        <input
          className="search"
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All Statuses" : status}
            </option>
          ))}
        </select>

        <button
          className="secondary-button"
          onClick={loadDrivers}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="fleet-meta">
        <span>
          {filteredDrivers.length} of{" "}
          {drivers.length} drivers shown
        </span>
      </div>

      {error && (
        <div className="error fleet-error">
          Unable to load drivers: {error}
        </div>
      )}

      <section className="panel">
        <PanelTitle title="Drivers" />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roblox User ID</th>
                <th>Employee #</th>
                <th>Status</th>
                <th>Current Vehicle</th>
                <th>Current Route</th>
              </tr>
            </thead>

            <tbody>
              {filteredDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="clickable"
                  onClick={() => setSelected(driver)}
                >
                  <td>{driver.name}</td>
                  <td>{driver.roblox_user_id ?? "—"}</td>
                  <td>{driver.employee_number ?? "—"}</td>
                  <td>
                    <StatusBadge status={driver.status} />
                  </td>
                  <td>
                    {driver.current_vehicle_id
                      ? driver.current_vehicle_id
                      : "—"}
                  </td>
                  <td>
                    {driver.current_route_id
                      ? driver.current_route_id
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDrivers.length === 0 && !loading && (
          <Empty />
        )}
      </section>

      {selected && (
        <DriverDetails
          driver={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function DriverDetails({ driver, onClose }) {
  const [liveAssignments, setLiveAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAssignments() {
    setLoading(true);

    const { data } = await supabase
      .from("fleet_live")
      .select("*")
      .eq("driver_id", driver.id);

    setLiveAssignments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAssignments();

    const interval = setInterval(
      loadAssignments,
      60 * 1000
    );

    return () => clearInterval(interval);
  }, [driver.id]);

  const currentBus = liveAssignments[0] || null;

  return (
    <div className="vehicle-detail-overlay">
      <div className="vehicle-detail">
        <div className="vehicle-detail-header">
          <div>
            <div className="eyebrow">
              DRIVER DETAILS
            </div>

            <h2>{driver.name}</h2>
          </div>

          <button
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="vehicle-detail-section">
          <h3>Driver Information</h3>

          <div className="detail-grid">
            <Detail
              label="Name"
              value={driver.name}
            />

            <Detail
              label="Roblox User ID"
              value={driver.roblox_user_id ?? "—"}
            />

            <Detail
              label="Employee Number"
              value={driver.employee_number ?? "—"}
            />

            <Detail
              label="Status"
              value={driver.status}
            />
          </div>
        </div>

        <div className="vehicle-detail-section">
          <h3>Current Operation</h3>

          {loading ? (
            <div className="empty">
              Loading current assignment...
            </div>
          ) : currentBus ? (
            <div className="detail-grid">
              <Detail
                label="Vehicle"
                value={`Bus ${currentBus.fleet_number}`}
              />

              <Detail
                label="Route"
                value={
                  currentBus.route_name || "No route"
                }
              />

              <Detail
                label="Status"
                value={currentBus.effective_status}
              />

              <Detail
                label="Speed"
                value={`${Number(
                  currentBus.speed || 0
                ).toFixed(0)} MPH`}
              />

              <Detail
                label="Last Ping"
                value={formatDate(
                  currentBus.last_ping
                )}
              />
            </div>
          ) : (
            <div className="empty">
              This driver is not currently operating
              a tracked bus.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [routeId, setRouteId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [
      assignmentsResult,
      vehiclesResult,
      driversResult,
      routesResult,
    ] = await Promise.all([
      supabase
        .from("assignments")
        .select(`
          *,
          vehicles(fleet_number),
          drivers(name),
          routes(name)
        `)
        .order("started_at", { ascending: false }),

      supabase
        .from("vehicles")
        .select("*")
        .order("fleet_number"),

      supabase
        .from("drivers")
        .select("*")
        .order("name"),

      supabase
        .from("routes")
        .select("*")
        .eq("status", "ACTIVE")
        .order("name"),
    ]);

    if (assignmentsResult.error) {
      setError(assignmentsResult.error.message);
    }

    if (vehiclesResult.error) {
      setError(vehiclesResult.error.message);
    }

    if (driversResult.error) {
      setError(driversResult.error.message);
    }

    if (routesResult.error) {
      setError(routesResult.error.message);
    }

    setAssignments(assignmentsResult.data || []);
    setVehicles(vehiclesResult.data || []);
    setDrivers(driversResult.data || []);
    setRoutes(routesResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createAssignment(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    if (!vehicleId) {
      setError("Select a vehicle.");
      setSaving(false);
      return;
    }

    const { data: vehicle, error: vehicleError } =
      await supabase
        .from("vehicles")
        .select("fleet_number")
        .eq("id", vehicleId)
        .single();

    if (vehicleError || !vehicle) {
      setError(
        vehicleError?.message ||
          "Unable to find selected vehicle."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase.rpc(
      "assign_vehicle",
      {
        p_fleet_number: vehicle.fleet_number,
        p_driver_id: driverId || null,
        p_route_id: routeId || null,
      }
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage(
      `Bus ${vehicle.fleet_number} assigned successfully.`
    );

    setVehicleId("");
    setDriverId("");
    setRouteId("");
    setShowForm(false);

    await loadData();

    setSaving(false);
  }

  const activeAssignments = assignments.filter(
    (item) => item.status === "ACTIVE"
  );

  const assignmentHistory = assignments.filter(
    (item) => item.status !== "ACTIVE"
  );

  return (
    <>
      <div className="vehicle-toolbar">
        <button
          className="primary-button assignment-button"
          onClick={() => {
            setShowForm(true);
            setError("");
            setMessage("");
          }}
        >
          + New Assignment
        </button>

        <button
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error fleet-error">
          {error}
        </div>
      )}

      {showForm && (
        <section className="panel assignment-form-panel">
          <PanelTitle title="New Assignment" />

          <form
            className="assignment-form"
            onSubmit={createAssignment}
          >
            <label>
              Vehicle
              <select
                className="filter-select full-width"
                value={vehicleId}
                onChange={(e) =>
                  setVehicleId(e.target.value)
                }
                required
              >
                <option value="">
                  Select vehicle...
                </option>

                {vehicles.map((vehicle) => (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                  >
                    Bus {vehicle.fleet_number}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Driver
              <select
                className="filter-select full-width"
                value={driverId}
                onChange={(e) =>
                  setDriverId(e.target.value)
                }
              >
                <option value="">
                  No driver
                </option>

                {drivers.map((driver) => (
                  <option
                    key={driver.id}
                    value={driver.id}
                  >
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Route
              <select
                className="filter-select full-width"
                value={routeId}
                onChange={(e) =>
                  setRouteId(e.target.value)
                }
              >
                <option value="">
                  No route
                </option>

                {routes.map((route) => (
                  <option
                    key={route.id}
                    value={route.id}
                  >
                    {route.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="assignment-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button assignment-save"
                disabled={saving}
              >
                {saving
                  ? "Assigning..."
                  : "Assign Vehicle"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <PanelTitle
          title={`Active Assignments (${activeAssignments.length})`}
        />

        {activeAssignments.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>

              <tbody>
                {activeAssignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      Bus{" "}
                      {item.vehicles?.fleet_number ||
                        "—"}
                    </td>

                    <td>
                      {item.drivers?.name || "Unassigned"}
                    </td>

                    <td>
                      {item.routes?.name || "No route"}
                    </td>

                    <td>
                      <StatusBadge
                        status={item.status}
                      />
                    </td>

                    <td>
                      {formatDate(item.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel assignment-history-panel">
        <PanelTitle title="Assignment History" />

        {assignmentHistory.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>

              <tbody>
                {assignmentHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      Bus{" "}
                      {item.vehicles?.fleet_number ||
                        "—"}
                    </td>

                    <td>
                      {item.drivers?.name || "Unassigned"}
                    </td>

                    <td>
                      {item.routes?.name || "No route"}
                    </td>

                    <td>
                      <StatusBadge
                        status={item.status}
                      />
                    </td>

                    <td>
                      {formatDate(item.started_at)}
                    </td>

                    <td>
                      {formatDate(item.ended_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
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