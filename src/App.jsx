import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "./lib/supabase";

const pages = [
  "Dashboard",
  "Live Fleet",
  "Vehicles",
  "Drivers",
  "Assignments",
  "Routes",
  "Maintenance",
  "Audits",
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
  const [drivers, setDrivers] = useState([]);
  const [liveFleet, setLiveFleet] = useState([]);
  const [events, setEvents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const [
      vehiclesResult,
      driversResult,
      fleetResult,
      eventsResult,
      maintenanceResult,
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*"),

      supabase
        .from("drivers")
        .select("*"),

      supabase
        .from("fleet_live")
        .select("*"),

      supabase
        .from("vehicle_events")
        .select(`
          *,
          vehicles(fleet_number)
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(8),

      supabase
        .from("maintenance_records")
        .select(`
          *,
          vehicles(fleet_number)
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(8),
    ]);

    const errors = [
      vehiclesResult.error,
      driversResult.error,
      fleetResult.error,
      eventsResult.error,
      maintenanceResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      setError(errors[0].message);
    }

    setVehicles(vehiclesResult.data || []);
    setDrivers(driversResult.data || []);
    setLiveFleet(fleetResult.data || []);
    setEvents(eventsResult.data || []);
    setMaintenance(maintenanceResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      15 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const totalVehicles = vehicles.length;

  const inService = liveFleet.filter(
    (bus) => bus.effective_status === "IN_SERVICE"
  ).length;

  const available = liveFleet.filter(
    (bus) => bus.effective_status === "AVAILABLE"
  ).length;

  const maintenanceCount = vehicles.filter(
    (bus) => bus.status === "MAINTENANCE"
  ).length;

  const offline = liveFleet.filter(
    (bus) => bus.effective_status === "OFFLINE"
  ).length;

  const stale = liveFleet.filter(
    (bus) => bus.effective_status === "STALE"
  ).length;

  const activeDrivers = drivers.filter(
    (driver) => driver.status === "ACTIVE"
  ).length;

  const activeRoutes = new Set(
    liveFleet
      .filter((bus) => bus.route_id)
      .map((bus) => bus.route_id)
  ).size;

  const upcomingMaintenance = maintenance.filter(
    (record) =>
      record.status === "SCHEDULED" ||
      record.status === "IN_PROGRESS"
  );

  return (
    <>
      {error && (
        <div className="error fleet-error">
          Unable to load some dashboard data: {error}
        </div>
      )}

      <div className="stats-grid">
        <Stat
          title="Total Vehicles"
          value={loading ? "—" : totalVehicles}
        />

        <Stat
          title="In Service"
          value={loading ? "—" : inService}
        />

        <Stat
          title="Available"
          value={loading ? "—" : available}
        />

        <Stat
          title="Maintenance"
          value={loading ? "—" : maintenanceCount}
        />
      </div>

      <div className="stats-grid dashboard-secondary-stats">
        <Stat
          title="Active Drivers"
          value={loading ? "—" : activeDrivers}
        />

        <Stat
          title="Active Routes"
          value={loading ? "—" : activeRoutes}
        />

        <Stat
          title="Stale Vehicles"
          value={loading ? "—" : stale}
        />

        <Stat
          title="Offline Vehicles"
          value={loading ? "—" : offline}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-fleet-panel">
          <PanelTitle title="Fleet Status" />

          {liveFleet.length === 0 ? (
            <Empty />
          ) : (
            <div className="dashboard-status-list">
              <div className="dashboard-status-row">
                <div>
                  <strong>In Service</strong>
                  <span>
                    Vehicles currently operating
                  </span>
                </div>

                <strong>{inService}</strong>
              </div>

              <div className="dashboard-status-row">
                <div>
                  <strong>Available</strong>
                  <span>
                    Vehicles not currently operating
                  </span>
                </div>

                <strong>{available}</strong>
              </div>

              <div className="dashboard-status-row">
                <div>
                  <strong>Maintenance</strong>
                  <span>
                    Vehicles marked for maintenance
                  </span>
                </div>

                <strong>{maintenanceCount}</strong>
              </div>

              <div className="dashboard-status-row">
                <div>
                  <strong>Stale</strong>
                  <span>
                    No recent telemetry
                  </span>
                </div>

                <strong>{stale}</strong>
              </div>

              <div className="dashboard-status-row">
                <div>
                  <strong>Offline</strong>
                  <span>
                    No telemetry for more than five minutes
                  </span>
                </div>

                <strong>{offline}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <PanelTitle title="Recent Activity" />

          {events.length === 0 ? (
            <Empty />
          ) : (
            <div className="dashboard-list">
              {events.map((event) => (
                <div
                  className="list-row"
                  key={event.id}
                >
                  <div>
                    <strong>
                      {event.event_type}
                    </strong>

                    <div className="muted">
                      {event.vehicles?.fleet_number
                        ? `Bus ${event.vehicles.fleet_number}`
                        : ""}{" "}
                      {event.description || ""}
                    </div>
                  </div>

                  <div className="muted">
                    {formatDate(event.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel dashboard-maintenance-panel">
        <PanelTitle title="Maintenance Overview" />

        {upcomingMaintenance.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Mileage</th>
                  <th>Due</th>
                </tr>
              </thead>

              <tbody>
                {upcomingMaintenance.map((record) => (
                  <tr key={record.id}>
                    <td>
                      Bus{" "}
                      {record.vehicles?.fleet_number ||
                        "—"}
                    </td>

                    <td>
                      {record.maintenance_type}
                    </td>

                    <td>
                      <StatusBadge
                        status={record.status}
                      />
                    </td>

                    <td>
                      {record.mileage ?? "—"}
                    </td>

                    <td>
                      {formatDate(record.due_at)}
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

function FleetMap({ fleet, selectedFleetNumber, onSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  function robloxToMap(x, z) {
  const imageX =
    (ROBLOX_HALF_SIZE - x) * PIXELS_PER_STUD;

  const imageY =
    (ROBLOX_HALF_SIZE + z) * PIXELS_PER_STUD;

  return [
    imageY,
    imageX,
  ];
}

  useEffect(() => {
  if (!mapRef.current || mapInstanceRef.current) {
    return;
  }

  const map = L.map(mapRef.current, {
    crs: L.CRS.Simple,
    minZoom: -1,
    maxZoom: 4,
    zoomControl: true,
    attributionControl: false,
    maxBoundsViscosity: 1.0,
  });

  const bounds = [
    [0, 0],
    [IMAGE_SIZE, IMAGE_SIZE],
  ];

  L.imageOverlay(
    "/map.png",
    bounds
  ).addTo(map);

  // Start with the entire map visible.
  map.fitBounds(bounds, {
    padding: [0, 0],
  });

  // Prevent dragging the map completely away from view.
  map.setMaxBounds(bounds);

  mapInstanceRef.current = map;

  return () => {
    map.remove();
    mapInstanceRef.current = null;
  };
}, []);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

    const activeFleetNumbers = new Set();

    fleet.forEach((bus) => {
      if (
        bus.x == null ||
        bus.z == null ||
        bus.effective_status === "OFFLINE"
      ) {
        return;
      }

      const fleetNumber = String(bus.fleet_number);

      activeFleetNumbers.add(fleetNumber);

      const position = robloxToMap(
        Number(bus.x),
        Number(bus.z)
      );

      let marker =
        markersRef.current.get(fleetNumber);

      if (!marker) {
        const icon = L.divIcon({
          className: "fleet-bus-marker-wrapper",
          html: `
            <div class="fleet-bus-marker">
              <div class="fleet-bus-arrow"></div>
              <span></span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        marker = L.marker(
          position,
          {
            icon,
          }
        );

        marker.on("click", () => {
          onSelect(bus.fleet_number);
        });

        marker.addTo(map);

        markersRef.current.set(
          fleetNumber,
          marker
        );
      } else {
        marker.setLatLng(position);
      }

      const element = marker.getElement();

      if (element) {
        const markerBody =
          element.querySelector(
            ".fleet-bus-marker"
          );

        const number =
          element.querySelector(
            ".fleet-bus-marker span"
          );

        if (markerBody) {
          markerBody.style.transform = "rotate(0deg)";
        }

        if (number) {
          number.textContent = bus.fleet_number;
          number.style.transform = "rotate(180deg)";
        }

        element.classList.toggle(
          "selected",
          fleetNumber ===
            String(selectedFleetNumber)
        );
      }
    });

    for (const [
      fleetNumber,
      marker,
    ] of markersRef.current) {
      if (
        !activeFleetNumbers.has(
          fleetNumber
        )
      ) {
        marker.remove();
        markersRef.current.delete(
          fleetNumber
        );
      }
    }
  }, [
    fleet,
    selectedFleetNumber,
    onSelect,
  ]);

  return (
    <div
      ref={mapRef}
      className="fleet-leaflet-map"
    />
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

  const interval = setInterval(loadFleet, 15 * 1000);

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  if (!selected) {
    return;
  }

  const updatedBus = fleet.find(
    (bus) =>
      String(bus.fleet_number) ===
      String(selected.fleet_number)
  );

  if (updatedBus) {
    setSelected(updatedBus);
  } else {
    setSelected(null);
  }
}, [fleet]);

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
  <FleetMap
    fleet={fleet}
    selectedFleetNumber={
      selected?.fleet_number
    }
    onSelect={(fleetNumber) => {
      const bus = fleet.find(
        (item) =>
          String(item.fleet_number) ===
          String(fleetNumber)
      );

      setSelected(bus || null);
    }}
  />
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
          onSaved={loadVehicles}
        />
      )}
    </>
  );
}

function VehicleDetails({ vehicle, onClose, onSaved }) {
  const [live, setLive] = useState(null);
const [loadingLive, setLoadingLive] = useState(true);

const [editing, setEditing] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [message, setMessage] = useState("");

const [year, setYear] = useState(vehicle.year ?? "");
const [make, setMake] = useState(vehicle.make ?? "");
const [model, setModel] = useState(vehicle.model ?? "");
const [engine, setEngine] = useState(vehicle.engine ?? "");
const [mileage, setMileage] = useState(vehicle.mileage ?? 0);
const [status, setStatus] = useState(vehicle.status ?? "AVAILABLE");
const [garage, setGarage] = useState(vehicle.garage ?? "");
const [notes, setNotes] = useState(vehicle.notes ?? "");

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
}, [vehicle.fleet_number]);

  async function saveVehicle(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(
      "update_vehicle",
      {
        p_vehicle_id: vehicle.id,
        p_year: year === "" ? null : Number(year),
        p_make: make,
        p_model: model,
        p_engine: engine,
        p_mileage: mileage === "" ? 0 : Number(mileage),
        p_status: status,
        p_garage: garage,
        p_notes: notes,
      }
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await onSaved();

    setMessage("Vehicle updated successfully.");
    setEditing(false);
    setSaving(false);
  }

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

          <div className="vehicle-detail-header-actions">
            {!editing && (
              <button
                className="primary-button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setEditing(true);
                }}
              >
                Edit
              </button>
            )}

            <button
              className="secondary-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
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

        <div className="vehicle-detail-section">
  <h3>Vehicle Information</h3>

  {editing ? (
    <form
      className="assignment-form"
      onSubmit={saveVehicle}
    >
      <label>
        Fleet Number
        <input
          className="filter-select full-width"
          value={vehicle.fleet_number}
          disabled
        />
      </label>

      <label>
        Year
        <input
          className="filter-select full-width"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      <label>
        Make
        <input
          className="filter-select full-width"
          value={make}
          onChange={(e) => setMake(e.target.value)}
        />
      </label>

      <label>
        Model
        <input
          className="filter-select full-width"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </label>

      <label>
        Engine
        <input
          className="filter-select full-width"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
        />
      </label>

      <label>
        Mileage
        <input
          className="filter-select full-width"
          type="number"
          min="0"
          step="1"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
      </label>

      <label>
        Status
        <select
          className="filter-select full-width"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="AVAILABLE">
            AVAILABLE
          </option>

          <option value="ASSIGNED">
            ASSIGNED
          </option>

          <option value="MAINTENANCE">
            MAINTENANCE
          </option>
        </select>
      </label>

      <label>
        Garage
        <input
          className="filter-select full-width"
          value={garage}
          onChange={(e) => setGarage(e.target.value)}
        />
      </label>

      <div className="vehicle-edit-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setYear(vehicle.year ?? "");
            setMake(vehicle.make ?? "");
            setModel(vehicle.model ?? "");
            setEngine(vehicle.engine ?? "");
            setMileage(vehicle.mileage ?? 0);
            setStatus(vehicle.status ?? "AVAILABLE");
            setGarage(vehicle.garage ?? "");
            setNotes(vehicle.notes ?? "");
            setError("");
            setMessage("");
            setEditing(false);
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-button"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  ) : (
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
        value={vehicle.status ?? "—"}
      />
    </div>
  )}
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
    .select(`
      *,
      vehicles:current_vehicle_id (
        fleet_number
      ),
      routes:current_route_id (
        name
      )
    `)
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

  const interval = setInterval(
    loadDrivers,
    15 * 1000
  );

  return () => clearInterval(interval);
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
  "ACTIVE",
  "ONLINE",
  "OFFLINE",
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
    <th>Status</th>
    <th>Current Vehicle</th>
    <th>Current Route</th>
    <th>Employee #</th>
    <th>Roblox User ID</th>
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

      <td>
        <StatusBadge status={driver.status} />
      </td>

      <td>
        {driver.vehicles?.fleet_number
          ? `Bus ${driver.vehicles.fleet_number}`
          : "—"}
      </td>

      <td>
        {driver.routes?.name || "—"}
      </td>

      <td>
        {driver.employee_number ?? "—"}
      </td>

      <td>
        {driver.roblox_user_id ?? "—"}
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
      15 * 1000
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
              label="Status"
              value={driver.status}
            />

            <Detail
              label="Roblox User ID"
              value={driver.roblox_user_id ?? "—"}
            />

            <Detail
              label="Employee Number"
              value={driver.employee_number ?? "—"}
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
    label="Server"
    value={currentBus.server_id || "—"}
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
  {driver.status === "ONLINE"
    ? "This driver is currently online but is not operating a bus."
    : driver.status === "OFFLINE"
      ? "This driver is currently offline."
      : "This driver is not currently operating a tracked bus."}
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
  const [endingId, setEndingId] = useState(null);

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
    } else if (vehiclesResult.error) {
      setError(vehiclesResult.error.message);
    } else if (driversResult.error) {
      setError(driversResult.error.message);
    } else if (routesResult.error) {
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

  async function endAssignment(assignment) {
    const fleetNumber =
      assignment.vehicles?.fleet_number;

    if (!fleetNumber) {
      setError("Unable to determine vehicle fleet number.");
      return;
    }

    const confirmed = window.confirm(
      `End the assignment for Bus ${fleetNumber}?`
    );

    if (!confirmed) {
      return;
    }

    setEndingId(assignment.id);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(
      "end_vehicle_assignment",
      {
        p_fleet_number: fleetNumber,
      }
    );

    if (error) {
      setError(error.message);
      setEndingId(null);
      return;
    }

    setMessage(
      `Assignment for Bus ${fleetNumber} ended.`
    );

    await loadData();

    setEndingId(null);
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

                {vehicles
                  .filter(
                    (vehicle) =>
                      vehicle.status !== "MAINTENANCE"
                  )
                  .map((vehicle) => (
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
                  <th>Actions</th>
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
                      {item.drivers?.name ||
                        "Unassigned"}
                    </td>

                    <td>
                      {item.routes?.name ||
                        "No route"}
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
                      <button
                        className="secondary-button"
                        onClick={() =>
                          endAssignment(item)
                        }
                        disabled={
                          endingId === item.id
                        }
                      >
                        {endingId === item.id
                          ? "Ending..."
                          : "End Assignment"}
                      </button>
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
                      {item.drivers?.name ||
                        "Unassigned"}
                    </td>

                    <td>
                      {item.routes?.name ||
                        "No route"}
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

function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [description, setDescription] = useState("");
  const [mileage, setMileage] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [performedAt, setPerformedAt] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [recordsResult, vehiclesResult] =
      await Promise.all([
        supabase
          .from("maintenance_records")
          .select(`
            *,
            vehicles(fleet_number)
          `)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("vehicles")
          .select("*")
          .order("fleet_number"),
      ]);

    if (recordsResult.error) {
      setError(recordsResult.error.message);
    }

    if (vehiclesResult.error) {
      setError(vehiclesResult.error.message);
    }

    setRecords(recordsResult.data || []);
    setVehicles(vehiclesResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setVehicleId("");
    setMaintenanceType("");
    setDescription("");
    setMileage("");
    setPerformedBy("");
    setCost("");
    setStatus("SCHEDULED");
    setPerformedAt("");
    setDueAt("");
  }

  async function createMaintenance(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    if (!vehicleId) {
      setError("Select a vehicle.");
      setSaving(false);
      return;
    }

    if (!maintenanceType.trim()) {
      setError("Enter a maintenance type.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("maintenance_records")
      .insert({
        vehicle_id: vehicleId,
        maintenance_type: maintenanceType.trim(),
        description: description.trim() || null,
        mileage:
          mileage === "" ? null : Number(mileage),
        performed_by:
          performedBy.trim() || null,
        cost:
          cost === "" ? 0 : Number(cost),
        status,
        performed_at:
          performedAt || null,
        due_at:
          dueAt || null,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage("Maintenance record created.");
    resetForm();
    setShowForm(false);

    await loadData();

    setSaving(false);
  }

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
          + New Maintenance Record
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
          <PanelTitle title="New Maintenance Record" />

          <form
            className="maintenance-form"
            onSubmit={createMaintenance}
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
              Maintenance Type
              <input
                className="form-input"
                value={maintenanceType}
                onChange={(e) =>
                  setMaintenanceType(e.target.value)
                }
                placeholder="Oil change"
                required
              />
            </label>

            <label>
              Status
              <select
                className="filter-select full-width"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              >
                <option value="SCHEDULED">
                  Scheduled
                </option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="COMPLETED">
                  Completed
                </option>
                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </label>

            <label>
              Mileage
              <input
                className="form-input"
                type="number"
                value={mileage}
                onChange={(e) =>
                  setMileage(e.target.value)
                }
                placeholder="128442"
              />
            </label>

            <label>
              Performed By
              <input
                className="form-input"
                value={performedBy}
                onChange={(e) =>
                  setPerformedBy(e.target.value)
                }
                placeholder="Technician"
              />
            </label>

            <label>
              Cost
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) =>
                  setCost(e.target.value)
                }
                placeholder="0.00"
              />
            </label>

            <label>
              Performed At
              <input
                className="form-input"
                type="datetime-local"
                value={performedAt}
                onChange={(e) =>
                  setPerformedAt(e.target.value)
                }
              />
            </label>

            <label>
              Due At
              <input
                className="form-input"
                type="datetime-local"
                value={dueAt}
                onChange={(e) =>
                  setDueAt(e.target.value)
                }
              />
            </label>

            <label className="full-width-label">
              Description
              <textarea
                className="form-input form-textarea"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Describe the work performed or scheduled."
              />
            </label>

            <div className="assignment-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button assignment-save"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Create Record"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <PanelTitle title="Maintenance Records" />

        {records.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Mileage</th>
                  <th>Status</th>
                  <th>Performed</th>
                  <th>Due</th>
                  <th>Cost</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      Bus{" "}
                      {record.vehicles?.fleet_number ||
                        "—"}
                    </td>

                    <td>
                      {record.maintenance_type}
                    </td>

                    <td>
                      {record.description || "—"}
                    </td>

                    <td>
                      {record.mileage ?? "—"}
                    </td>

                    <td>
                      <StatusBadge
                        status={record.status}
                      />
                    </td>

                    <td>
                      {formatDate(
                        record.performed_at
                      )}
                    </td>

                    <td>
                      {formatDate(record.due_at)}
                    </td>

                    <td>
                      {record.cost != null
                        ? `$${Number(
                            record.cost
                          ).toFixed(2)}`
                        : "—"}
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

function Audits() {
  const [audits, setAudits] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [auditType, setAuditType] = useState("DAILY");
  const [result, setResult] = useState("PENDING");
  const [notes, setNotes] = useState("");

  const [checklist, setChecklist] = useState({
    // Exterior lighting
    headlights: false,
    highBeams: false,
    markerLights: false,
    clearanceLights: false,
    brakeLights: false,
    turnSignals: false,
    fourWayFlashers: false,
    reverseLights: false,
    licensePlate: false,

    // School bus warning equipment
    amberWarningLights: false,
    redWarningLights: false,
    stopArm: false,
    stopArmLights: false,
    crossingGate: false,

    // Visibility
    outsideMirrors: false,
    crossoverMirror: false,
    windshield: false,
    wipers: false,
    washerFluid: false,
    defroster: false,

    // Body and emergency exits
    bodyPanels: false,
    doors: false,
    emergencyDoor: false,
    emergencyWindows: false,
    roofHatches: false,
    fuelDoor: false,

    // Tires and wheels
    frontTires: false,
    rearTires: false,
    tireCondition: false,
    wheelLugNuts: false,
    wheels: false,

    // Brakes and steering
    serviceBrakes: false,
    parkingBrake: false,
    steering: false,

    // Engine and fluids
    engineOil: false,
    coolant: false,
    transmissionFluid: false,
    fuelSystem: false,
    beltsHoses: false,
    exhaustSystem: false,

    // Interior
    seats: false,
    seatBelts: false,
    aisle: false,
    floor: false,
    interiorLighting: false,
    handrails: false,

    // Safety equipment
    fireExtinguisher: false,
    firstAidKit: false,
    emergencyReflectors: false,
    emergencyExits: false,
    emergencyExitAlarms: false,

    // Driver controls and instruments
    gauges: false,
    horn: false,
    interiorMirrors: false,
    parkingBrakeIndicator: false,
    warningIndicators: false,

    // HVAC
    heater: false,
    defrosterFan: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const checklistSections = [
    {
      title: "Exterior Lighting",
      items: [
        ["headlights", "Headlights"],
        ["highBeams", "High beams"],
        ["markerLights", "Marker lights"],
        ["clearanceLights", "Clearance lights"],
        ["brakeLights", "Brake lights"],
        ["turnSignals", "Turn signals"],
        ["fourWayFlashers", "Four-way flashers"],
        ["reverseLights", "Reverse lights"],
        ["licensePlate", "License plate"],
      ],
    },
    {
      title: "School Bus Warning Equipment",
      items: [
        ["amberWarningLights", "Amber warning lights"],
        ["redWarningLights", "Red warning lights"],
        ["stopArm", "Stop arm"],
        ["stopArmLights", "Stop-arm lights"],
        ["crossingGate", "Crossing gate"],
      ],
    },
    {
      title: "Visibility",
      items: [
        ["outsideMirrors", "Outside mirrors"],
        ["crossoverMirror", "Crossover mirror"],
        ["windshield", "Windshield"],
        ["wipers", "Windshield wipers"],
        ["washerFluid", "Windshield washer fluid"],
        ["defroster", "Defroster"],
      ],
    },
    {
      title: "Body & Emergency Exits",
      items: [
        ["bodyPanels", "Body panels"],
        ["doors", "Service door"],
        ["emergencyDoor", "Emergency door"],
        ["emergencyWindows", "Emergency windows"],
        ["roofHatches", "Roof hatches"],
        ["fuelDoor", "Fuel door"],
      ],
    },
    {
      title: "Tires & Wheels",
      items: [
        ["frontTires", "Front tires"],
        ["rearTires", "Rear tires"],
        ["tireCondition", "Overall tire condition"],
        ["wheelLugNuts", "Wheel lug nuts"],
        ["wheels", "Wheels / rims"],
      ],
    },
    {
      title: "Brakes & Steering",
      items: [
        ["serviceBrakes", "Service brakes"],
        ["parkingBrake", "Parking brake"],
        ["steering", "Steering"],
      ],
    },
    {
      title: "Engine & Fluids",
      items: [
        ["engineOil", "Engine oil"],
        ["coolant", "Engine coolant"],
        ["transmissionFluid", "Transmission fluid"],
        ["fuelSystem", "Fuel system"],
        ["beltsHoses", "Belts and hoses"],
        ["exhaustSystem", "Exhaust system"],
      ],
    },
    {
      title: "Interior",
      items: [
        ["seats", "Passenger seats"],
        ["seatBelts", "Seat belts"],
        ["aisle", "Aisle clear"],
        ["floor", "Floor condition"],
        ["interiorLighting", "Interior lighting"],
        ["handrails", "Handrails"],
      ],
    },
    {
      title: "Safety Equipment",
      items: [
        ["fireExtinguisher", "Fire extinguisher"],
        ["firstAidKit", "First-aid kit"],
        ["emergencyReflectors", "Emergency reflectors"],
        ["emergencyExits", "Emergency exits"],
        ["emergencyExitAlarms", "Emergency-exit alarms"],
      ],
    },
    {
      title: "Driver Controls & Instruments",
      items: [
        ["gauges", "Gauges / instruments"],
        ["horn", "Horn"],
        ["interiorMirrors", "Interior mirrors"],
        ["parkingBrakeIndicator", "Parking-brake indicator"],
        ["warningIndicators", "Warning indicators"],
      ],
    },
    {
      title: "HVAC",
      items: [
        ["heater", "Heater"],
        ["defrosterFan", "Defroster fan"],
      ],
    },
  ];

  async function loadData() {
    setLoading(true);
    setError("");

    const [
      auditsResult,
      vehiclesResult,
      driversResult,
    ] = await Promise.all([
      supabase
        .from("audits")
        .select(`
          *,
          vehicles(fleet_number),
          drivers(name)
        `)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("vehicles")
        .select("*")
        .order("fleet_number"),

      supabase
        .from("drivers")
        .select("*")
        .order("name"),
    ]);

    if (auditsResult.error) {
      setError(auditsResult.error.message);
    }

    if (vehiclesResult.error) {
      setError(vehiclesResult.error.message);
    }

    if (driversResult.error) {
      setError(driversResult.error.message);
    }

    setAudits(auditsResult.data || []);
    setVehicles(vehiclesResult.data || []);
    setDrivers(driversResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setVehicleId("");
    setDriverId("");
    setAuditType("DAILY");
    setResult("PENDING");
    setNotes("");

    setChecklist({
      headlights: false,
      highBeams: false,
      markerLights: false,
      clearanceLights: false,
      brakeLights: false,
      turnSignals: false,
      fourWayFlashers: false,
      reverseLights: false,
      licensePlate: false,

      amberWarningLights: false,
      redWarningLights: false,
      stopArm: false,
      stopArmLights: false,
      crossingGate: false,

      outsideMirrors: false,
      crossoverMirror: false,
      windshield: false,
      wipers: false,
      washerFluid: false,
      defroster: false,

      bodyPanels: false,
      doors: false,
      emergencyDoor: false,
      emergencyWindows: false,
      roofHatches: false,
      fuelDoor: false,

      frontTires: false,
      rearTires: false,
      tireCondition: false,
      wheelLugNuts: false,
      wheels: false,

      serviceBrakes: false,
      parkingBrake: false,
      steering: false,

      engineOil: false,
      coolant: false,
      transmissionFluid: false,
      fuelSystem: false,
      beltsHoses: false,
      exhaustSystem: false,

      seats: false,
      seatBelts: false,
      aisle: false,
      floor: false,
      interiorLighting: false,
      handrails: false,

      fireExtinguisher: false,
      firstAidKit: false,
      emergencyReflectors: false,
      emergencyExits: false,
      emergencyExitAlarms: false,

      gauges: false,
      horn: false,
      interiorMirrors: false,
      parkingBrakeIndicator: false,
      warningIndicators: false,

      heater: false,
      defrosterFan: false,
    });
  }

  function toggleChecklistItem(item) {
    setChecklist((current) => ({
      ...current,
      [item]: !current[item],
    }));
  }

  async function createAudit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    if (!vehicleId) {
      setError("Select a vehicle.");
      setSaving(false);
      return;
    }

    const completedAt =
      result === "PENDING"
        ? null
        : new Date().toISOString();

    const { error } = await supabase
      .from("audits")
      .insert({
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        audit_type: auditType,
        result,
        checklist,
        notes: notes.trim() || null,
        completed_at: completedAt,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage("Audit created.");
    resetForm();
    setShowForm(false);

    await loadData();

    setSaving(false);
  }

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
          + New Audit
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
        <section className="panel audit-form-panel">
          <PanelTitle title="New Vehicle Audit" />

          <form
            className="audit-form"
            onSubmit={createAudit}
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
              Audit Type
              <select
                className="filter-select full-width"
                value={auditType}
                onChange={(e) =>
                  setAuditType(e.target.value)
                }
              >
                <option value="DAILY">Daily</option>
                <option value="PRE_TRIP">Pre-Trip</option>
                <option value="POST_TRIP">Post-Trip</option>
                <option value="ANNUAL">Annual</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              Result
              <select
                className="filter-select full-width"
                value={result}
                onChange={(e) =>
                  setResult(e.target.value)
                }
              >
                <option value="PENDING">
                  Pending
                </option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
              </select>
            </label>

            <div className="audit-checklist">
              {checklistSections.map((section) => (
                <div
                  className="audit-checklist-section"
                  key={section.title}
                >
                  <div className="audit-checklist-title">
                    {section.title}
                  </div>

                  <div className="audit-checklist-items">
                    {section.items.map(
                      ([key, label]) => (
                        <label
                          className="check-item"
                          key={key}
                        >
                          <input
                            type="checkbox"
                            checked={checklist[key]}
                            onChange={() =>
                              toggleChecklistItem(
                                key
                              )
                            }
                          />

                          {label}
                        </label>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            <label className="full-width-label">
              Notes
              <textarea
                className="form-input form-textarea"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                placeholder="Additional inspection notes..."
              />
            </label>

            <div className="assignment-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button assignment-save"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Create Audit"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <PanelTitle title="Audit History" />

        {audits.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Completed</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id}>
                    <td>
                      Bus{" "}
                      {audit.vehicles?.fleet_number ||
                        "—"}
                    </td>

                    <td>
                      {audit.drivers?.name || "—"}
                    </td>

                    <td>{audit.audit_type}</td>

                    <td>
                      <StatusBadge
                        status={audit.result}
                      />
                    </td>

                    <td>
                      {formatDate(
                        audit.completed_at
                      )}
                    </td>

                    <td>
                      {audit.notes || "—"}
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

function Settings() {
  return (
    <section className="panel">
      <PanelTitle title="Settings" />

      <div className="settings-item">
        <strong>Fleet tracking interval</strong>
        <span>15 seconds</span>
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