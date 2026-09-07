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
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => {
    try {
      const savedPreferences = JSON.parse(localStorage.getItem("clino-preferences") || "{}");
      return savedPreferences.defaultSection || localStorage.getItem("clino-page") || "Dashboard";
    } catch {
      return localStorage.getItem("clino-page") || "Dashboard";
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [preferences, setPreferences] = useState(() => {
    const defaults = {
      density: "comfortable",
      telemetryInterval: 15,
      showOffline: true,
      showStale: true,
      defaultSection: "Dashboard",
      activityCount: 8,
      maintenanceCount: 8,
      autoFollowVehicle: false,
      vehicleLabels: true,
      mapRefresh: 15,
      maintenanceWarnings: true,
      inspectionWarnings: true,
      offlineWarnings: true,
    };

    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem("clino-preferences") || "{}"),
      };
    } catch {
      return defaults;
    }
  });

  const canEdit = role !== "viewer";

  async function loadUserRole(currentSession) {
    if (!currentSession?.user?.id) {
      setRole(null);
      return;
    }

    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", currentSession.user.id).single();

    if (error) {
      console.error("Failed to load user role:", error);
      setRole(null);
      return;
    }

    setRole(data?.role || null);
  }

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(data.session);

      if (data.session) {
        await loadUserRole(data.session);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) {
        return;
      }

      setSession(newSession);

      if (newSession) {
        await loadUserRole(newSession);
      } else {
        setRole(null);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("clino-page", page);
  }, [page]);

  useEffect(() => {
    localStorage.setItem("clino-preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
  }, [preferences.density]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function navigate(nextPage, options = {}) {
    if (options.vehicleId !== undefined) {
      setSelectedVehicleId(options.vehicleId);
    }

    if (options.driverId !== undefined) {
      setSelectedDriverId(options.driverId);
    }

    setPage(nextPage);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openVehicleDetails(vehicleId) {
    setSelectedVehicleId(vehicleId);
    setPage("Vehicle Details");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDriverDetails(driverId) {
    setSelectedDriverId(driverId);
    setPage("Driver Details");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToVehicles() {
    setSelectedVehicleId(null);
    setPage("Vehicles");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToDrivers() {
    setSelectedDriverId(null);
    setPage("Drivers");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setSelectedVehicleId(null);
    setSelectedDriverId(null);
    setMobileNavOpen(false);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-brand">
          <div className="brand-mark">72</div>
          <div className="brand-wordmark">
            <strong>CLINO</strong>
            <span>TRANSPORTATION</span>
          </div>
        </div>

        <div className="loading-status">
          <span className="loading-indicator" />
          <span>Loading fleet operations</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!role) {
    return (
      <div className="loading-screen">
        <div className="system-message">
          <div className="system-message-eyebrow">ACCOUNT ACCESS</div>
          <h1>Unable to load permissions</h1>
          <p>We could not determine the permissions associated with this account.</p>
          <button type="button" className="button button-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
      <Sidebar
        page={page}
        setPage={navigate}
        role={role}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />

      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <main className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="app-page-heading">
              <span className="eyebrow">CLINO TRANSPORTATION / FLEET OPERATIONS</span>
              <h1>{page}</h1>
            </div>
          </div>

          <div className="app-topbar-right">
            <div className="system-status">
              <span className="system-status-dot" />
              <span>System Online</span>
            </div>

            <div className="topbar-account">
              <div className="account-avatar">
                {(session.user?.email || "U").charAt(0).toUpperCase()}
              </div>

              <div className="account-copy">
                <strong>{session.user?.email?.split("@")[0] || "User"}</strong>
                <span>{role}</span>
              </div>
            </div>

            <button type="button" className="button button-secondary topbar-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="app-content">
          {page === "Dashboard" && <Dashboard preferences={preferences} setPage={navigate} />}

          {page === "Live Fleet" && (
            <LiveFleet
              canEdit={canEdit}
              preferences={preferences}
            />
          )}

          {page === "Vehicles" && (
            <Vehicles
              canEdit={canEdit}
              openVehicleDetails={openVehicleDetails}
            />
          )}

          {page === "Vehicle Details" && (
            <VehicleDetails
              canEdit={canEdit}
              vehicleId={selectedVehicleId}
              returnToVehicles={returnToVehicles}
            />
          )}

          {page === "Drivers" && (
            <Drivers
              canEdit={canEdit}
              openDriverDetails={openDriverDetails}
            />
          )}

          {page === "Driver Details" && (
            <DriverDetails
              canEdit={canEdit}
              driverId={selectedDriverId}
              returnToDrivers={returnToDrivers}
            />
          )}

          {page === "Assignments" && <Assignments canEdit={canEdit} />}

          {page === "Routes" && <Routes canEdit={canEdit} />}

          {page === "Route Editor" && <RouteEditor canEdit={canEdit} />}

          {page === "Route Preview" && <RoutePreview />}

          {page === "All Routes Preview" && <AllRoutesPreview />}

          {page === "Maintenance" && <Maintenance canEdit={canEdit} />}

          {page === "Inspections" && <Inspections canEdit={canEdit} />}

          {page === "Settings" && (
            <Settings
              role={role}
              canEdit={canEdit}
              preferences={preferences}
              setPreferences={setPreferences}
              session={session}
              setPage={navigate}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ page, setPage, role, mobileNavOpen, setMobileNavOpen }) {
  const sections = [
    {
      label: "Operations",
      items: ["Dashboard", "Live Fleet"],
    },
    {
      label: "Fleet",
      items: ["Vehicles", "Drivers", "Assignments", "Routes"],
    },
    {
      label: "Service",
      items: ["Maintenance", "Inspections"],
    },
  ];

  function handleNavigation(item) {
    setPage(item);
  }

  return (
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-header">
        <button type="button" className="sidebar-brand" onClick={() => handleNavigation("Dashboard")}>
          <div className="brand-mark">72</div>

          <div className="brand-wordmark">
            <strong>CLINO</strong>
            <span>TRANSPORTATION</span>
          </div>
        </button>

        <button
          type="button"
          className="sidebar-close-button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="sidebar-system">
        <span className="sidebar-system-indicator" />

        <div>
          <strong>Fleet Operations</strong>
          <span>Private system</span>
        </div>
      </div>

      <nav className="sidebar-navigation" aria-label="Primary navigation">
        {sections.map((section) => (
          <section className="sidebar-section" key={section.label}>
            <span className="sidebar-section-label">{section.label}</span>

            <div className="sidebar-section-items">
              {section.items.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`sidebar-nav-item ${page === item ? "active" : ""}`}
                  aria-current={page === item ? "page" : undefined}
                  onClick={() => handleNavigation(item)}
                >
                  <NavIcon name={item} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <div className="sidebar-divider" />

        <section className="sidebar-section">
          <span className="sidebar-section-label">System</span>

          <div className="sidebar-section-items">
            <button
              type="button"
              className={`sidebar-nav-item ${page === "Settings" ? "active" : ""}`}
              aria-current={page === "Settings" ? "page" : undefined}
              onClick={() => handleNavigation("Settings")}
            >
              <NavIcon name="Settings" />
              <span>Settings</span>
            </button>
          </div>
        </section>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="account-avatar account-avatar-small">
            {(role || "U").charAt(0).toUpperCase()}
          </div>

          <div className="sidebar-user-copy">
            <strong>{role === "admin" ? "Administrator" : "Fleet Viewer"}</strong>
            <span>{role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ name }) {
  const paths = {
    Dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    "Live Fleet": "M3 12h3l2-5 4 10 2-5h7",
    Vehicles: "M4 16V9l2-4h12l2 4v7M6 16v2M18 16v2M4 10h16M7 13h2M15 13h2",
    Drivers: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
    Assignments: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4",
    Routes: "M5 19c0-4 4-4 4-8s-4-4-4-8M19 5c0 4-4 4-4 8s4 4 4 8",
    Maintenance: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2-2 2.2-2.2Z",
    Inspections: "M7 3h10v18H7zM9 7h6M9 11h6M9 15h3",
    Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1",
  };

  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.Dashboard} />
    </svg>
  );
}

function Dashboard({ preferences, setPage }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fleetLive, setFleetLive] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadDashboard(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    }

    const [vehiclesResult, driversResult, fleetResult, maintenanceResult, eventsResult] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("fleet_live").select("*"),
      supabase.from("maintenance_records").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.maintenanceCount || 8),
      supabase.from("vehicle_events").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.activityCount || 8),
    ]);

    const results = [vehiclesResult, driversResult, fleetResult, maintenanceResult, eventsResult];
    const failed = results.find((result) => result.error);

    if (failed) {
      setError(failed.error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setVehicles(vehiclesResult.data || []);
    setDrivers(driversResult.data || []);
    setFleetLive(fleetResult.data || []);
    setMaintenance(maintenanceResult.data || []);
    setEvents(eventsResult.data || []);
    setError("");
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard();
    }, (preferences?.telemetryInterval || 15) * 1000);

    return () => clearInterval(interval);
  }, [preferences?.telemetryInterval, preferences?.activityCount, preferences?.maintenanceCount]);

  const totalVehicles = vehicles.length;

  const activeVehicles = vehicles.filter((vehicle) => {
    return ["ASSIGNED", "IN_SERVICE"].includes(vehicle.status);
  }).length;

  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length;

  const maintenanceVehicles = vehicles.filter((vehicle) => {
    return ["MAINTENANCE", "OUT_OF_SERVICE"].includes(vehicle.status);
  }).length;

  const assignedVehicles = vehicles.filter((vehicle) => vehicle.status === "ASSIGNED").length;

  const inServiceVehicles = vehicles.filter((vehicle) => vehicle.status === "IN_SERVICE").length;

  const offlineVehicles = fleetLive.filter((vehicle) => vehicle.status === "OFFLINE").length;

  const staleVehicles = fleetLive.filter((vehicle) => {
    if (!vehicle.last_ping || vehicle.status === "OFFLINE") {
      return false;
    }

    return Date.now() - new Date(vehicle.last_ping).getTime() > 30000;
  }).length;

  const activeDrivers = drivers.filter((driver) => {
    return ["ACTIVE", "ONLINE"].includes(driver.status);
  }).length;

  const activeRoutes = new Set(
    fleetLive
      .filter((vehicle) => vehicle.route_id)
      .map((vehicle) => vehicle.route_id)
  ).size;

  const openMaintenance = maintenance.filter((record) => {
    return ["SCHEDULED", "IN_PROGRESS", "OVERDUE"].includes(record.status);
  });

  const overdueMaintenance = maintenance.filter((record) => record.status === "OVERDUE").length;

  const reportingVehicles = fleetLive.filter((vehicle) => {
    return String(vehicle.effective_status || vehicle.status || "").toUpperCase() !== "OFFLINE";
  }).length;

  const fleetStatus = [
    {
      label: "In Service",
      count: inServiceVehicles,
      status: "IN_SERVICE",
    },
    {
      label: "Assigned",
      count: assignedVehicles,
      status: "ASSIGNED",
    },
    {
      label: "Available",
      count: availableVehicles,
      status: "AVAILABLE",
    },
    {
      label: "Maintenance",
      count: maintenanceVehicles,
      status: "MAINTENANCE",
    },
  ];

  const attentionItems = [];

  if (preferences?.maintenanceWarnings && overdueMaintenance > 0) {
    attentionItems.push({
      type: "warning",
      title: "Maintenance overdue",
      description: `${overdueMaintenance} maintenance record${overdueMaintenance === 1 ? "" : "s"} require attention.`,
      action: "Maintenance",
    });
  }

  if (preferences?.offlineWarnings && offlineVehicles > 0) {
    attentionItems.push({
      type: "danger",
      title: "Fleet telemetry offline",
      description: `${offlineVehicles} vehicle${offlineVehicles === 1 ? "" : "s"} currently report offline.`,
      action: "Live Fleet",
    });
  }

  if (staleVehicles > 0) {
    attentionItems.push({
      type: "warning",
      title: "Stale telemetry",
      description: `${staleVehicles} vehicle${staleVehicles === 1 ? "" : "s"} have not reported recently.`,
      action: "Live Fleet",
    });
  }

  function handleNavigation(nextPage) {
    setPage(nextPage);
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-intro">
          <div>
            <span className="eyebrow">OPERATIONS OVERVIEW</span>
            <h2>Fleet at a glance</h2>
            <p>Loading current fleet operations data.</p>
          </div>
        </div>

        <div className="panel dashboard-loading-panel">
          <div className="loading-indicator" />
          <span>Loading fleet data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="page-intro dashboard-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">OPERATIONS OVERVIEW</span>
          <h2>Fleet at a glance</h2>
          <p>Current operating condition, service workload, drivers, routes, and telemetry.</p>
        </div>

        <div className="page-intro-actions">
          <div className="live-status-summary">
            <span className="live-status-dot" />

            <div>
              <strong>Live telemetry</strong>
              <span>
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                  : "Updating"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="form-alert form-alert-error dashboard-error" role="alert">
          <strong>Dashboard data unavailable</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="dashboard-kpi-grid">
        <DashboardKpi
          label="Fleet"
          value={totalVehicles}
          detail={`${activeVehicles} currently operating`}
          icon="fleet"
        />

        <DashboardKpi
          label="Active / In Service"
          value={activeVehicles}
          detail={`${assignedVehicles} assigned · ${inServiceVehicles} in service`}
          icon="active"
        />

        <DashboardKpi
          label="Available"
          value={availableVehicles}
          detail={totalVehicles > 0 ? `${Math.round((availableVehicles / totalVehicles) * 100)}% of fleet` : "No fleet data"}
          icon="available"
        />

        <DashboardKpi
          label="Maintenance"
          value={maintenanceVehicles}
          detail={overdueMaintenance > 0 ? `${overdueMaintenance} overdue` : "No overdue records"}
          icon="maintenance"
          alert={overdueMaintenance > 0}
        />
      </section>

      <section className="dashboard-secondary-stats">
        <DashboardMetric
          label="Drivers"
          value={activeDrivers}
          detail={`${drivers.length} total`}
        />

        <DashboardMetric
          label="Active Routes"
          value={activeRoutes}
          detail="Currently assigned"
        />

        <DashboardMetric
          label="Stale"
          value={staleVehicles}
          detail="Telemetry delayed"
          alert={staleVehicles > 0}
        />

        <DashboardMetric
          label="Offline"
          value={offlineVehicles}
          detail="Not reporting"
          alert={offlineVehicles > 0}
        />
      </section>

      <section className="dashboard-primary-grid">
        <div className="panel dashboard-status-panel">
          <PanelTitle
            title="Fleet Operating Status"
            action={
              <button
                type="button"
                className="panel-action-button"
                onClick={() => handleNavigation("Vehicles")}
              >
                <span>View fleet</span>
                <span aria-hidden="true">→</span>
              </button>
            }
          />

          <div className="fleet-status-overview">
            <div className="fleet-status-total">
              <strong>{totalVehicles}</strong>
              <span>Total vehicles</span>
            </div>

            <div className="fleet-status-bar" aria-label="Fleet operating status distribution">
              {fleetStatus.map((item) => {
                const percentage = totalVehicles > 0 ? (item.count / totalVehicles) * 100 : 0;

                return (
                  <div
                    key={item.status}
                    className={`fleet-status-segment fleet-status-${item.status.toLowerCase()}`}
                    style={{ width: `${percentage}%` }}
                    title={`${item.label}: ${item.count}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="fleet-status-list">
            {fleetStatus.map((item) => (
              <div className="fleet-status-row" key={item.status}>
                <div className="fleet-status-name">
                  <span className={`status-dot status-dot-${item.status.toLowerCase()}`} />
                  <span>{item.label}</span>
                </div>

                <strong>{item.count}</strong>

                <span className="fleet-status-percent">
                  {totalVehicles > 0 ? `${Math.round((item.count / totalVehicles) * 100)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel dashboard-health-panel">
          <PanelTitle
            title="Operations Health"
            action={
              <button
                type="button"
                className="panel-action-button"
                onClick={() => handleNavigation("Live Fleet")}
              >
                <span>Live fleet</span>
                <span aria-hidden="true">→</span>
              </button>
            }
          />

          <div className="health-list">
            <HealthRow
              label="Driver activity"
              value={activeDrivers}
              detail={`${drivers.length} drivers in system`}
              state={activeDrivers > 0 ? "healthy" : "warning"}
            />

            <HealthRow
              label="Fleet telemetry"
              value={reportingVehicles}
              detail={`${offlineVehicles} offline · ${staleVehicles} stale`}
              state={offlineVehicles === 0 && staleVehicles === 0 ? "healthy" : "warning"}
            />

            <HealthRow
              label="Route activity"
              value={activeRoutes}
              detail="Routes currently represented in telemetry"
              state="healthy"
            />

            <HealthRow
              label="Service workload"
              value={openMaintenance.length}
              detail={`${overdueMaintenance} overdue maintenance records`}
              state={overdueMaintenance > 0 ? "warning" : "healthy"}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-secondary-grid">
        <div className="panel dashboard-maintenance-panel">
          <PanelTitle
            title="Maintenance Work Queue"
            action={
              <button
                type="button"
                className="panel-action-button"
                onClick={() => handleNavigation("Maintenance")}
              >
                <span>View maintenance</span>
                <span aria-hidden="true">→</span>
              </button>
            }
          />

          {openMaintenance.length === 0 ? (
            <Empty />
          ) : (
            <div className="dashboard-list">
              {openMaintenance.slice(0, preferences?.maintenanceCount || 8).map((record) => (
                <div className="dashboard-list-row" key={record.id}>
                  <div className="dashboard-list-main">
                    <strong>{record.vehicles?.fleet_number || "Unknown vehicle"}</strong>
                    <span>{record.maintenance_type || "Maintenance"}</span>
                  </div>

                  <div className="dashboard-list-meta">
                    {record.due_at && <span>Due {formatDate(record.due_at)}</span>}
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel dashboard-alert-panel">
          <PanelTitle
            title="Attention Required"
            action={
              attentionItems.length > 0 ? (
                <span className="panel-count">{attentionItems.length}</span>
              ) : null
            }
          />

          {attentionItems.length === 0 ? (
            <div className="dashboard-clear-state">
              <div className="dashboard-clear-icon">✓</div>

              <div>
                <strong>No immediate attention items</strong>
                <span>Fleet operations are currently within configured thresholds.</span>
              </div>
            </div>
          ) : (
            <div className="attention-list">
              {attentionItems.map((item, index) => (
                <button
                  type="button"
                  className={`attention-row attention-${item.type}`}
                  key={`${item.title}-${index}`}
                  onClick={() => handleNavigation(item.action)}
                >
                  <span className="attention-icon">!</span>

                  <span className="attention-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>

                  <span className="attention-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <div className="panel dashboard-activity-panel">
          <PanelTitle
            title="Recent Activity"
            action={<span className="panel-count">{events.length} recent</span>}
          />

          {events.length === 0 ? (
            <Empty />
          ) : (
            <div className="activity-list">
              {events.map((event) => (
                <div className="activity-row" key={event.id}>
                  <div className="activity-marker" />

                  <div className="activity-copy">
                    <strong>{event.description || event.event_type || "Fleet event"}</strong>
                    <span>
                      {event.vehicles?.fleet_number
                        ? `Fleet ${event.vehicles.fleet_number}`
                        : "Fleet operation"}
                    </span>
                  </div>

                  <time dateTime={event.created_at}>
                    {formatRelativeTime(event.created_at)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel dashboard-telemetry-panel">
          <PanelTitle title="Live Telemetry" />

          <div className="telemetry-summary">
            <div className="telemetry-number">
              <strong>{reportingVehicles}</strong>
              <span>Reporting vehicles</span>
            </div>

            <div className="telemetry-health">
              <span
                className={`health-indicator ${offlineVehicles === 0 && staleVehicles === 0 ? "healthy" : "warning"
                  }`}
              />

              <div>
                <strong>
                  {offlineVehicles === 0 ? "Fleet connected" : "Fleet attention required"}
                </strong>
                <span>{staleVehicles} stale · {offlineVehicles} offline</span>
              </div>
            </div>
          </div>

          <div className="telemetry-footer">
            <span>Refresh interval</span>
            <strong>{preferences?.telemetryInterval || 15}s</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardKpi({ label, value, detail, icon, alert }) {
  return (
    <article className={`dashboard-kpi ${alert ? "has-alert" : ""}`}>
      <div className={`dashboard-kpi-icon dashboard-kpi-icon-${icon}`}>
        <DashboardIcon name={icon} />
      </div>

      <div className="dashboard-kpi-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function DashboardMetric({ label, value, detail, alert }) {
  return (
    <article className={`dashboard-metric ${alert ? "has-alert" : ""}`}>
      <div className="dashboard-metric-main">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <small>{detail}</small>
    </article>
  );
}

function HealthRow({ label, value, detail, state }) {
  return (
    <div className="health-row">
      <span className={`health-indicator ${state}`} />

      <div className="health-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <strong className="health-value">{value}</strong>
    </div>
  );
}

function DashboardIcon({ name }) {
  const paths = {
    fleet: "M4 16V9l2-4h12l2 4v7M6 16v2M18 16v2M4 10h16M7 13h2M15 13h2",
    active: "M5 12h4l2-5 3 10 2-5h3",
    available: "M12 3v18M3 12h18",
    maintenance: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2-2Z",
    assigned: "M8 7h8M8 12h8M8 17h5M5 4h14v16H5z",
    "out-of-service": "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM8 8l8 8",
    clipboard: "M9 5h6M9 3h6a1 1 0 0 1 1 1v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1ZM8 11h8M8 15h8M8 19h5",
    alert: "M12 3L2.8 20h18.4L12 3ZM12 9v5M12 17h.01",
    wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2-2 2.2-2.2Z",
    defect: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0-9-9M12 7v5l3 2M17 4l3 3M20 4l-3 3",
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.fleet} />
    </svg>
  );
}

function formatRelativeTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}

function LiveFleet({ canEdit }) {
  const [fleet, setFleet] = useState([]);
  const [selectedFleetNumber, setSelectedFleetNumber] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  async function loadFleet(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data, error: fleetError } = await supabase
      .from("fleet_live")
      .select("*")
      .order("fleet_number");

    if (fleetError) {
      setError(fleetError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const sorted = [...(data || [])].sort((a, b) => {
      const garageA = String(a.garage || "").toUpperCase();
      const garageB = String(b.garage || "").toUpperCase();

      const garageRankA = garageA === "CLIO" ? 0 : garageA === "MAPLECREST" ? 1 : 2;
      const garageRankB = garageB === "CLIO" ? 0 : garageB === "MAPLECREST" ? 1 : 2;

      if (garageRankA !== garageRankB) {
        return garageRankA - garageRankB;
      }

      const yearA = Number(a.year) || 9999;
      const yearB = Number(b.year) || 9999;

      if (yearA !== yearB) {
        return yearA - yearB;
      }

      const fleetA = Number.parseInt(String(a.fleet_number).replace(/\D/g, ""), 10) || 0;
      const fleetB = Number.parseInt(String(b.fleet_number).replace(/\D/g, ""), 10) || 0;

      return fleetA - fleetB;
    });

    setFleet(sorted);
    setLastRefresh(new Date());

    setSelectedFleetNumber((current) => {
      if (current && sorted.some((bus) => String(bus.fleet_number) === String(current))) {
        return current;
      }

      const firstOnline = sorted.find((bus) => {
        const status = String(bus.effective_status || bus.status || "").toUpperCase();

        return status !== "OFFLINE" && bus.x !== null && bus.x !== undefined;
      });

      return firstOnline ? String(firstOnline.fleet_number) : "";
    });

    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadFleet(true);

    const interval = setInterval(() => {
      loadFleet(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredFleet = fleet.filter((bus) => {
    const fleetNumber = String(bus.fleet_number || "");
    const driver = String(bus.driver_name || bus.driver || "");
    const route = String(
      bus.route_number ||
      bus.route_name ||
      bus.route_code ||
      bus.route ||
      ""
    );

    const haystack = `${fleetNumber} ${driver} ${route}`.toLowerCase();
    const normalizedSearch = search.trim().toLowerCase();
    const status = String(bus.effective_status || bus.status || "UNKNOWN").toUpperCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

    let matchesStatus = true;

    if (statusFilter === "STALE") {
      matchesStatus = Boolean(bus.is_stale) && status !== "OFFLINE";
    } else if (statusFilter === "OFFLINE") {
      matchesStatus = status === "OFFLINE";
    } else if (statusFilter === "MAINTENANCE") {
      matchesStatus = status === "MAINTENANCE";
    } else if (statusFilter !== "ALL") {
      matchesStatus = status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const selectedBus = fleet.find(
    (bus) => String(bus.fleet_number) === String(selectedFleetNumber)
  );

  const totalCount = fleet.length;

  const onlineCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status !== "OFFLINE";
  }).length;

  const staleCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status !== "OFFLINE" && Boolean(bus.is_stale);
  }).length;

  const offlineCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status === "OFFLINE";
  }).length;

  const inServiceCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status === "IN_SERVICE";
  }).length;

  const assignedCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status === "ASSIGNED";
  }).length;

  const availableCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status === "AVAILABLE";
  }).length;

  const maintenanceCount = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "").toUpperCase();

    return status === "MAINTENANCE";
  }).length;

  function getStatus(status) {
    return String(status || "UNKNOWN").toUpperCase();
  }

  function getDriver(bus) {
    return bus.driver_name || bus.driver || "Unassigned";
  }

  function getRoute(bus) {
    return bus.route_number || bus.route_code || bus.route_name || bus.route || "No route";
  }

  function getSpeed(bus) {
    const speed = Number(bus.speed);

    if (!Number.isFinite(speed)) {
      return 0;
    }

    return speed;
  }

  function getLastPing(bus) {
    return bus.last_ping || bus.last_seen || bus.updated_at;
  }

  function getTelemetryAge(bus) {
    const value = getLastPing(bus);

    if (!value) {
      return null;
    }

    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  }

  function formatTelemetryAge(bus) {
    const age = getTelemetryAge(bus);

    if (age === null) {
      return "No telemetry";
    }

    if (age < 60) {
      return `${age}s ago`;
    }

    const minutes = Math.floor(age / 60);

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    return `${hours}h ago`;
  }

  function formatNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">OPERATIONS / LIVE TELEMETRY</span>
            <h2>Live Fleet</h2>
            <p>Real-time visibility across the active transportation fleet.</p>
          </div>
        </div>

        <div className="panel page-loading-panel">
          <div className="loading-indicator" />
          <span>Loading live fleet telemetry</span>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">OPERATIONS / LIVE TELEMETRY</span>
          <h2>Live Fleet</h2>
          <p>Monitor active vehicles, operators, routes, and telemetry health.</p>
        </div>

        <div className="page-intro-actions">
          <div className="live-status-summary">
            <span className="live-status-dot" />

            <div>
              <strong>Live telemetry</strong>
              <span>
                {lastRefresh
                  ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                  : "Updating"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadFleet(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="form-alert form-alert-error" role="alert">
          <strong>Fleet telemetry unavailable</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-kpi-grid live-fleet-kpi-grid">
        <DashboardKpi
          label="Total Fleet"
          value={totalCount}
          detail="Vehicles in live fleet view"
          icon="fleet"
        />

        <DashboardKpi
          label="Online"
          value={onlineCount}
          detail={`${totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0}% reporting`}
          icon="active"
        />

        <DashboardKpi
          label="In Service"
          value={inServiceCount}
          detail={`${assignedCount} assigned`}
          icon="active"
        />

        <DashboardKpi
          label="Available"
          value={availableCount}
          detail={`${maintenanceCount} in maintenance`}
          icon="available"
        />

        <DashboardKpi
          label="Telemetry Issues"
          value={staleCount + offlineCount}
          detail={`${staleCount} stale · ${offlineCount} offline`}
          icon="maintenance"
          alert={staleCount > 0 || offlineCount > 0}
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">FLEET FILTER</span>
            <h3>Vehicle activity</h3>
          </div>

          <span className="panel-count">
            {filteredFleet.length} of {fleet.length}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Fleet, driver, or route"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      IN_SERVICE: "In service",
                      ASSIGNED: "Assigned",
                      AVAILABLE: "Available",
                      MAINTENANCE: "Maintenance",
                      STALE: "Stale telemetry",
                      OFFLINE: "Offline",
                    }[statusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["IN_SERVICE", "In service"],
                      ["ASSIGNED", "Assigned"],
                      ["AVAILABLE", "Available"],
                      ["MAINTENANCE", "Maintenance"],
                      ["STALE", "Stale telemetry"],
                      ["OFFLINE", "Offline"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${statusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="live-fleet-layout">
        <div className="panel live-fleet-map-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">MAP VIEW</span>
              <h3>Fleet Map</h3>
              <p>{onlineCount} vehicles currently reporting</p>
            </div>

            {selectedBus && (
              <StatusBadge
                status={getStatus(selectedBus.effective_status || selectedBus.status)}
              />
            )}
          </div>

          <FleetMap
            fleet={fleet}
            selectedFleetNumber={selectedFleetNumber}
            onSelect={setSelectedFleetNumber}
          />
        </div>

        <div className="panel live-fleet-list-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">ACTIVE VEHICLES</span>
              <h3>Fleet Activity</h3>
              <p>Select a vehicle to inspect its current telemetry.</p>
            </div>
          </div>

          <div className="fleet-list">
            {filteredFleet.length === 0 ? (
              <Empty />
            ) : (
              filteredFleet.map((bus) => {
                const fleetNumber = String(bus.fleet_number);
                const status = getStatus(bus.effective_status || bus.status);
                const selected = fleetNumber === String(selectedFleetNumber);

                return (
                  <button
                    type="button"
                    key={fleetNumber}
                    className={`fleet-list-item ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedFleetNumber(fleetNumber)}
                  >
                    <div className="fleet-list-main">
                      <div className="fleet-list-number">
                        {fleetNumber}
                      </div>

                      <div className="fleet-list-primary">
                        <strong>{getDriver(bus)}</strong>
                        <span>{getRoute(bus)}</span>
                      </div>
                    </div>

                    <div className="fleet-list-meta">
                      <StatusBadge status={status} />

                      <span className="fleet-list-speed">
                        {formatNumber(getSpeed(bus), 1)} MPH
                      </span>

                      <span className="fleet-list-ping">
                        {formatTelemetryAge(bus)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedBus ? (
        <div className="panel live-fleet-detail-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">VEHICLE TELEMETRY</span>
              <h3>Fleet {selectedBus.fleet_number}</h3>
              <p>
                {selectedBus.year || "—"} {selectedBus.make || ""} {selectedBus.model || ""}
              </p>
            </div>

            <StatusBadge
              status={getStatus(selectedBus.effective_status || selectedBus.status)}
            />
          </div>

          <div className="detail-grid">
            <Detail
              label="Driver"
              value={getDriver(selectedBus)}
            />

            <Detail
              label="Route"
              value={getRoute(selectedBus)}
            />

            <Detail
              label="Speed"
              value={`${formatNumber(selectedBus.speed, 1)} MPH`}
            />

            <Detail
              label="RPM"
              value={formatNumber(selectedBus.rpm)}
            />

            <Detail
              label="Heading"
              value={`${formatNumber(selectedBus.heading, 0)}°`}
            />

            <Detail
              label="Coolant"
              value={`${formatNumber(selectedBus.coolant_temp, 1)} °F`}
            />

            <Detail
              label="Oil"
              value={`${formatNumber(selectedBus.oil_temp, 1)} °F`}
            />

            <Detail
              label="Telemetry"
              value={formatTelemetryAge(selectedBus)}
            />

            <Detail
              label="Server"
              value={selectedBus.server_id || selectedBus.roblox_job_id || "—"}
            />

            <Detail
              label="Position X"
              value={formatNumber(selectedBus.x, 2)}
            />

            <Detail
              label="Position Y"
              value={formatNumber(selectedBus.y, 2)}
            />

            <Detail
              label="Position Z"
              value={formatNumber(selectedBus.z, 2)}
            />
          </div>

          <div className="detail-footer">
            <div className="detail-footer-item">
              <span>Last Ping</span>
              <strong>{formatDateTime(getLastPing(selectedBus))}</strong>
            </div>

            <div className="detail-footer-item">
              <span>Fleet Number</span>
              <strong>{selectedBus.fleet_number}</strong>
            </div>

            <div className="detail-footer-item">
              <span>Garage</span>
              <strong>{selectedBus.garage || "—"}</strong>
            </div>

            <div className="detail-footer-item">
              <span>Access</span>
              <strong>{canEdit ? "Operator" : "Viewer"}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel live-fleet-detail-panel">
          <Empty />
        </div>
      )}
    </section>
  );
}

function FleetMap({ fleet, selectedFleetNumber, onSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const resizeObserverRef = useRef(null);

  const IMAGE_WIDTH = 1055;
  const IMAGE_HEIGHT = 1055;

  function robloxToMap(x, z) {
    const imageX = 961.5 - Number(x) * 0.17138671875;
    const imageY = 540.5 - Number(z) * 0.17138671875;

    return [imageY, imageX];
  }

  useEffect(() => {
    const container = mapRef.current;

    if (!container || mapInstanceRef.current) {
      return;
    }

    let cancelled = false;

    function initializeMap() {
      if (cancelled || !mapRef.current || mapInstanceRef.current) {
        return;
      }

      const width = mapRef.current.clientWidth;
      const height = mapRef.current.clientHeight;

      if (width <= 0 || height <= 0) {
        requestAnimationFrame(initializeMap);
        return;
      }

      const bounds = [[0, 0], [IMAGE_HEIGHT, IMAGE_WIDTH]];

      const map = L.map(mapRef.current, {
        crs: L.CRS.Simple,
        minZoom: -1,
        maxZoom: 4,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
      });

      mapInstanceRef.current = map;

      const imageUrl = `${import.meta.env.BASE_URL}map.png`;

      const imageOverlay = L.imageOverlay(imageUrl, bounds, {
        interactive: false,
      });

      imageOverlay.on("load", () => {
        if (!cancelled && mapInstanceRef.current === map) {
          map.invalidateSize(false);
          map.fitBounds(bounds, {
            animate: false,
            padding: [0, 0],
          });
        }
      });

      imageOverlay.on("error", () => {
        console.error(`Fleet map image failed to load: ${imageUrl}`);
      });

      imageOverlay.addTo(map);

      map.fitBounds(bounds, {
        animate: false,
        padding: [0, 0],
      });

      map.setMaxBounds([
        [-IMAGE_HEIGHT * 0.15, -IMAGE_WIDTH * 0.15],
        [IMAGE_HEIGHT * 1.15, IMAGE_WIDTH * 1.15],
      ]);

      requestAnimationFrame(() => {
        if (!cancelled && mapInstanceRef.current === map) {
          map.invalidateSize(false);
        }
      });

      resizeObserverRef.current = new ResizeObserver(() => {
        if (mapInstanceRef.current === map) {
          map.invalidateSize(false);
        }
      });

      resizeObserverRef.current.observe(mapRef.current);

      const mapPanel = mapRef.current.closest(".live-fleet-map-panel");

      if (mapPanel) {
        resizeObserverRef.current.observe(mapPanel);
      }
    }

    initializeMap();

    return () => {
      cancelled = true;

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      markerMapRef.current.forEach((marker) => marker.remove());
      markerMapRef.current.clear();

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

    const markerMap = markerMapRef.current;
    const activeFleetNumbers = new Set();

    fleet.forEach((bus) => {
      const fleetNumber = String(bus.fleet_number);
      const status = String(bus.effective_status || bus.status || "UNKNOWN").toUpperCase();

      if (status === "OFFLINE") {
        return;
      }

      if (bus.x === null || bus.x === undefined || bus.z === null || bus.z === undefined) {
        return;
      }

      const x = Number(bus.x);
      const z = Number(bus.z);

      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return;
      }

      const position = robloxToMap(x, z);

      if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
        return;
      }

      activeFleetNumbers.add(fleetNumber);

      let marker = markerMap.get(fleetNumber);

      if (!marker) {
        const icon = L.divIcon({
          className: "fleet-map-marker",
          html: `
            <div class="fleet-map-marker-body">
              <div class="fleet-map-marker-arrow"></div>
              <span>${fleetNumber}</span>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        marker = L.marker(position, {
          icon,
          keyboard: false,
          zIndexOffset: 500,
        });

        marker.on("click", () => onSelect(fleetNumber));
        marker.addTo(map);

        markerMap.set(fleetNumber, marker);
      } else {
        marker.setLatLng(position);
      }

      const element = marker.getElement();

      if (!element) {
        return;
      }

      const markerBody = element.querySelector(".fleet-map-marker-body");
      const arrow = element.querySelector(".fleet-map-marker-arrow");
      const label = element.querySelector("span");
      const heading = Number(bus.heading || 0);

      if (markerBody) {
        markerBody.classList.toggle("selected", fleetNumber === String(selectedFleetNumber));
        markerBody.classList.toggle("stale", Boolean(bus.is_stale));
        markerBody.classList.toggle("maintenance", status === "MAINTENANCE");
        markerBody.classList.toggle("assigned", status === "ASSIGNED");
        markerBody.classList.toggle("in-service", status === "IN_SERVICE");
        markerBody.classList.toggle("available", status === "AVAILABLE");
      }

      if (arrow) {
        arrow.style.transform = `rotate(${heading}deg)`;
      }

      if (label) {
        label.style.transform = "rotate(180deg)";
      }
    });

    markerMap.forEach((marker, fleetNumber) => {
      if (!activeFleetNumbers.has(fleetNumber)) {
        marker.remove();
        markerMap.delete(fleetNumber);
      }
    });
  }, [fleet, selectedFleetNumber, onSelect]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !selectedFleetNumber) {
      return;
    }

    const marker = markerMapRef.current.get(String(selectedFleetNumber));

    if (!marker) {
      return;
    }

    map.panTo(marker.getLatLng(), {
      animate: true,
      duration: 0.35,
    });
  }, [selectedFleetNumber]);

  return (
    <div className="fleet-map">
      <div ref={mapRef} className="fleet-map-canvas" />
    </div>
  );
}

function Vehicles({ canEdit, openVehicleDetails, openNewVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [liveVehicles, setLiveVehicles] = useState([]);
  const [drivers, setDrivers] = useState(new Map());
  const [search, setSearch] = useState("");
  const [garageFilter, setGarageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [garageDropdownOpen, setGarageDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadVehicles(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const [
      { data: vehicleData, error: vehicleError },
      { data: liveData, error: liveError },
      { data: driverData, error: driverError },
    ] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("fleet_live").select("*"),
      supabase.from("drivers").select("id, name, employee_number, status"),
    ]);

    if (vehicleError) {
      setError(vehicleError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (liveError) {
      setError(liveError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (driverError) {
      setError(driverError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const driverById = new Map(
      (driverData || []).map((driver) => [String(driver.id), driver])
    );

    const sortedVehicles = [...(vehicleData || [])].sort((a, b) => {
      const garageOrder = {
        CLIO: 0,
        MAPLECREST: 1,
      };

      const garageA = garageOrder[String(a.garage || "").toUpperCase()] ?? 99;
      const garageB = garageOrder[String(b.garage || "").toUpperCase()] ?? 99;

      if (garageA !== garageB) {
        return garageA - garageB;
      }

      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;

      if (yearA !== yearB) {
        return yearA - yearB;
      }

      return String(a.fleet_number || "").localeCompare(String(b.fleet_number || ""), undefined, { numeric: true });
    });

    setVehicles(sortedVehicles);
    setLiveVehicles(liveData || []);
    setDrivers(driverById);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadVehicles(true);
  }, []);

  const liveByFleet = new Map(
    liveVehicles.map((vehicle) => [String(vehicle.fleet_number), vehicle])
  );

  const vehicleRows = vehicles.map((vehicle) => {
    const live = liveByFleet.get(String(vehicle.fleet_number));
    const assignedDriver = drivers.get(String(vehicle.current_driver_id));
    const liveDriver = live?.driver_id ? drivers.get(String(live.driver_id)) : null;

    return {
      ...vehicle,
      live,
      driverName: live?.driver_name || liveDriver?.name || assignedDriver?.name || "Unassigned",
      displayStatus: live?.effective_status || vehicle.status || "UNKNOWN",
    };
  });

  const garages = [...new Set(vehicleRows.map((vehicle) => vehicle.garage).filter(Boolean))].sort((a, b) => {
    const garageOrder = {
      CLIO: 0,
      MAPLECREST: 1,
    };

    return (garageOrder[String(a).toUpperCase()] ?? 99) - (garageOrder[String(b).toUpperCase()] ?? 99);
  });

  const statuses = [...new Set(vehicleRows.map((vehicle) => vehicle.displayStatus).filter(Boolean))].sort();

  const filteredVehicles = vehicleRows.filter((vehicle) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      vehicle.fleet_number,
      vehicle.year,
      vehicle.make,
      vehicle.model,
      vehicle.engine,
      vehicle.garage,
      vehicle.status,
      vehicle.displayStatus,
      vehicle.driverName,
      vehicle.live?.route_name,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const matchesGarage = garageFilter === "ALL" || vehicle.garage === garageFilter;
    const matchesStatus = statusFilter === "ALL" || vehicle.displayStatus === statusFilter;

    return matchesSearch && matchesGarage && matchesStatus;
  });

  const totalCount = vehicleRows.length;
  const availableCount = vehicleRows.filter((vehicle) => String(vehicle.displayStatus).toUpperCase() === "AVAILABLE").length;
  const assignedCount = vehicleRows.filter((vehicle) => String(vehicle.displayStatus).toUpperCase() === "ASSIGNED").length;
  const inServiceCount = vehicleRows.filter((vehicle) => String(vehicle.displayStatus).toUpperCase() === "IN_SERVICE").length;
  const maintenanceCount = vehicleRows.filter((vehicle) => String(vehicle.displayStatus).toUpperCase() === "MAINTENANCE").length;
  const outOfServiceCount = vehicleRows.filter((vehicle) => String(vehicle.displayStatus).toUpperCase() === "OUT_OF_SERVICE").length;

  function getStatusClass(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "AVAILABLE") {
      return "status-badge status-available";
    }

    if (normalized === "ASSIGNED" || normalized === "IN_SERVICE") {
      return "status-badge status-active";
    }

    if (normalized === "MAINTENANCE") {
      return "status-badge status-warning";
    }

    if (normalized === "OUT_OF_SERVICE") {
      return "status-badge status-danger";
    }

    return "status-badge";
  }

  function getStatusLabel(status) {
    return String(status || "UNKNOWN").replaceAll("_", " ");
  }

  function openVehicle(vehicle) {
    openVehicleDetails(vehicle.id);
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Fleet Directory</span>
          <h1>Vehicles</h1>
          <p>Fleet inventory, operational status, and vehicle records.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button type="button" className="button button-primary" onClick={openNewVehicle}>
              New Vehicle
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadVehicles(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="dashboard-kpi-grid vehicle-stat-grid">
        <DashboardKpi
          label="Total Fleet"
          value={totalCount}
          detail="Registered vehicles"
          icon="fleet"
        />

        <DashboardKpi
          label="Available"
          value={availableCount}
          detail="Ready for assignment"
          icon="available"
        />

        <DashboardKpi
          label="Assigned"
          value={assignedCount}
          detail="Currently assigned"
          icon="assigned"
        />

        <DashboardKpi
          label="In Service"
          value={inServiceCount}
          detail="Currently operating"
          icon="active"
        />

        <DashboardKpi
          label="Maintenance"
          value={maintenanceCount}
          detail="Unavailable for service"
          icon="maintenance"
        />

        <DashboardKpi
          label="Out of Service"
          value={outOfServiceCount}
          detail="Not operational"
          icon="out-of-service"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Fleet Inventory</span>
            <h3>Vehicle Directory</h3>
          </div>

          <span className="panel-count">
            {filteredVehicles.length} of {totalCount}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Fleet, make, model, driver, route..."
              />
            </label>

            <label className="select-control">
              <span>Garage</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setGarageDropdownOpen((open) => !open);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <span>
                    {garageFilter === "ALL" ? "All garages" : garageFilter}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {garageDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All garages"],
                      ...garages.map((garage) => [garage, garage]),
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${garageFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setGarageFilter(value);
                          setGarageDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setStatusDropdownOpen((open) => !open);
                    setGarageDropdownOpen(false);
                  }}
                >
                  <span>
                    {statusFilter === "ALL" ? "All statuses" : getStatusLabel(statusFilter)}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ...statuses.map((status) => [status, getStatusLabel(status)]),
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${statusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Loading fleet</strong>
            <span>Retrieving vehicle records and live status.</span>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <strong>No vehicles found</strong>
            <span>Adjust the search or filters to find a vehicle.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fleet</th>
                  <th>Vehicle</th>
                  <th>Engine</th>
                  <th>Mileage</th>
                  <th>Garage</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <button type="button" className="table-primary-link" onClick={() => openVehicle(vehicle)}>
                        {vehicle.fleet_number || "—"}
                      </button>
                    </td>

                    <td>
                      <div className="table-main-text">
                        {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                      </div>
                    </td>

                    <td>{vehicle.engine || "—"}</td>

                    <td>
                      {vehicle.mileage !== null && vehicle.mileage !== undefined && vehicle.mileage !== ""
                        ? Number(vehicle.mileage).toLocaleString()
                        : "—"}
                    </td>

                    <td>{vehicle.garage || "—"}</td>

                    <td>{vehicle.driverName}</td>

                    <td>
                      {vehicle.live?.route_name || "No active route"}
                    </td>

                    <td>
                      <span className={getStatusClass(vehicle.displayStatus)}>
                        {getStatusLabel(vehicle.displayStatus)}
                      </span>
                    </td>

                    <td className="table-actions">
                      <button type="button" className="button button-secondary button-small" onClick={() => openVehicle(vehicle)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function VehicleDetails({ canEdit, vehicleId, returnToVehicles }) {
  const [vehicle, setVehicle] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [driver, setDriver] = useState(null);
  const [route, setRoute] = useState(null);
  const [server, setServer] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [routeAssignments, setRouteAssignments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [defects, setDefects] = useState([]);
  const [audits, setAudits] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editForm, setEditForm] = useState({
    year: "",
    make: "",
    model: "",
    engine: "",
    mileage: "",
    status: "",
    garage: "",
    notes: "",
  });

  async function loadVehicle(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    if (!vehicleId) {
      setError("No vehicle was selected.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      setError(vehicleError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!vehicleData) {
      setError("Vehicle not found.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setVehicle(vehicleData);

    setEditForm({
      year: vehicleData.year ?? "",
      make: vehicleData.make ?? "",
      model: vehicleData.model ?? "",
      engine: vehicleData.engine ?? "",
      mileage: vehicleData.mileage ?? "",
      status: vehicleData.status ?? "",
      garage: vehicleData.garage ?? "",
      notes: vehicleData.notes ?? "",
    });

    const [
      { data: liveResult },
      { data: driverResult },
      { data: routeResult },
      { data: serverResult },
      { data: assignmentResult },
      { data: routeAssignmentResult },
      { data: maintenanceResult },
      { data: defectResult },
      { data: auditResult },
      { data: eventResult },
    ] = await Promise.all([
      supabase.from("fleet_live").select("*").eq("fleet_number", vehicleData.fleet_number).maybeSingle(),

      vehicleData.current_driver_id
        ? supabase.from("drivers").select("*").eq("id", vehicleData.current_driver_id).maybeSingle()
        : Promise.resolve({ data: null }),

      vehicleData.current_route_id
        ? supabase.from("routes").select("*").eq("id", vehicleData.current_route_id).maybeSingle()
        : Promise.resolve({ data: null }),

      vehicleData.current_server_id
        ? supabase.from("servers").select("*").eq("id", vehicleData.current_server_id).maybeSingle()
        : Promise.resolve({ data: null }),

      supabase.from("assignments").select("*").eq("vehicle_id", vehicleId).order("started_at", { ascending: false }),

      supabase.from("route_assignments").select("*").eq("vehicle_id", vehicleId).order("started_at", { ascending: false }),

      supabase.from("maintenance_records").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("vehicle_defects").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("audits").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("vehicle_events").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(20),
    ]);

    setLiveData(liveResult || null);
    setDriver(driverResult || null);
    setRoute(routeResult || null);
    setServer(serverResult || null);
    setAssignments(assignmentResult || []);
    setRouteAssignments(routeAssignmentResult || []);
    setMaintenance(maintenanceResult || []);
    setDefects(defectResult || []);
    setAudits(auditResult || []);
    setEvents(eventResult || []);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadVehicle(true);
  }, [vehicleId]);

  async function saveVehicle() {
    if (!canEdit || !vehicle || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { data, error: rpcError } = await supabase.rpc("update_vehicle", {
      p_vehicle_id: vehicle.id,
      p_year: editForm.year === "" ? null : Number(editForm.year),
      p_make: editForm.make.trim(),
      p_model: editForm.model.trim(),
      p_engine: editForm.engine.trim(),
      p_mileage: editForm.mileage === "" ? null : Number(editForm.mileage),
      p_status: editForm.status,
      p_garage: editForm.garage.trim(),
      p_notes: editForm.notes.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    if (data) {
      setVehicle(Array.isArray(data) ? data[0] : data);
    }

    setEditing(false);
    setMessage("Vehicle record updated.");
    await loadVehicle(false);
    setSaving(false);
  }

  function updateField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  function formatMileage(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return Number(value).toLocaleString();
  }

  function formatStatus(value) {
    return String(value || "UNKNOWN").replaceAll("_", " ");
  }

  function getStatusClass(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "AVAILABLE") {
      return "status-badge status-available";
    }

    if (normalized === "ASSIGNED" || normalized === "IN_SERVICE") {
      return "status-badge status-active";
    }

    if (normalized === "MAINTENANCE") {
      return "status-badge status-warning";
    }

    if (normalized === "OUT_OF_SERVICE") {
      return "status-badge status-danger";
    }

    return "status-badge";
  }

  function getDefectClass(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "OPEN" || normalized === "ACTIVE") {
      return "status-badge status-danger";
    }

    if (normalized === "REPAIRED" || normalized === "CLOSED") {
      return "status-badge status-available";
    }

    return "status-badge";
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="empty-state">
          <strong>Loading vehicle</strong>
          <span>Retrieving vehicle information and operational history.</span>
        </div>
      </section>
    );
  }

  if (!vehicle) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">Vehicle Record</span>
            <h1>Vehicle Details</h1>
            <p>{error || "The requested vehicle could not be loaded."}</p>
          </div>

          <div className="page-intro-actions">
            <button type="button" className="button button-secondary" onClick={returnToVehicles}>
              Back to Vehicles
            </button>
          </div>
        </div>
      </section>
    );
  }

  const effectiveStatus = liveData?.effective_status || vehicle.status;
  const isOnline = Boolean(liveData);

  return (
    <section className="page-section">
      <div className="page-intro vehicle-detail-intro">
        <div className="page-intro-copy">
          <div className="breadcrumb-row">
            <button type="button" className="breadcrumb-button" onClick={returnToVehicles}>
              Vehicles
            </button>
            <span>/</span>
            <span>{vehicle.fleet_number}</span>
          </div>

          <div className="detail-title-row">
            <div>
              <span className="eyebrow">Vehicle Record</span>
              <h1>{vehicle.fleet_number}</h1>
              <p>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
            </div>

            <span className={getStatusClass(effectiveStatus)}>
              {formatStatus(effectiveStatus)}
            </span>
          </div>
        </div>

        <div className="page-intro-actions">
          <button type="button" className="button button-secondary" onClick={() => loadVehicle(false)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {canEdit && (
            <button type="button" className="button button-primary" onClick={() => setEditing((current) => !current)}>
              {editing ? "Cancel Edit" : "Edit Vehicle"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {editing && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Vehicle Record</span>
              <h2>Edit Vehicle</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Fleet Number</span>
              <input type="text" value={vehicle.fleet_number || ""} disabled />
            </label>

            <label className="form-field">
              <span>Year</span>
              <input type="number" value={editForm.year} onChange={(event) => updateField("year", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Make</span>
              <input type="text" value={editForm.make} onChange={(event) => updateField("make", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Model</span>
              <input type="text" value={editForm.model} onChange={(event) => updateField("model", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Engine</span>
              <input type="text" value={editForm.engine} onChange={(event) => updateField("engine", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Mileage</span>
              <input type="number" min="0" value={editForm.mileage} onChange={(event) => updateField("mileage", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Garage</span>
              <input type="text" value={editForm.garage} onChange={(event) => updateField("garage", event.target.value)} />
            </label>

            <label className="form-field">
              <span>Status</span>
              <select value={editForm.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_SERVICE">In Service</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>
            </label>

            <label className="form-field form-field-wide">
              <span>Notes</span>
              <textarea value={editForm.notes} onChange={(event) => updateField("notes", event.target.value)} rows={4} />
            </label>
          </div>

          <div className="panel-actions">
            <button type="button" className="button button-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>

            <button type="button" className="button button-primary" onClick={saveVehicle} disabled={saving}>
              {saving ? "Saving..." : "Save Vehicle"}
            </button>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Vehicle Information</span>
              <h2>Specifications</h2>
            </div>
          </div>

          <div className="detail-field-grid">
            <div className="detail-field">
              <span>Fleet Number</span>
              <strong>{vehicle.fleet_number || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Year</span>
              <strong>{vehicle.year || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Make</span>
              <strong>{vehicle.make || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Model</span>
              <strong>{vehicle.model || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Engine</span>
              <strong>{vehicle.engine || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Mileage</span>
              <strong>{formatMileage(vehicle.mileage)}</strong>
            </div>

            <div className="detail-field">
              <span>Garage</span>
              <strong>{vehicle.garage || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Database Status</span>
              <strong>{formatStatus(vehicle.status)}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Operations</span>
              <h2>Current Assignment</h2>
            </div>

            <span className={isOnline ? "status-badge status-active" : "status-badge"}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="detail-field-grid">
            <div className="detail-field">
              <span>Driver</span>
              <strong>{driver?.name || liveData?.driver_name || "Unassigned"}</strong>
            </div>

            <div className="detail-field">
              <span>Employee Number</span>
              <strong>{driver?.employee_number || "—"}</strong>
            </div>

            <div className="detail-field">
              <span>Route</span>
              <strong>{route?.route_code || route?.name || liveData?.route_name || "No active route"}</strong>
            </div>

            <div className="detail-field">
              <span>Server</span>
              <strong>{server?.roblox_job_id || "Offline"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Live Operations</span>
            <h2>Telemetry</h2>
          </div>

          <span className={isOnline ? "status-badge status-active" : "status-badge"}>
            {isOnline ? "REPORTING" : "NO TELEMETRY"}
          </span>
        </div>

        {liveData ? (
          <div className="telemetry-grid">
            <div className="telemetry-card">
              <span>Speed</span>
              <strong>{liveData.speed !== null && liveData.speed !== undefined ? `${Number(liveData.speed).toFixed(1)} mph` : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>RPM</span>
              <strong>{liveData.rpm !== null && liveData.rpm !== undefined ? Number(liveData.rpm).toLocaleString() : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Coolant</span>
              <strong>{liveData.coolant_temp !== null && liveData.coolant_temp !== undefined ? `${Number(liveData.coolant_temp).toFixed(1)}°` : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Oil</span>
              <strong>{liveData.oil_temp !== null && liveData.oil_temp !== undefined ? `${Number(liveData.oil_temp).toFixed(1)}°` : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Heading</span>
              <strong>{liveData.heading !== null && liveData.heading !== undefined ? `${Number(liveData.heading).toFixed(1)}°` : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Position X</span>
              <strong>{liveData.x !== null && liveData.x !== undefined ? Number(liveData.x).toFixed(2) : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Position Y</span>
              <strong>{liveData.y !== null && liveData.y !== undefined ? Number(liveData.y).toFixed(2) : "—"}</strong>
            </div>

            <div className="telemetry-card">
              <span>Position Z</span>
              <strong>{liveData.z !== null && liveData.z !== undefined ? Number(liveData.z).toFixed(2) : "—"}</strong>
            </div>
          </div>
        ) : (
          <div className="empty-state compact">
            <strong>No live telemetry</strong>
            <span>This vehicle is not currently reporting to the fleet system.</span>
          </div>
        )}

        {liveData?.last_ping && (
          <div className="panel-footer">
            Last telemetry received {formatDate(liveData.last_ping)}
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Assignments</span>
              <h2>Assignment History</h2>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state compact">
              <strong>No assignments</strong>
              <span>No vehicle assignment records exist.</span>
            </div>
          ) : (
            <div className="record-list">
              {assignments.slice(0, 8).map((assignment) => (
                <div className="record-list-item" key={assignment.id}>
                  <div>
                    <strong>{assignment.route_number || "Assignment"}</strong>
                    <span>{assignment.notes || "No assignment notes."}</span>
                  </div>

                  <div className="record-list-meta">
                    <strong>{formatStatus(assignment.status)}</strong>
                    <span>{formatDate(assignment.started_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Routes</span>
              <h2>Route Assignments</h2>
            </div>
          </div>

          {routeAssignments.length === 0 ? (
            <div className="empty-state compact">
              <strong>No route assignments</strong>
              <span>No route assignment records exist.</span>
            </div>
          ) : (
            <div className="record-list">
              {routeAssignments.slice(0, 8).map((assignment) => (
                <div className="record-list-item" key={assignment.id}>
                  <div>
                    <strong>{assignment.route_code || "Route Assignment"}</strong>
                    <span>{formatStatus(assignment.status)}</span>
                  </div>

                  <div className="record-list-meta">
                    <span>{formatDate(assignment.started_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Maintenance</span>
              <h2>Service History</h2>
            </div>

            <button type="button" className="button button-secondary button-small" onClick={() => navigateTo("Maintenance")}>
              Open Maintenance
            </button>
          </div>

          {maintenance.length === 0 ? (
            <div className="empty-state compact">
              <strong>No service records</strong>
              <span>No maintenance history is recorded for this vehicle.</span>
            </div>
          ) : (
            <div className="record-list">
              {maintenance.slice(0, 8).map((record) => (
                <div className="record-list-item" key={record.id}>
                  <div>
                    <strong>{record.maintenance_type || "Service"}</strong>
                    <span>{record.description || "No description provided."}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Defects</span>
              <h2>Vehicle Defects</h2>
            </div>

            <span className="panel-count">{defects.length}</span>
          </div>

          {defects.length === 0 ? (
            <div className="empty-state compact">
              <strong>No defects recorded</strong>
              <span>This vehicle has no recorded defects.</span>
            </div>
          ) : (
            <div className="record-list">
              {defects.slice(0, 8).map((defect) => (
                <div className="record-list-item" key={defect.id}>
                  <div>
                    <strong>{defect.item || defect.category || "Vehicle defect"}</strong>
                    <span>{defect.description || "No description provided."}</span>
                  </div>

                  <div className="record-list-meta">
                    <span className={getDefectClass(defect.status)}>
                      {formatStatus(defect.status)}
                    </span>
                    <span>{formatDate(defect.reported_at || defect.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Compliance</span>
              <h2>Inspection History</h2>
            </div>

            <button type="button" className="button button-secondary button-small" onClick={() => navigateTo("Audits")}>
              Open Audits
            </button>
          </div>

          {audits.length === 0 ? (
            <div className="empty-state compact">
              <strong>No inspections</strong>
              <span>No audit records are associated with this vehicle.</span>
            </div>
          ) : (
            <div className="record-list">
              {audits.slice(0, 8).map((audit) => (
                <div className="record-list-item" key={audit.id}>
                  <div>
                    <strong>{audit.audit_type || "Inspection"}</strong>
                    <span>{audit.notes || "No inspection notes."}</span>
                  </div>

                  <div className="record-list-meta">
                    <strong>{formatStatus(audit.result)}</strong>
                    <span>{formatDate(audit.completed_at || audit.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">History</span>
              <h2>Vehicle Events</h2>
            </div>

            <span className="panel-count">{events.length}</span>
          </div>

          {events.length === 0 ? (
            <div className="empty-state compact">
              <strong>No vehicle events</strong>
              <span>No historical events are currently recorded.</span>
            </div>
          ) : (
            <div className="record-list">
              {events.slice(0, 8).map((event) => (
                <div className="record-list-item" key={event.id}>
                  <div>
                    <strong>{event.event_type || "Vehicle Event"}</strong>
                    <span>{event.description || "No event description."}</span>
                  </div>

                  <div className="record-list-meta">
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Vehicle Record</span>
            <h2>Notes</h2>
          </div>
        </div>

        <div className="vehicle-notes">
          {vehicle.notes ? vehicle.notes : "No vehicle notes have been recorded."}
        </div>
      </div>
    </section>
  );
}

function Drivers({ canEdit, openDriverDetails }) {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data, error: queryError } = await supabase.from("drivers").select(`
      id,
      roblox_user_id,
      name,
      employee_number,
      status,
      current_vehicle_id,
      current_route_id,
      created_at,
      updated_at,
      current_vehicle:vehicles!drivers_current_vehicle_id_fkey(
        id,
        fleet_number,
        year,
        make,
        model,
        garage,
        status
      ),
      current_route:routes!drivers_current_route_id_fkey(
        id,
        name,
        route_code,
        status
      )
    `).order("name");

    if (queryError) {
      setError(queryError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const { data: liveData, error: liveError } = await supabase.from("fleet_live").select("driver_id,fleet_number,driver_name,route_name,last_ping,effective_status");

    if (liveError) {
      setError(liveError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const liveMap = new Map((liveData || []).filter((item) => item.driver_id).map((item) => [item.driver_id, item]));

    const enriched = (data || []).map((driver) => {
      const live = liveMap.get(driver.id);

      return {
        ...driver,
        live,
        operationalStatus: live ? "ACTIVE" : "OFFLINE",
      };
    });

    setDrivers(enriched);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadData(true);

    const interval = window.setInterval(() => {
      loadData(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  async function deleteDriver(driver) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete driver "${driver.name || "Unnamed Driver"}"?\n\nThis removes the driver from the personnel directory. Historical assignments, audits, and route records will be retained without the deleted driver attached.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(driver.id);
    setError("");
    setMessage("");

    const { error: vehicleError } = await supabase.from("vehicles").update({ current_driver_id: null }).eq("current_driver_id", driver.id);

    if (vehicleError) {
      setError(vehicleError.message);
      setDeletingId(null);
      return;
    }

    const { error: assignmentError } = await supabase.from("assignments").update({ driver_id: null }).eq("driver_id", driver.id);

    if (assignmentError) {
      setError(assignmentError.message);
      setDeletingId(null);
      return;
    }

    const { error: routeAssignmentError } = await supabase.from("route_assignments").update({ driver_id: null }).eq("driver_id", driver.id);

    if (routeAssignmentError) {
      setError(routeAssignmentError.message);
      setDeletingId(null);
      return;
    }

    const { error: auditError } = await supabase.from("audits").update({ driver_id: null }).eq("driver_id", driver.id);

    if (auditError) {
      setError(auditError.message);
      setDeletingId(null);
      return;
    }

    const { error: stateError } = await supabase.from("vehicle_current_state").update({ driver_id: null }).eq("driver_id", driver.id);

    if (stateError) {
      setError(stateError.message);
      setDeletingId(null);
      return;
    }

    const { error: driverError } = await supabase.from("drivers").delete().eq("id", driver.id);

    if (driverError) {
      setError(driverError.message);
      setDeletingId(null);
      return;
    }

    setDrivers((current) => current.filter((item) => item.id !== driver.id));
    setMessage(`${driver.name || "Driver"} was deleted.`);
    setDeletingId(null);
  }

  const filteredDrivers = drivers.filter((driver) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      driver.name,
      driver.employee_number,
      driver.roblox_user_id,
      driver.current_vehicle?.fleet_number,
      driver.current_route?.route_code,
      driver.current_route?.name,
    ].some((value) => value?.toString().toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || driver.operationalStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = drivers.filter((driver) => driver.operationalStatus === "ACTIVE").length;
  const assignedCount = drivers.filter((driver) => driver.current_vehicle || driver.current_route).length;
  const offlineCount = drivers.filter((driver) => driver.operationalStatus === "OFFLINE").length;

  function formatTelemetry(timestamp) {
    if (!timestamp) {
      return "No telemetry";
    }

    const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
    const seconds = Math.floor(elapsed / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    return new Date(timestamp).toLocaleDateString();
  }

  return (
    <section className="page-section drivers-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">PERSONNEL / DRIVER OPERATIONS</span>
          <h2>Drivers</h2>
          <p>Driver records, current assignments, and live operating status.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button type="button" className="button button-primary" onClick={() => openDriverDetails(null)}>
              Add Driver
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="panel panel-success">
          <div className="panel-alert-title">Driver record updated</div>
          <div className="panel-alert-copy">{message}</div>
        </div>
      )}

      {error && (
        <div className="panel panel-alert">
          <div className="panel-alert-title">Driver operation failed</div>
          <div className="panel-alert-copy">{error}</div>
        </div>
      )}

      <div className="dashboard-kpi-grid driver-stat-grid">
        <DashboardKpi
          label="Total Drivers"
          value={drivers.length}
          detail="Personnel records"
          icon="fleet"
        />

        <DashboardKpi
          label="Active"
          value={activeCount}
          detail="Currently transmitting"
          icon="active"
        />

        <DashboardKpi
          label="Assigned"
          value={assignedCount}
          detail="Vehicle or route assignment"
          icon="assigned"
        />

        <DashboardKpi
          label="Offline"
          value={offlineCount}
          detail="No active telemetry"
          icon="out-of-service"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">DRIVER DIRECTORY</span>
            <h3>Personnel Records</h3>
          </div>

          <span className="panel-count">
            {filteredDrivers.length} of {drivers.length}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, employee number, fleet, or route"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      ACTIVE: "Active",
                      OFFLINE: "Offline",
                    }[statusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["ACTIVE", "Active"],
                      ["OFFLINE", "Offline"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${statusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Status</th>
                <th>Vehicle</th>
                <th>Route</th>
                <th>Telemetry</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading && drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading driver records...
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No drivers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className="table-primary">{driver.name || "Unnamed Driver"}</div>
                      <div className="table-secondary">
                        {driver.employee_number || "No employee number"} · Roblox {driver.roblox_user_id || "—"}
                      </div>
                    </td>

                    <td>
                      <span className={`status-badge status-${driver.operationalStatus.toLowerCase()}`}>
                        <span className="status-badge-dot" />
                        {driver.operationalStatus === "ACTIVE" ? "Active" : "Offline"}
                      </span>
                    </td>

                    <td>
                      {driver.current_vehicle ? (
                        <>
                          <div className="table-primary">{driver.current_vehicle.fleet_number}</div>
                          <div className="table-secondary">
                            {driver.current_vehicle.year} {driver.current_vehicle.make} {driver.current_vehicle.model}
                          </div>
                        </>
                      ) : (
                        <span className="table-muted">Unassigned</span>
                      )}
                    </td>

                    <td>
                      {driver.current_route ? (
                        <>
                          <div className="table-primary">{driver.current_route.route_code || driver.current_route.name}</div>
                          <div className="table-secondary">{driver.current_route.name}</div>
                        </>
                      ) : (
                        <span className="table-muted">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatTelemetry(driver.live?.last_ping)}
                      </span>
                    </td>

                    <td className="table-action-cell">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => openDriverDetails(driver.id)}
                        >
                          View
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            className="button button-danger button-small"
                            onClick={() => deleteDriver(driver)}
                            disabled={deletingId === driver.id}
                          >
                            {deletingId === driver.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DriverDetails({ canEdit, driverId, returnToDrivers }) {
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [route, setRoute] = useState(null);
  const [live, setLive] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [routeAssignments, setRouteAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    if (!driverId) {
      setError("No driver was selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data: driverData, error: driverError } = await supabase.from("drivers").select("*").eq("id", driverId).single();

    if (driverError) {
      setError(driverError.message);
      setLoading(false);
      return;
    }

    const [
      { data: vehicleData, error: vehicleError },
      { data: routeData, error: routeError },
      { data: liveData, error: liveError },
      { data: assignmentData, error: assignmentError },
      { data: routeAssignmentData, error: routeAssignmentError },
      { data: sessionData, error: sessionError },
      { data: auditData, error: auditError },
    ] = await Promise.all([
      driverData.current_vehicle_id
        ? supabase.from("vehicles").select("id,fleet_number,year,make,model,engine,mileage,status,garage,notes,updated_at").eq("id", driverData.current_vehicle_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      driverData.current_route_id
        ? supabase.from("routes").select("id,name,route_code,description,status,updated_at").eq("id", driverData.current_route_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      supabase.from("fleet_live").select("*").eq("driver_id", driverId).maybeSingle(),

      supabase.from("assignments").select("id,vehicle_id,driver_id,route_id,status,started_at,ended_at,notes,route_number").eq("driver_id", driverId).order("started_at", { ascending: false }).limit(10),

      supabase.from("route_assignments").select("id,route_id,route_code,driver_id,vehicle_id,status,started_at,ended_at,created_at,updated_at").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(10),

      driverData.roblox_user_id
        ? supabase.from("driver_sessions").select("id,roblox_user_id,server_id,player_name,last_seen").eq("roblox_user_id", driverData.roblox_user_id).order("last_seen", { ascending: false }).limit(10)
        : Promise.resolve({ data: [], error: null }),

      supabase.from("audits").select("id,vehicle_id,driver_id,audit_type,result,checklist,notes,completed_at,created_at").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (vehicleError || routeError || liveError || assignmentError || routeAssignmentError || sessionError || auditError) {
      const firstError = vehicleError || routeError || liveError || assignmentError || routeAssignmentError || sessionError || auditError;
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setDriver(driverData);
    setVehicle(vehicleData);
    setRoute(routeData);
    setLive(liveData);
    setAssignments(assignmentData || []);
    setRouteAssignments(routeAssignmentData || []);
    setSessions(sessionData || []);
    setAudits(auditData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const interval = window.setInterval(loadData, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [driverId]);

  function formatDate(timestamp, includeTime = true) {
    if (!timestamp) {
      return "—";
    }

    const date = new Date(timestamp);

    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  }

  function formatRelative(timestamp) {
    if (!timestamp) {
      return "No telemetry";
    }

    const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
  }

  if (loading && !driver) {
    return (
      <section className="page-section driver-details-page">
        <div className="detail-loading">
          <span className="loading-indicator" />
          <span>Loading driver record...</span>
        </div>
      </section>
    );
  }

  if (!driver) {
    return (
      <section className="page-section driver-details-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">PERSONNEL / DRIVER RECORD</span>
            <h2>Driver Details</h2>
          </div>

          <div className="page-intro-actions">
            <button type="button" className="button button-secondary" onClick={returnToDrivers}>
              Back to Drivers
            </button>
          </div>
        </div>

        <div className="panel panel-alert">
          <div className="panel-alert-title">Driver not found</div>
          <div className="panel-alert-copy">{error || "The requested driver record could not be found."}</div>
        </div>
      </section>
    );
  }

  const active = Boolean(live);

  return (
    <section className="page-section driver-details-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <div className="detail-breadcrumb">
            <button type="button" className="text-button" onClick={returnToDrivers}>
              Drivers
            </button>
            <span>/</span>
            <span>Driver Details</span>
          </div>

          <span className="eyebrow">PERSONNEL / DRIVER RECORD</span>

          <div className="detail-title-row">
            <div>
              <h2>{driver.name || "Unnamed Driver"}</h2>
              <p>{driver.employee_number ? `Employee ${driver.employee_number}` : "No employee number assigned"}</p>
            </div>

            <span className={`status-badge status-${active ? "active" : "offline"}`}>
              <span className="status-badge-dot" />
              {active ? "Active" : "Offline"}
            </span>
          </div>
        </div>

        <div className="page-intro-actions">
          <button type="button" className="button button-secondary" onClick={returnToDrivers}>
            Back to Drivers
          </button>

          <button type="button" className="button button-secondary" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="panel panel-alert">
          <div className="panel-alert-title">Some driver data could not be loaded</div>
          <div className="panel-alert-copy">{error}</div>
        </div>
      )}

      <div className="detail-kpi-grid">
        <div className="stat-card">
          <span className="stat-card-label">Current Vehicle</span>
          <strong className="stat-card-value">{vehicle?.fleet_number || "—"}</strong>
          <span className="stat-card-meta">
            {vehicle ? `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim() : "No vehicle assigned"}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Current Route</span>
          <strong className="stat-card-value">{route?.route_code || "—"}</strong>
          <span className="stat-card-meta">{route?.name || "No route assigned"}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Live Speed</span>
          <strong className="stat-card-value">{live ? `${Math.round(Number(live.speed) || 0)} MPH` : "—"}</strong>
          <span className="stat-card-meta">{live ? `Updated ${formatRelative(live.last_ping)}` : "No active telemetry"}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Audit Records</span>
          <strong className="stat-card-value">{audits.length}</strong>
          <span className="stat-card-meta">Recent driver-linked inspections</span>
        </div>
      </div>

      <div className="content-grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">DRIVER PROFILE</span>
              <h3>Personnel Information</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list-row">
              <span>Name</span>
              <strong>{driver.name || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Employee Number</span>
              <strong>{driver.employee_number || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Roblox User ID</span>
              <strong className="table-mono">{driver.roblox_user_id || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>System Status</span>
              <strong>{driver.status || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Record Created</span>
              <strong>{formatDate(driver.created_at, false)}</strong>
            </div>

            <div className="detail-list-row">
              <span>Last Updated</span>
              <strong>{formatDate(driver.updated_at)}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">CURRENT ASSIGNMENT</span>
              <h3>Operational Assignment</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list-row">
              <span>Vehicle</span>
              <strong>{vehicle?.fleet_number || "Unassigned"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Vehicle Status</span>
              <strong>{vehicle?.status || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Garage</span>
              <strong>{vehicle?.garage || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Route</span>
              <strong>{route?.route_code || route?.name || "Unassigned"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Route Status</span>
              <strong>{route?.status || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Telemetry</span>
              <span className={`status-badge status-${active ? "active" : "offline"}`}>
                <span className="status-badge-dot" />
                {active ? "Active" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {live && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">LIVE TELEMETRY</span>
              <h3>Current Vehicle Telemetry</h3>
            </div>

            <div className="panel-header-meta">
              <span>Updated {formatRelative(live.last_ping)}</span>
            </div>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span>Speed</span>
              <strong>{Math.round(Number(live.speed) || 0)} MPH</strong>
            </div>

            <div className="telemetry-item">
              <span>RPM</span>
              <strong>{Math.round(Number(live.rpm) || 0).toLocaleString()}</strong>
            </div>

            <div className="telemetry-item">
              <span>Heading</span>
              <strong>{Math.round(Number(live.heading) || 0)}°</strong>
            </div>

            <div className="telemetry-item">
              <span>Coolant</span>
              <strong>{live.coolant_temp != null ? `${Math.round(Number(live.coolant_temp))}°` : "—"}</strong>
            </div>

            <div className="telemetry-item">
              <span>Oil</span>
              <strong>{live.oil_temp != null ? `${Math.round(Number(live.oil_temp))}°` : "—"}</strong>
            </div>

            <div className="telemetry-item">
              <span>Status</span>
              <strong>{live.effective_status || "ONLINE"}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="content-grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">ASSIGNMENT HISTORY</span>
              <h3>Vehicle Assignments</h3>
            </div>

            <div className="panel-header-meta">
              <span>{assignments.length} records</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>

              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="table-empty">
                      No vehicle assignment history.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="table-primary">{assignment.route_number || "No route number"}</div>
                        <div className="table-secondary">
                          {assignment.notes || "Vehicle assignment"}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge status-${(assignment.status || "unknown").toLowerCase()}`}>
                          {assignment.status || "Unknown"}
                        </span>
                      </td>

                      <td>{formatDate(assignment.started_at)}</td>
                      <td>{formatDate(assignment.ended_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">ROUTE HISTORY</span>
              <h3>Route Assignments</h3>
            </div>

            <div className="panel-header-meta">
              <span>{routeAssignments.length} records</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>

              <tbody>
                {routeAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="table-empty">
                      No route assignment history.
                    </td>
                  </tr>
                ) : (
                  routeAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="table-primary">{assignment.route_code || "—"}</div>
                        <div className="table-secondary">
                          Route assignment
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge status-${(assignment.status || "unknown").toLowerCase()}`}>
                          {assignment.status || "Unknown"}
                        </span>
                      </td>

                      <td>{formatDate(assignment.started_at)}</td>
                      <td>{formatDate(assignment.ended_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="content-grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">SERVER ACTIVITY</span>
              <h3>Recent Sessions</h3>
            </div>

            <div className="panel-header-meta">
              <span>{sessions.length} records</span>
            </div>
          </div>

          <div className="activity-list">
            {sessions.length === 0 ? (
              <div className="empty-state">
                <strong>No session history</strong>
                <span>No Roblox driver sessions have been recorded.</span>
              </div>
            ) : (
              sessions.map((session) => (
                <div className="activity-list-item" key={session.id}>
                  <div className="activity-list-marker" />

                  <div className="activity-list-copy">
                    <strong>{session.player_name || driver.name}</strong>
                    <span>Server {session.server_id ? session.server_id.slice(0, 8) : "—"}</span>
                  </div>

                  <div className="activity-list-time">
                    {formatDate(session.last_seen)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">INSPECTION RECORDS</span>
              <h3>Recent Audits</h3>
            </div>

            <div className="panel-header-meta">
              <span>{audits.length} records</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Completed</th>
                </tr>
              </thead>

              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="table-empty">
                      No driver-linked audits.
                    </td>
                  </tr>
                ) : (
                  audits.map((audit) => (
                    <tr key={audit.id}>
                      <td>
                        <div className="table-primary">{audit.audit_type || "Inspection"}</div>
                        <div className="table-secondary">
                          Created {formatDate(audit.created_at)}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge status-${(audit.result || "pending").toLowerCase()}`}>
                          {audit.result || "Pending"}
                        </span>
                      </td>

                      <td>{formatDate(audit.completed_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Assignments({ canEdit }) {
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endingId, setEndingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const [formVehicleId, setFormVehicleId] = useState("");
  const [formDriverId, setFormDriverId] = useState("");
  const [formRouteNumber, setFormRouteNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");

  async function loadData(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data: assignmentData, error: assignmentError } = await supabase.from("assignments").select(`
      id,
      vehicle_id,
      driver_id,
      route_number,
      status,
      started_at,
      ended_at,
      notes
    `).order("started_at", { ascending: false });

    if (assignmentError) {
      setError(assignmentError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const { data: vehicleData, error: vehicleError } = await supabase.from("vehicles").select(`
      id,
      fleet_number,
      year,
      make,
      model,
      garage,
      status,
      current_driver_id
    `).order("fleet_number");

    if (vehicleError) {
      setError(vehicleError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const { data: driverData, error: driverError } = await supabase.from("drivers").select(`
      id,
      name,
      employee_number,
      roblox_user_id,
      status,
      current_vehicle_id
    `).order("name");

    if (driverError) {
      setError(driverError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const vehicleMap = new Map((vehicleData || []).map((vehicle) => [vehicle.id, vehicle]));
    const driverMap = new Map((driverData || []).map((driver) => [driver.id, driver]));

    const enrichedAssignments = (assignmentData || []).map((assignment) => ({
      ...assignment,
      vehicle: vehicleMap.get(assignment.vehicle_id) || null,
      driver: driverMap.get(assignment.driver_id) || null,
    }));

    setAssignments(enrichedAssignments);
    setVehicles(vehicleData || []);
    setDrivers(driverData || []);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadData(true);

    const interval = window.setInterval(() => {
      loadData(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function resetForm() {
    setEditingAssignment(null);
    setFormVehicleId("");
    setFormDriverId("");
    setFormRouteNumber("");
    setFormNotes("");
    setShowForm(false);
  }

  function openNewAssignment() {
    setError("");
    setMessage("");
    setEditingAssignment(null);
    setFormVehicleId("");
    setFormDriverId("");
    setFormRouteNumber("");
    setFormNotes("");
    setShowForm(true);
  }

  function openEditAssignment(assignment) {
    setError("");
    setMessage("");
    setEditingAssignment(assignment);
    setFormVehicleId(assignment.vehicle_id || "");
    setFormDriverId(assignment.driver_id || "");
    setFormRouteNumber(assignment.route_number || "");
    setFormNotes(assignment.notes || "");
    setShowForm(true);
  }

  async function saveAssignment(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!formVehicleId || !formDriverId || !formRouteNumber.trim()) {
      setError("Bus, driver, and route number are required.");
      return;
    }

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === formVehicleId);
    const selectedDriver = drivers.find((driver) => driver.id === formDriverId);

    if (!selectedVehicle) {
      setError("The selected vehicle could not be found.");
      return;
    }

    if (!selectedDriver) {
      setError("The selected driver could not be found.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (editingAssignment) {
      const oldVehicleId = editingAssignment.vehicle_id;
      const oldDriverId = editingAssignment.driver_id;

      const { error: assignmentError } = await supabase.from("assignments").update({
        vehicle_id: formVehicleId,
        driver_id: formDriverId,
        route_number: formRouteNumber.trim(),
        notes: formNotes.trim() || null,
      }).eq("id", editingAssignment.id);

      if (assignmentError) {
        setError(assignmentError.message);
        setSaving(false);
        return;
      }

      if (oldVehicleId !== formVehicleId) {
        const { error: oldVehicleError } = await supabase.from("vehicles").update({ current_driver_id: null }).eq("id", oldVehicleId).eq("current_driver_id", oldDriverId);

        if (oldVehicleError) {
          setError(oldVehicleError.message);
          setSaving(false);
          return;
        }

        const { error: newVehicleError } = await supabase.from("vehicles").update({ current_driver_id: formDriverId }).eq("id", formVehicleId);

        if (newVehicleError) {
          setError(newVehicleError.message);
          setSaving(false);
          return;
        }
      } else {
        const { error: vehicleError } = await supabase.from("vehicles").update({ current_driver_id: formDriverId }).eq("id", formVehicleId);

        if (vehicleError) {
          setError(vehicleError.message);
          setSaving(false);
          return;
        }
      }

      if (oldDriverId !== formDriverId) {
        const { error: oldDriverError } = await supabase.from("drivers").update({ current_vehicle_id: null }).eq("id", oldDriverId).eq("current_vehicle_id", oldVehicleId);

        if (oldDriverError) {
          setError(oldDriverError.message);
          setSaving(false);
          return;
        }
      }

      const { error: driverError } = await supabase.from("drivers").update({ current_vehicle_id: formVehicleId }).eq("id", formDriverId);

      if (driverError) {
        setError(driverError.message);
        setSaving(false);
        return;
      }

      setMessage("Assignment updated successfully.");
      resetForm();
      setSaving(false);
      await loadData(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("assign_vehicle", {
      p_fleet_number: selectedVehicle.fleet_number,
      p_driver_id: formDriverId,
      p_route_number: formRouteNumber.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    const { data: createdAssignment, error: createdAssignmentError } = await supabase.from("assignments").select("id").eq("vehicle_id", formVehicleId).eq("driver_id", formDriverId).eq("status", "ACTIVE").order("started_at", { ascending: false }).limit(1).maybeSingle();

    if (createdAssignmentError) {
      setError(createdAssignmentError.message);
      setSaving(false);
      return;
    }

    if (createdAssignment?.id) {
      const { error: notesError } = await supabase.from("assignments").update({
        notes: formNotes.trim() || null,
      }).eq("id", createdAssignment.id);

      if (notesError) {
        setError(notesError.message);
        setSaving(false);
        return;
      }
    }

    setMessage(`${selectedVehicle.fleet_number} was assigned to ${selectedDriver.name || "the selected driver"}.`);
    resetForm();
    setSaving(false);
    await loadData(false);
  }

  async function endAssignment(assignment) {
    if (endingId) {
      return;
    }

    const confirmed = window.confirm(
      `End the assignment for bus ${assignment.vehicle?.fleet_number || "Unknown"}?\n\nThis will end the driver's current assignment and move the record into assignment history.`
    );

    if (!confirmed) {
      return;
    }

    setEndingId(assignment.id);
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc("end_vehicle_assignment", {
      p_fleet_number: assignment.vehicle?.fleet_number,
    });

    if (rpcError) {
      setError(rpcError.message);
      setEndingId(null);
      return;
    }

    setMessage(`Assignment for ${assignment.vehicle?.fleet_number || "the selected vehicle"} was ended.`);
    setEndingId(null);
    await loadData(false);
  }

  const activeAssignments = assignments.filter((assignment) => {
    return String(assignment.status || "").toUpperCase() === "ACTIVE";
  });

  const historyAssignments = assignments.filter((assignment) => {
    return String(assignment.status || "").toUpperCase() !== "ACTIVE";
  });

  const assignedVehicleIds = new Set(activeAssignments.map((assignment) => assignment.vehicle_id));
  const assignedDriverIds = new Set(activeAssignments.map((assignment) => assignment.driver_id));

  const availableVehicleCount = vehicles.filter((vehicle) => {
    return !assignedVehicleIds.has(vehicle.id) && String(vehicle.status || "").toUpperCase() !== "OUT_OF_SERVICE" && String(vehicle.status || "").toUpperCase() !== "MAINTENANCE";
  }).length;

  const availableDriverCount = drivers.filter((driver) => {
    return !assignedDriverIds.has(driver.id);
  }).length;

  const filteredAssignments = activeAssignments.filter((assignment) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      assignment.vehicle?.fleet_number,
      assignment.vehicle?.garage,
      assignment.vehicle?.year,
      assignment.vehicle?.make,
      assignment.vehicle?.model,
      assignment.driver?.name,
      assignment.driver?.employee_number,
      assignment.route_number,
      assignment.notes,
    ].some((value) => value?.toString().toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || String(assignment.status || "").toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function formatDate(timestamp) {
    if (!timestamp) {
      return "—";
    }

    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDuration(startedAt, endedAt) {
    if (!startedAt) {
      return "—";
    }

    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const elapsed = Math.max(0, end - start);

    const minutes = Math.floor(elapsed / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  const availableFormVehicles = vehicles.filter((vehicle) => {
    if (editingAssignment?.vehicle_id === vehicle.id) {
      return true;
    }

    return !assignedVehicleIds.has(vehicle.id) && String(vehicle.status || "").toUpperCase() !== "OUT_OF_SERVICE" && String(vehicle.status || "").toUpperCase() !== "MAINTENANCE";
  }).sort((a, b) => {
    const garageOrder = {
      CLIO: 0,
      MAPLECREST: 1,
    };

    const garageA = garageOrder[String(a.garage || "").toUpperCase()] ?? 99;
    const garageB = garageOrder[String(b.garage || "").toUpperCase()] ?? 99;

    if (garageA !== garageB) {
      return garageA - garageB;
    }

    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;

    if (yearA !== yearB) {
      return yearA - yearB;
    }

    return String(a.fleet_number || "").localeCompare(String(b.fleet_number || ""), undefined, { numeric: true });
  });

  const availableFormDrivers = drivers.filter((driver) => {
    if (editingAssignment?.driver_id === driver.id) {
      return true;
    }

    return !assignedDriverIds.has(driver.id);
  }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  return (
    <section className="page-section assignments-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">FLEET OPERATIONS / ASSIGNMENTS</span>
          <h2>Assignments</h2>
          <p>Manage current driver, vehicle, and route assignments.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button
              type="button"
              className="button button-primary"
              onClick={openNewAssignment}
            >
              New Assignment
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="panel panel-success">
          <div className="panel-alert-title">Assignment updated</div>
          <div className="panel-alert-copy">{message}</div>
        </div>
      )}

      {error && (
        <div className="panel panel-alert">
          <div className="panel-alert-title">Assignment operation failed</div>
          <div className="panel-alert-copy">{error}</div>
        </div>
      )}

      <div className="dashboard-kpi-grid assignment-stat-grid">
        <DashboardKpi
          label="Active Assignments"
          value={activeAssignments.length}
          detail="Currently assigned"
          icon="assigned"
        />

        <DashboardKpi
          label="Assigned Buses"
          value={assignedVehicleIds.size}
          detail="Currently in service"
          icon="active"
        />

        <DashboardKpi
          label="Available Buses"
          value={availableVehicleCount}
          detail="Ready for assignment"
          icon="available"
        />

        <DashboardKpi
          label="Assignment History"
          value={historyAssignments.length}
          detail="Completed records"
          icon="fleet"
        />
      </div>

      {showForm && canEdit && (
        <section className="panel assignment-form-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                {editingAssignment ? "ASSIGNMENT MANAGEMENT" : "NEW ASSIGNMENT"}
              </span>
              <h3>{editingAssignment ? "Edit Assignment" : "Create Assignment"}</h3>
            </div>
          </div>

          <form className="assignment-form" onSubmit={saveAssignment}>
            <div className="form-grid form-grid-three">
              <label className="form-field">
                <span>Bus</span>

                <select
                  value={formVehicleId}
                  onChange={(event) => setFormVehicleId(event.target.value)}
                  required
                >
                  <option value="">Select bus</option>

                  {availableFormVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.fleet_number} — {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Driver</span>

                <select
                  value={formDriverId}
                  onChange={(event) => setFormDriverId(event.target.value)}
                  required
                >
                  <option value="">Select driver</option>

                  {availableFormDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}{driver.employee_number ? ` — ${driver.employee_number}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Route Number</span>

                <input
                  type="text"
                  value={formRouteNumber}
                  onChange={(event) => setFormRouteNumber(event.target.value)}
                  placeholder="e.g. 16-A1"
                  required
                />
              </label>

              <label className="form-field form-field-wide">
                <span>Notes <span className="form-optional">Optional</span></span>

                <textarea
                  value={formNotes}
                  onChange={(event) => setFormNotes(event.target.value)}
                  placeholder="Add assignment notes if needed..."
                />
              </label>
            </div>

            <div className="assignment-form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : editingAssignment ? "Save Changes" : "Assign Vehicle"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">CURRENT ASSIGNMENTS</span>
            <h3>Active Fleet Assignments</h3>
          </div>

          <span className="panel-count">
            {filteredAssignments.length} of {activeAssignments.length}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Fleet, driver, route, or notes"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      ACTIVE: "Active",
                    }[statusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["ACTIVE", "Active"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${statusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Started</th>
                <th>Duration</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading && assignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading assignments...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No current assignments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <div className="table-primary">
                        {assignment.vehicle?.fleet_number || "Unknown"}
                      </div>

                      <div className="table-secondary">
                        {assignment.vehicle
                          ? `${assignment.vehicle.year || ""} ${assignment.vehicle.make || ""} ${assignment.vehicle.model || ""}`.trim()
                          : "Vehicle unavailable"}
                      </div>
                    </td>

                    <td>
                      <div className="table-primary">
                        {assignment.driver?.name || "Unknown Driver"}
                      </div>

                      <div className="table-secondary">
                        {assignment.driver?.employee_number || "No employee number"}
                      </div>
                    </td>

                    <td>
                      <div className="table-primary">
                        {assignment.route_number || "—"}
                      </div>

                      {assignment.notes && (
                        <div className="table-secondary">
                          {assignment.notes}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatDate(assignment.started_at)}
                      </span>
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatDuration(assignment.started_at)}
                      </span>
                    </td>

                    <td className="table-action-cell">
                      <div className="table-actions">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => openEditAssignment(assignment)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="button button-danger button-small"
                              onClick={() => endAssignment(assignment)}
                              disabled={endingId === assignment.id}
                            >
                              {endingId === assignment.id ? "Ending..." : "End"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">ASSIGNMENT HISTORY</span>
            <h3>Completed Assignments</h3>
          </div>

          <span className="panel-count">
            {historyAssignments.length}
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Duration</th>
              </tr>
            </thead>

            <tbody>
              {loading && assignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading assignment history...
                  </td>
                </tr>
              ) : historyAssignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No completed assignments yet.
                  </td>
                </tr>
              ) : (
                historyAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <div className="table-primary">
                        {assignment.vehicle?.fleet_number || "Unknown"}
                      </div>

                      <div className="table-secondary">
                        {assignment.vehicle?.garage || "Unknown garage"}
                      </div>
                    </td>

                    <td>
                      <div className="table-primary">
                        {assignment.driver?.name || "Unknown Driver"}
                      </div>

                      <div className="table-secondary">
                        {assignment.driver?.employee_number || "No employee number"}
                      </div>
                    </td>

                    <td>
                      <div className="table-primary">
                        {assignment.route_number || "—"}
                      </div>

                      {assignment.notes && (
                        <div className="table-secondary">
                          {assignment.notes}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatDate(assignment.started_at)}
                      </span>
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatDate(assignment.ended_at)}
                      </span>
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatDuration(assignment.started_at, assignment.ended_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Routes({ canEdit }) {
  const [routes, setRoutes] = useState([]);
  const [routePointCounts, setRoutePointCounts] = useState({});
  const [routeUsage, setRouteUsage] = useState({});
  const [allRoutesOpen, setAllRoutesOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDetails, setEditingDetails] = useState(null);
  const [routeCode, setRouteCode] = useState("");
  const [editRouteCode, setEditRouteCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadRoutes(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    try {
      const [
        { data: routeData, error: routeError },
        { data: pointData, error: pointError },
        { data: assignmentData, error: assignmentError },
        { data: routeAssignmentData, error: routeAssignmentError },
      ] = await Promise.all([
        supabase.from("routes").select("*").order("name", { ascending: true }),
        supabase.from("route_points").select("route_id"),
        supabase.from("assignments").select("route_id,status"),
        supabase.from("route_assignments").select("route_id,status"),
      ]);

      if (routeError) {
        throw routeError;
      }

      if (pointError) {
        throw pointError;
      }

      if (assignmentError) {
        throw assignmentError;
      }

      if (routeAssignmentError) {
        throw routeAssignmentError;
      }

      const counts = {};

      (pointData || []).forEach((point) => {
        if (!point.route_id) {
          return;
        }

        counts[point.route_id] = (counts[point.route_id] || 0) + 1;
      });

      const usage = {};

      (assignmentData || []).forEach((assignment) => {
        if (!assignment.route_id) {
          return;
        }

        if (!usage[assignment.route_id]) {
          usage[assignment.route_id] = {
            assignments: 0,
            activeAssignments: 0,
            routeAssignments: 0,
            activeRouteAssignments: 0,
          };
        }

        usage[assignment.route_id].assignments += 1;

        if (assignment.status === "ACTIVE") {
          usage[assignment.route_id].activeAssignments += 1;
        }
      });

      (routeAssignmentData || []).forEach((assignment) => {
        if (!assignment.route_id) {
          return;
        }

        if (!usage[assignment.route_id]) {
          usage[assignment.route_id] = {
            assignments: 0,
            activeAssignments: 0,
            routeAssignments: 0,
            activeRouteAssignments: 0,
          };
        }

        usage[assignment.route_id].routeAssignments += 1;

        if (assignment.status === "ACTIVE" || assignment.status === "AWAITING") {
          usage[assignment.route_id].activeRouteAssignments += 1;
        }
      });

      setRoutes(routeData || []);
      setRoutePointCounts(counts);
      setRouteUsage(usage);
    } catch (err) {
      setError(err.message || "Unable to load routes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRoutes(true);

    const interval = window.setInterval(() => {
      loadRoutes(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [message]);

  function resetForm() {
    setRouteCode("");
    setEditRouteCode("");
    setName("");
    setDescription("");
    setEditingDetails(null);
  }

  async function createRoute(event) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const cleanCode = routeCode.trim();
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanCode || !cleanName) {
      setError("Route code and route name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: insertError } = await supabase.from("routes").insert({
        route_code: cleanCode,
        name: cleanName,
        description: cleanDescription || null,
        status: "ACTIVE",
      });

      if (insertError) {
        throw insertError;
      }

      setShowForm(false);
      resetForm();
      setMessage("Route created.");
      await loadRoutes(false);
    } catch (err) {
      setError(err.message || "Unable to create route.");
    } finally {
      setSaving(false);
    }
  }

  function openDetailsEditor(route) {
    setEditingDetails(route);
    setEditRouteCode(route.route_code || "");
    setName(route.name || "");
    setDescription(route.description || "");
    setError("");
  }

  async function saveRouteDetails(event) {
    event.preventDefault();

    if (!canEdit || !editingDetails) {
      return;
    }

    const cleanCode = editRouteCode.trim();
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanCode || !cleanName) {
      setError("Route code and route name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase.from("routes").update({
        route_code: cleanCode,
        name: cleanName,
        description: cleanDescription || null,
      }).eq("id", editingDetails.id);

      if (updateError) {
        throw updateError;
      }

      setEditingDetails(null);
      resetForm();
      setMessage("Route details updated.");
      await loadRoutes(false);
    } catch (err) {
      setError(err.message || "Unable to update route.");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateRoute(route) {
    if (!canEdit) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const baseCode = `${route.route_code || route.name || "ROUTE"}-COPY`;
      const baseName = `${route.name} Copy`;

      const { data: existingRoutes, error: existingError } = await supabase.from("routes").select("route_code,name");

      if (existingError) {
        throw existingError;
      }

      const existingCodes = new Set((existingRoutes || []).map((item) => item.route_code).filter(Boolean));
      const existingNames = new Set((existingRoutes || []).map((item) => item.name).filter(Boolean));

      let newCode = baseCode;
      let codeIndex = 2;

      while (existingCodes.has(newCode)) {
        newCode = `${baseCode}-${codeIndex}`;
        codeIndex += 1;
      }

      let newName = baseName;
      let nameIndex = 2;

      while (existingNames.has(newName)) {
        newName = `${baseName} ${nameIndex}`;
        nameIndex += 1;
      }

      const { data: newRoute, error: routeError } = await supabase.from("routes").insert({
        route_code: newCode,
        name: newName,
        description: route.description || null,
        status: route.status || "ACTIVE",
      }).select().single();

      if (routeError) {
        throw routeError;
      }

      const { data: sourcePoints, error: pointError } = await supabase.from("route_points").select("sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        throw pointError;
      }

      if (sourcePoints?.length) {
        const pointRows = sourcePoints.map((point, index) => ({
          route_id: newRoute.id,
          sequence: index + 1,
          x: point.x,
          y: point.y,
          z: point.z,
          point_type: point.point_type || "STRAIGHT",
        }));

        const { error: insertPointsError } = await supabase.from("route_points").insert(pointRows);

        if (insertPointsError) {
          await supabase.from("routes").delete().eq("id", newRoute.id);
          throw insertPointsError;
        }
      }

      setMessage(`Route duplicated as ${newName}.`);
      await loadRoutes(false);
    } catch (err) {
      setError(err.message || "Unable to duplicate route.");
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteRoute(route) {
    if (!canEdit) {
      return;
    }

    setDeleteTarget(route);
    setError("");
  }

  async function deleteRoute() {
    if (!canEdit || !deleteTarget) {
      return;
    }

    const route = deleteTarget;
    const usage = routeUsage[route.id];

    if (usage?.activeAssignments || usage?.activeRouteAssignments) {
      setError("This route cannot be deleted while it is actively assigned.");
      setDeleteTarget(null);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: pointError } = await supabase.from("route_points").delete().eq("route_id", route.id);

      if (pointError) {
        throw pointError;
      }

      const { error: routeError } = await supabase.from("routes").delete().eq("id", route.id);

      if (routeError) {
        throw routeError;
      }

      setDeleteTarget(null);
      setMessage(`${route.name} deleted.`);
      await loadRoutes(false);
    } catch (err) {
      setError(err.message || "Unable to delete route.");
    } finally {
      setSaving(false);
    }
  }

  const filteredRoutes = routes.filter((route) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      route.route_code,
      route.name,
      route.description,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || route.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = routes.filter((route) => route.status === "ACTIVE").length;
  const inactiveCount = routes.filter((route) => route.status === "INACTIVE").length;
  const totalPoints = routes.reduce((total, route) => total + (routePointCounts[route.id] || 0), 0);

  if (loading && routes.length === 0) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">ROUTE OPERATIONS</span>
            <h2>Routes</h2>
            <p>Loading route registry...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section routes-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">ROUTE OPERATIONS</span>
          <h2>Routes</h2>
          <p>Manage route definitions, geometry, status, and operational usage.</p>
        </div>

        <div className="page-intro-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setAllRoutesOpen(true)}
          >
            View All Routes
          </button>

          {canEdit && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
                setError("");
              }}
            >
              New Route
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadRoutes(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="panel panel-alert">
          <div className="panel-alert-title">Route operation failed</div>
          <div className="panel-alert-copy">{error}</div>
        </div>
      )}

      {message && (
        <div className="panel panel-success">
          <div className="panel-alert-title">Route updated</div>
          <div className="panel-alert-copy">{message}</div>
        </div>
      )}

      <div className="dashboard-kpi-grid route-stat-grid">
        <DashboardKpi
          label="Total Routes"
          value={routes.length}
          detail="Registered route definitions"
          icon="fleet"
        />

        <DashboardKpi
          label="Active Routes"
          value={activeCount}
          detail="Available for operations"
          icon="active"
        />

        <DashboardKpi
          label="Inactive Routes"
          value={inactiveCount}
          detail="Temporarily unavailable"
          icon="out-of-service"
        />

        <DashboardKpi
          label="Route Points"
          value={totalPoints}
          detail="Mapped geometry points"
          icon="assigned"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">ROUTE REGISTRY</span>
            <h3>Route Definitions</h3>
          </div>

          <span className="panel-count">
            {filteredRoutes.length} of {routes.length}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Route code, name, or description"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      ACTIVE: "Active",
                      INACTIVE: "Inactive",
                      ARCHIVED: "Archived",
                    }[statusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["ACTIVE", "Active"],
                      ["INACTIVE", "Inactive"],
                      ["ARCHIVED", "Archived"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${statusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {filteredRoutes.length === 0 ? (
          <div className="table-empty">
            No routes match the current filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Points</th>
                  <th>Usage</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredRoutes.map((route) => {
                  const usage = routeUsage[route.id] || {
                    assignments: 0,
                    activeAssignments: 0,
                    routeAssignments: 0,
                    activeRouteAssignments: 0,
                  };

                  return (
                    <tr key={route.id}>
                      <td>
                        <div className="table-primary">
                          {route.route_code || "—"}
                        </div>

                        <div className="table-secondary">
                          {route.name}
                        </div>
                      </td>

                      <td>
                        <span className="table-muted">
                          {route.description || "No description"}
                        </span>
                      </td>

                      <td>
                        <StatusBadge status={route.status} />
                      </td>

                      <td>
                        <strong>{routePointCounts[route.id] || 0}</strong>
                      </td>

                      <td>
                        <div className="table-primary">
                          {usage.activeAssignments + usage.activeRouteAssignments} active
                        </div>

                        <div className="table-secondary">
                          {usage.assignments + usage.routeAssignments} total
                        </div>
                      </td>

                      <td className="table-action-cell">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="button button-small button-secondary"
                            onClick={() => setPreviewRoute(route)}
                          >
                            Preview
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                className="button button-small button-secondary"
                                onClick={() => setEditingRoute(route)}
                              >
                                Edit Route
                              </button>

                              <button
                                type="button"
                                className="button button-small button-secondary"
                                onClick={() => openDetailsEditor(route)}
                              >
                                Edit Details
                              </button>

                              <button
                                type="button"
                                className="button button-small button-secondary"
                                onClick={() => duplicateRoute(route)}
                                disabled={saving}
                              >
                                Duplicate
                              </button>

                              <button
                                type="button"
                                className="button button-small button-danger"
                                onClick={() => requestDeleteRoute(route)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setShowForm(false);
          }
        }}>
          <div className="modal modal-medium">
            <div className="modal-header">
              <div>
                <span className="eyebrow">ROUTE REGISTRY</span>
                <h2>New Route</h2>
                <p>Create the route definition before adding geometry.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={createRoute}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input
                      value={routeCode}
                      onChange={(event) => setRouteCode(event.target.value)}
                      placeholder="e.g. 101A"
                      autoFocus
                    />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. North Elementary"
                    />
                  </label>

                  <label className="form-field form-field-wide">
                    <span>Description</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the route and its service area."
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? "Creating..." : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDetails && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setEditingDetails(null);
            resetForm();
          }
        }}>
          <div className="modal modal-medium">
            <div className="modal-header">
              <div>
                <span className="eyebrow">ROUTE REGISTRY</span>
                <h2>Edit Route Details</h2>
                <p>Update the route identity and description.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => {
                  setEditingDetails(null);
                  resetForm();
                }}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveRouteDetails}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input
                      value={editRouteCode}
                      onChange={(event) => setEditRouteCode(event.target.value)}
                      autoFocus
                    />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>

                  <label className="form-field form-field-wide">
                    <span>Description</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setEditingDetails(null);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setDeleteTarget(null);
          }
        }}>
          <div className="modal modal-small">
            <div className="modal-header">
              <div>
                <span className="eyebrow">DESTRUCTIVE ACTION</span>
                <h2>Delete Route</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Delete <strong>{deleteTarget.name}</strong> and all of its route points?
                This cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-danger"
                onClick={deleteRoute}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete Route"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRoute && (
        <RouteEditor
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSaved={() => {
            setEditingRoute(null);
            loadRoutes(false);
            setMessage("Route geometry saved.");
          }}
        />
      )}

      {previewRoute && (
        <RoutePreview
          route={previewRoute}
          onClose={() => setPreviewRoute(null)}
        />
      )}

      {allRoutesOpen && (
        <AllRoutesPreview
          routes={routes}
          onClose={() => setAllRoutesOpen(false)}
        />
      )}
    </section>
  );
}

function RouteEditor({ route, onClose, onSaved }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const lineLayerRef = useRef(null);
  const historyRef = useRef([]);

  const [points, setPoints] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clipboard, setClipboard] = useState(null);
  const [targetRouteId, setTargetRouteId] = useState("");
  const [routes, setRoutes] = useState([]);
  const [pointTypeDropdownOpen, setPointTypeDropdownOpen] = useState(false);

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const POINT_COLORS = {
    STRAIGHT: "#22c55e",
    TURN_RIGHT: "#3b82f6",
    TURN_LEFT: "#eab308",
    STOP_RIGHT: "#ef4444",
    STOP_LEFT: "#ef4444",
  };

  function mapToRoblox(lat, lng) {
    const x = (IMAGE_SIZE / 2 - lng) / PIXELS_PER_STUD;
    const z = (lat - IMAGE_SIZE / 2) / PIXELS_PER_STUD;

    return {
      x: Number(x.toFixed(3)),
      y: 0,
      z: Number(z.toFixed(3)),
    };
  }

  function robloxToMap(x, z) {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 + z * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  function normalizePoints(items) {
    return items.map((point, index) => ({
      id: point.id || `local-${Date.now()}-${index}`,
      sequence: index + 1,
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      z: Number(point.z) || 0,
      point_type: point.point_type || "STRAIGHT",
    }));
  }

  async function loadPoints() {
    setLoading(true);
    setError("");
    setSelectedIndex(null);
    setPointTypeDropdownOpen(false);

    try {
      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        throw pointError;
      }

      const normalized = normalizePoints(data || []);

      setPoints(normalized);
      historyRef.current = [];
    } catch (err) {
      setError(err.message || "Unable to load route points.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoutes() {
    const { data, error: routeError } = await supabase.from("routes").select("id,route_code,name").neq("id", route.id).order("name", { ascending: true });

    if (!routeError) {
      setRoutes(data || []);
    }
  }

  useEffect(() => {
    loadPoints();
    loadRoutes();
  }, [route.id]);

  function pushHistory(currentPoints) {
    historyRef.current = [...historyRef.current, structuredClone(currentPoints)].slice(-50);
  }

  function updatePoints(mutator, selectIndex = null) {
    setPoints((current) => {
      pushHistory(current);
      return normalizePoints(mutator(structuredClone(current)));
    });

    if (selectIndex !== null) {
      setSelectedIndex(selectIndex);
    }
  }

  function undoPoint() {
    const previous = historyRef.current.pop();

    if (!previous) {
      return;
    }

    setPoints(previous);

    if (!previous.length) {
      setSelectedIndex(null);
      setPointTypeDropdownOpen(false);
      return;
    }

    setSelectedIndex((current) => Math.min(current ?? 0, previous.length - 1));
    setPointTypeDropdownOpen(false);
  }

  function addPoint(latlng) {
    const coords = mapToRoblox(latlng.lat, latlng.lng);

    setPoints((current) => {
      pushHistory(current);

      const insertIndex = selectedIndex === null ? current.length : selectedIndex + 1;

      const newPoint = {
        id: `local-${Date.now()}-${Math.random()}`,
        sequence: insertIndex + 1,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        point_type: "STRAIGHT",
      };

      const next = [...current];

      next.splice(insertIndex, 0, newPoint);

      setSelectedIndex(insertIndex);
      setPointTypeDropdownOpen(false);

      return normalizePoints(next);
    });
  }

  function updatePoint(index, field, value) {
    setPoints((current) => {
      pushHistory(current);

      const next = structuredClone(current);

      if (!next[index]) {
        return current;
      }

      if (field === "x" || field === "y" || field === "z") {
        next[index][field] = Number(value) || 0;
      } else {
        next[index][field] = value;
      }

      return normalizePoints(next);
    });
  }

  function deletePoint(index) {
    setPoints((current) => {
      pushHistory(current);
      return normalizePoints(current.filter((_, pointIndex) => pointIndex !== index));
    });

    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      if (current > index) {
        return current - 1;
      }

      if (current === index) {
        return null;
      }

      return current;
    });

    setPointTypeDropdownOpen(false);
  }

  function movePoint(index, direction) {
    if (direction === "up" && index === 0) {
      return;
    }

    if (direction === "down" && index === points.length - 1) {
      return;
    }

    setPoints((current) => {
      pushHistory(current);

      const next = structuredClone(current);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return normalizePoints(next);
    });

    setSelectedIndex(direction === "up" ? index - 1 : index + 1);
    setPointTypeDropdownOpen(false);
  }

  function copyPoint() {
    if (selectedIndex === null || !points[selectedIndex]) {
      return;
    }

    setClipboard({
      type: "POINT",
      points: [structuredClone(points[selectedIndex])],
    });

    setMessage("Point copied.");
  }

  function copyAll() {
    if (!points.length) {
      return;
    }

    setClipboard({
      type: "POINTS",
      points: structuredClone(points),
    });

    setMessage(`${points.length} points copied.`);
  }

  function pastePoints() {
    if (!clipboard?.points?.length) {
      return;
    }

    setPoints((current) => {
      pushHistory(current);

      const copied = structuredClone(clipboard.points).map((point) => ({
        ...point,
        id: `local-${Date.now()}-${Math.random()}`,
      }));

      if (selectedIndex === null) {
        return normalizePoints([...current, ...copied]);
      }

      const next = [...current];
      next.splice(selectedIndex + 1, 0, ...copied);

      return normalizePoints(next);
    });

    setMessage(`${clipboard.points.length} point${clipboard.points.length === 1 ? "" : "s"} pasted.`);
  }

  function clearPoints() {
    if (!points.length) {
      return;
    }

    pushHistory(points);
    setPoints([]);
    setSelectedIndex(null);
    setPointTypeDropdownOpen(false);
  }

  async function sendPointsToRoute() {
    if (!targetRouteId || !clipboard?.points?.length) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: existingPoints, error: loadError } = await supabase.from("route_points").select("sequence,x,y,z,point_type").eq("route_id", targetRouteId).order("sequence", { ascending: true });

      if (loadError) {
        throw loadError;
      }

      const copiedPoints = clipboard.points.map((point, index) => ({
        route_id: targetRouteId,
        sequence: (existingPoints?.length || 0) + index + 1,
        x: point.x,
        y: point.y,
        z: point.z,
        point_type: point.point_type || "STRAIGHT",
      }));

      const { error: insertError } = await supabase.from("route_points").insert(copiedPoints);

      if (insertError) {
        throw insertError;
      }

      setTargetRouteId("");
      setMessage(`${clipboard.points.length} point${clipboard.points.length === 1 ? "" : "s"} sent to the selected route.`);
    } catch (err) {
      setError(err.message || "Unable to send points to route.");
    } finally {
      setSaving(false);
    }
  }

  async function savePoints() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase.from("route_points").delete().eq("route_id", route.id);

      if (deleteError) {
        throw deleteError;
      }

      if (points.length) {
        const rows = normalizePoints(points).map((point, index) => ({
          route_id: route.id,
          sequence: index + 1,
          x: Number(point.x) || 0,
          y: Number(point.y) || 0,
          z: Number(point.z) || 0,
          point_type: point.point_type || "STRAIGHT",
        }));

        const { error: insertError } = await supabase.from("route_points").insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      historyRef.current = [];
      setPointTypeDropdownOpen(false);
      setMessage("Route geometry saved.");

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(err.message || "Unable to save route geometry.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    const bounds = [[0, 0], [IMAGE_SIZE, IMAGE_SIZE]];

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomControl: true,
      attributionControl: false,
    });

    const imageOverlay = L.imageOverlay(`${import.meta.env.BASE_URL}map.png`, bounds);

    imageOverlay.addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    map.fitBounds(bounds);

    map.on("click", (event) => {
      if (event.originalEvent?.target?.closest?.(".route-point-inspector")) {
        return;
      }

      addPoint(event.latlng);
    });

    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;

    window.requestAnimationFrame(() => {
      map.invalidateSize(true);
      map.fitBounds(bounds);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize(true);
    });

    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off();
      map.remove();

      mapInstanceRef.current = null;
      markerLayerRef.current = null;
      lineLayerRef.current = null;
    };
  }, [loading]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    if (lineLayerRef.current) {
      map.removeLayer(lineLayerRef.current);
      lineLayerRef.current = null;
    }

    const latLngs = points.map((point) => robloxToMap(point.x, point.z));

    if (latLngs.length >= 2) {
      lineLayerRef.current = L.polyline(latLngs, {
        weight: 4,
        opacity: 0.9,
        className: "route-editor-line",
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(point.x, point.z);
      const selected = selectedIndex === index;
      const isStop = point.point_type === "STOP_LEFT" || point.point_type === "STOP_RIGHT";
      const pointColor = POINT_COLORS[point.point_type] || "var(--accent)";

      const marker = L.marker(position, {
        draggable: true,
        zIndexOffset: selected ? 1000 : index,
        icon: L.divIcon({
          className: "route-editor-marker-wrapper",
          html: `
      <div class="route-editor-marker${selected ? " is-selected" : ""}${isStop ? " is-stop" : ""}" data-point-type="${point.point_type}">
        ${isStop ? `
          <span class="route-editor-marker-half route-editor-marker-half-left"></span>
          <span class="route-editor-marker-half route-editor-marker-half-right"></span>
        ` : ""}
        <span class="route-editor-marker-number">${index + 1}</span>
      </div>
    `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        setSelectedIndex(index);
        setPointTypeDropdownOpen(false);
      });

      marker.on("dragstart", () => {
        pushHistory(points);
        setSelectedIndex(index);
        setPointTypeDropdownOpen(false);
      });

      marker.on("dragend", (event) => {
        const newPosition = event.target.getLatLng();
        const coords = mapToRoblox(newPosition.lat, newPosition.lng);

        setPoints((current) => {
          const next = structuredClone(current);

          if (!next[index]) {
            return current;
          }

          next[index].x = coords.x;
          next[index].y = coords.y;
          next[index].z = coords.z;

          return normalizePoints(next);
        });

        setSelectedIndex(index);
      });

      marker.on("contextmenu", (event) => {
        L.DomEvent.stopPropagation(event);
        deletePoint(index);
      });

      marker.bindTooltip(`Point ${index + 1} · ${point.point_type.replaceAll("_", " ")}`, {
        direction: "top",
        offset: [0, -15],
      });

      marker.addTo(markerLayer);
    });

    window.requestAnimationFrame(() => {
      map.invalidateSize(true);
    });
  }, [points, selectedIndex]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!event.target.closest(".route-point-inspector")) {
        setPointTypeDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  if (loading) {
    return (
      <div className="modal-backdrop route-editor-backdrop">
        <div className="modal modal-route-editor">
          <div className="modal-header">
            <div>
              <span className="eyebrow">ROUTE EDITOR</span>
              <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
              <p>Loading route geometry...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop route-editor-backdrop">
      <div className="modal modal-route-editor">
        <div className="route-editor-header">
          <div className="route-editor-header-copy">
            <span className="eyebrow">ROUTE EDITOR / GEOMETRY</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>
              {points.length} route point{points.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="route-editor-header-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={copyAll}
              disabled={!points.length}
            >
              Copy All
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={pastePoints}
              disabled={!clipboard?.points?.length}
            >
              Paste
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={undoPoint}
              disabled={!historyRef.current.length}
            >
              Undo
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={clearPoints}
              disabled={!points.length}
            >
              Clear
            </button>

            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={onClose}
              disabled={saving}
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error route-editor-alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success route-editor-alert">
            {message}
          </div>
        )}

        <div className="route-editor-workspace">
          <div className="route-editor-map-panel">
            <div className="route-editor-map" ref={mapRef}>
              {selectedPoint && (
                <div className="route-point-inspector">
                  <div className="route-point-inspector-header">
                    <div>
                      <span className="eyebrow">POINT {selectedIndex + 1}</span>
                      <h3>Point Properties</h3>
                    </div>

                    <button
                      type="button"
                      className="modal-close route-point-inspector-close"
                      aria-label="Close point inspector"
                      onClick={() => {
                        setSelectedIndex(null);
                        setPointTypeDropdownOpen(false);
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="route-point-inspector-type">
                    <span
                      className="route-point-type-indicator"
                      style={{
                        "--point-color": POINT_COLORS[selectedPoint.point_type] || "var(--accent)",
                      }}
                    />

                    <div className="custom-select">
                      <button
                        type="button"
                        className="custom-select-trigger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPointTypeDropdownOpen((current) => !current);
                        }}
                      >
                        <span>
                          {selectedPoint.point_type === "STRAIGHT"
                            ? "Straight"
                            : selectedPoint.point_type === "TURN_RIGHT"
                              ? "Right Turn"
                              : selectedPoint.point_type === "TURN_LEFT"
                                ? "Left Turn"
                                : selectedPoint.point_type === "STOP_RIGHT"
                                  ? "Stop"
                                  : "Cross Stop"}
                        </span>

                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      {pointTypeDropdownOpen && (
                        <div className="custom-select-menu">
                          {[
                            ["STRAIGHT", "Straight"],
                            ["TURN_RIGHT", "Right Turn"],
                            ["TURN_LEFT", "Left Turn"],
                            ["STOP_RIGHT", "Stop"],
                            ["STOP_LEFT", "Cross Stop"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              className={`custom-select-option${selectedPoint.point_type === value ? " selected" : ""}`}
                              onClick={() => {
                                updatePoint(selectedIndex, "point_type", value);
                                setPointTypeDropdownOpen(false);
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="route-point-inspector-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => movePoint(selectedIndex, "up")}
                      disabled={selectedIndex === 0}
                    >
                      Move Up
                    </button>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => movePoint(selectedIndex, "down")}
                      disabled={selectedIndex === points.length - 1}
                    >
                      Move Down
                    </button>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={copyPoint}
                    >
                      Copy
                    </button>

                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => deletePoint(selectedIndex)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="route-editor-footer">
          <div className="route-editor-footer-hints">
            <div className="route-editor-footer-hint">
              <strong>Left Click</strong>
              <span>Add Point</span>
            </div>

            <div className="route-editor-footer-hint">
              <strong>Drag</strong>
              <span>Move Point</span>
            </div>

            <div className="route-editor-footer-hint">
              <strong>Right Click</strong>
              <span>Remove Point</span>
            </div>
          </div>

          <div className="route-editor-footer-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={savePoints}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Route"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutePreview({ route, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const hasInitialFitRef = useRef(false);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const POINT_COLORS = {
    STRAIGHT: "#22c55e",
    TURN_RIGHT: "#3b82f6",
    TURN_LEFT: "#eab308",
    STOP_RIGHT: "#ef4444",
    STOP_LEFT: "#ef4444",
  };

  function robloxToMap(x, z) {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 + z * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  function getPointTypeLabel(pointType) {
    if (pointType === "TURN_RIGHT") {
      return "Right Turn";
    }

    if (pointType === "TURN_LEFT") {
      return "Left Turn";
    }

    if (pointType === "STOP_RIGHT") {
      return "Stop";
    }

    if (pointType === "STOP_LEFT") {
      return "Cross Stop";
    }

    return "Straight";
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      setLoading(true);
      setError("");
      setSelectedIndex(null);
      hasInitialFitRef.current = false;

      const { data, error: pointError } = await supabase.from("route_points").select("id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (cancelled) {
        return;
      }

      if (pointError) {
        setError(pointError.message || "Unable to load route preview.");
        setPoints([]);
      } else {
        setPoints(data || []);
      }

      setLoading(false);
    }

    loadPoints();

    return () => {
      cancelled = true;
    };
  }, [route.id]);

  useEffect(() => {
    const container = mapRef.current;

    if (!container || mapInstanceRef.current) {
      return;
    }

    let frameOne;
    let frameTwo;
    let cancelled = false;

    function initializeMap() {
      if (cancelled || !mapRef.current || mapInstanceRef.current) {
        return;
      }

      const currentContainer = mapRef.current;

      if (currentContainer.clientWidth < 50 || currentContainer.clientHeight < 50) {
        frameOne = window.requestAnimationFrame(initializeMap);
        return;
      }

      const bounds = [[0, 0], [IMAGE_SIZE, IMAGE_SIZE]];

      const map = L.map(currentContainer, {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 4,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });

      const imageOverlay = L.imageOverlay(`${import.meta.env.BASE_URL}map.png`, bounds);

      imageOverlay.addTo(map);

      const layer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      layerRef.current = layer;

      const resizeObserver = new ResizeObserver(() => {
        if (!mapInstanceRef.current || !mapRef.current) {
          return;
        }

        if (mapRef.current.clientWidth < 50 || mapRef.current.clientHeight < 50) {
          return;
        }

        map.invalidateSize({ animate: false, pan: false });
      });

      resizeObserver.observe(currentContainer);
      resizeObserverRef.current = resizeObserver;

      frameTwo = window.requestAnimationFrame(() => {
        if (!mapInstanceRef.current || !mapRef.current) {
          return;
        }

        map.invalidateSize({ animate: false, pan: false });
        map.fitBounds(bounds, { animate: false });
      });
    }

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(initializeMap);
    });

    return () => {
      cancelled = true;

      if (frameOne) {
        window.cancelAnimationFrame(frameOne);
      }

      if (frameTwo) {
        window.cancelAnimationFrame(frameTwo);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();

    const latLngs = points.map((point) => robloxToMap(Number(point.x) || 0, Number(point.z) || 0));

    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        weight: 4,
        opacity: 0.9,
        className: "route-preview-line",
      }).addTo(layer);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(Number(point.x) || 0, Number(point.z) || 0);
      const selected = selectedIndex === index;
      const isStop = point.point_type === "STOP_LEFT" || point.point_type === "STOP_RIGHT";

      const marker = L.marker(position, {
        zIndexOffset: selected ? 1000 : index,
        icon: L.divIcon({
          className: "route-preview-marker-wrapper",
          html: `
            <div class="route-editor-marker${selected ? " is-selected" : ""}${isStop ? " is-stop" : ""}" data-point-type="${point.point_type || "STRAIGHT"}">
              ${isStop ? `
                <span class="route-editor-marker-half route-editor-marker-half-left"></span>
                <span class="route-editor-marker-half route-editor-marker-half-right"></span>
              ` : ""}
              <span class="route-editor-marker-number">${index + 1}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        setSelectedIndex(index);
      });

      marker.addTo(layer);
    });

    if (!hasInitialFitRef.current && !loading) {
      hasInitialFitRef.current = true;

      window.requestAnimationFrame(() => {
        if (!mapInstanceRef.current || !mapRef.current) {
          return;
        }

        if (mapRef.current.clientWidth < 50 || mapRef.current.clientHeight < 50) {
          return;
        }

        map.invalidateSize({ animate: false, pan: false });

        if (latLngs.length >= 2) {
          map.fitBounds(L.latLngBounds(latLngs), {
            padding: [60, 60],
            animate: false,
          });
        } else {
          map.fitBounds([[0, 0], [IMAGE_SIZE, IMAGE_SIZE]], {
            animate: false,
          });
        }
      });
    }
  }, [points, selectedIndex, loading]);

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <div className="modal-backdrop route-preview-backdrop">
      <div className="modal modal-route-preview">
        <div className="route-editor-header">
          <div className="route-editor-header-copy">
            <span className="eyebrow">ROUTE PREVIEW / GEOMETRY</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>{points.length} route point{points.length === 1 ? "" : "s"} · {route.description || "No route description provided."}</p>
          </div>

          <div className="route-preview-status">
            <StatusBadge status={route.status} />
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="route-editor-workspace">
          <div className="route-editor-map-panel">
            <div className="route-editor-map" ref={mapRef}>
              {loading && (
                <div className="route-preview-loading">
                  Loading route geometry...
                </div>
              )}

              {error && (
                <div className="alert alert-error route-editor-alert">
                  {error}
                </div>
              )}

              {selectedPoint && (
                <div className="route-point-inspector">
                  <div className="route-point-inspector-header">
                    <div>
                      <span className="eyebrow">POINT {selectedIndex + 1}</span>
                      <h3>Point Properties</h3>
                    </div>

                    <button type="button" className="route-point-inspector-close" aria-label="Close point inspector" onClick={() => setSelectedIndex(null)}>
                      ×
                    </button>
                  </div>

                  <div className="route-point-inspector-type">
                    <span className="route-point-type-indicator" style={{ "--point-color": POINT_COLORS[selectedPoint.point_type] || POINT_COLORS.STRAIGHT }} />

                    <div className="custom-select">
                      <div className="custom-select-trigger">
                        <span>{getPointTypeLabel(selectedPoint.point_type)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="route-point-preview-details">
                    <div className="route-point-preview-detail">
                      <span>X</span>
                      <strong>{Number(selectedPoint.x || 0).toFixed(1)}</strong>
                    </div>

                    <div className="route-point-preview-detail">
                      <span>Y</span>
                      <strong>{Number(selectedPoint.y || 0).toFixed(1)}</strong>
                    </div>

                    <div className="route-point-preview-detail">
                      <span>Z</span>
                      <strong>{Number(selectedPoint.z || 0).toFixed(1)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllRoutesPreview({ routes, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const hasInitialFitRef = useRef(false);
  const previousRouteCountRef = useRef(routes.length);
  const [routePoints, setRoutePoints] = useState({});
  const [visibleRoutes, setVisibleRoutes] = useState(() => new Set(routes.map((route) => route.id)));
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const routeStyles = [
    { color: "#f5a500", dashArray: null },
    { color: "#3b82f6", dashArray: "10 8" },
    { color: "#22c55e", dashArray: "3 7" },
    { color: "#eab308", dashArray: "14 7 3 7" },
    { color: "#a855f7", dashArray: "7 5" },
    { color: "#ef4444", dashArray: "18 6" },
  ];

  function robloxToMap(x, z) {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 + z * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  function getRouteCategory(routeCode) {
    const code = String(routeCode || "").trim().toUpperCase();

    if (/^\d{2}-[A-Z]\d$/.test(code)) {
      if (/-A1$/.test(code)) {
        return "EARLY_AM";
      }

      if (/-A2$/.test(code)) {
        return "LATE_AM";
      }

      if (/-P1$/.test(code)) {
        return "EARLY_PM";
      }

      if (/-P2$/.test(code)) {
        return "LATE_PM";
      }

      return "OTHER";
    }

    if (code) {
      return "SHUTTLE";
    }

    return "OTHER";
  }

  function routeMatchesFilter(route) {
    if (routeFilter === "ALL") {
      return true;
    }

    return getRouteCategory(route.route_code) === routeFilter;
  }

  const filteredRoutes = routes.filter(routeMatchesFilter);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      setLoading(true);
      setError("");

      const routeIds = routes.map((route) => route.id);

      if (!routeIds.length) {
        setRoutePoints({});
        setLoading(false);
        return;
      }

      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").in("route_id", routeIds).order("sequence", { ascending: true });

      if (cancelled) {
        return;
      }

      if (pointError) {
        setError(pointError.message || "Unable to load route geometry.");
        setRoutePoints({});
        setLoading(false);
        return;
      }

      const grouped = {};

      (data || []).forEach((point) => {
        if (!grouped[point.route_id]) {
          grouped[point.route_id] = [];
        }

        grouped[point.route_id].push(point);
      });

      setRoutePoints(grouped);
      setLoading(false);
    }

    loadPoints();

    return () => {
      cancelled = true;
    };
  }, [routes]);

  useEffect(() => {
    if (previousRouteCountRef.current !== routes.length) {
      previousRouteCountRef.current = routes.length;
      hasInitialFitRef.current = false;
    }
  }, [routes.length]);

  useEffect(() => {
    const container = mapRef.current;

    if (!container || mapInstanceRef.current) {
      return;
    }

    let frameOne;
    let frameTwo;
    let cancelled = false;

    function initializeMap() {
      if (cancelled || !mapRef.current || mapInstanceRef.current) {
        return;
      }

      const currentContainer = mapRef.current;

      if (currentContainer.clientWidth < 50 || currentContainer.clientHeight < 50) {
        frameOne = window.requestAnimationFrame(initializeMap);
        return;
      }

      const bounds = [[0, 0], [IMAGE_SIZE, IMAGE_SIZE]];

      const map = L.map(currentContainer, {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 4,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });

      const imageOverlay = L.imageOverlay(`${import.meta.env.BASE_URL}map.png`, bounds);

      imageOverlay.addTo(map);

      const layer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      layerRef.current = layer;

      const resizeObserver = new ResizeObserver(() => {
        if (!mapInstanceRef.current || !mapRef.current) {
          return;
        }

        if (mapRef.current.clientWidth < 50 || mapRef.current.clientHeight < 50) {
          return;
        }

        map.invalidateSize({ animate: false, pan: false });
      });

      resizeObserver.observe(currentContainer);
      resizeObserverRef.current = resizeObserver;

      const legend = currentContainer.querySelector(".all-routes-map-legend");

      if (legend) {
        L.DomEvent.disableClickPropagation(legend);
        L.DomEvent.disableScrollPropagation(legend);
      }

      frameTwo = window.requestAnimationFrame(() => {
        if (!mapInstanceRef.current || !mapRef.current) {
          return;
        }

        map.invalidateSize({ animate: false, pan: false });
        map.fitBounds(bounds, { animate: false });
      });
    }

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(initializeMap);
    });

    return () => {
      cancelled = true;

      if (frameOne) {
        window.cancelAnimationFrame(frameOne);
      }

      if (frameTwo) {
        window.cancelAnimationFrame(frameTwo);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();

    filteredRoutes.forEach((route) => {
      if (!visibleRoutes.has(route.id)) {
        return;
      }

      const points = routePoints[route.id] || [];

      if (!points.length) {
        return;
      }

      const routeIndex = routes.findIndex((item) => item.id === route.id);
      const style = routeStyles[(routeIndex >= 0 ? routeIndex : 0) % routeStyles.length];
      const selected = selectedRouteId === route.id;
      const hovered = hoveredRouteId === route.id;
      const anotherRouteHovered = hoveredRouteId !== null && hoveredRouteId !== route.id;

      const latLngs = points.map((point) => robloxToMap(Number(point.x) || 0, Number(point.z) || 0));

      if (latLngs.length >= 2) {
        const line = L.polyline(latLngs, {
          color: style.color,
          weight: hovered ? 8 : selected ? 6 : 4,
          opacity: anotherRouteHovered ? 0.25 : hovered || selected ? 1 : 0.8,
          dashArray: style.dashArray,
          className: "all-routes-line",
          interactive: true,
        });

        line.on("mouseover", () => {
          setHoveredRouteId(route.id);
        });

        line.on("mouseout", () => {
          setHoveredRouteId((current) => current === route.id ? null : current);
        });

        line.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          setSelectedRouteId(route.id);
        });

        line.addTo(layer);
      }

      points.forEach((point) => {
        const pointPosition = robloxToMap(Number(point.x) || 0, Number(point.z) || 0);

        const marker = L.circleMarker(pointPosition, {
          radius: hovered ? 5 : selected ? 4 : 3,
          weight: hovered || selected ? 2 : 1,
          opacity: anotherRouteHovered ? 0.2 : hovered || selected ? 1 : 0.5,
          fillOpacity: anotherRouteHovered ? 0.2 : hovered || selected ? 1 : 0.5,
          color: style.color,
          fillColor: style.color,
          interactive: true,
        });

        marker.on("mouseover", () => {
          setHoveredRouteId(route.id);
        });

        marker.on("mouseout", () => {
          setHoveredRouteId((current) => current === route.id ? null : current);
        });

        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          setSelectedRouteId(route.id);
        });

        marker.addTo(layer);
      });
    });

    window.requestAnimationFrame(() => {
      if (!mapInstanceRef.current || !mapRef.current) {
        return;
      }

      if (mapRef.current.clientWidth < 50 || mapRef.current.clientHeight < 50) {
        return;
      }

      map.invalidateSize({ animate: false, pan: false });
    });
  }, [routes, routePoints, visibleRoutes, selectedRouteId, hoveredRouteId, routeFilter]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || loading || hasInitialFitRef.current) {
      return;
    }

    const visibleLatLngs = [];

    filteredRoutes.forEach((route) => {
      if (!visibleRoutes.has(route.id)) {
        return;
      }

      const points = routePoints[route.id] || [];

      points.forEach((point) => {
        visibleLatLngs.push(robloxToMap(Number(point.x) || 0, Number(point.z) || 0));
      });
    });

    if (!visibleLatLngs.length) {
      return;
    }

    hasInitialFitRef.current = true;

    window.requestAnimationFrame(() => {
      if (!mapInstanceRef.current || !mapRef.current) {
        return;
      }

      if (mapRef.current.clientWidth < 50 || mapRef.current.clientHeight < 50) {
        return;
      }

      map.invalidateSize({ animate: false, pan: false });

      if (visibleLatLngs.length >= 2) {
        map.fitBounds(L.latLngBounds(visibleLatLngs), {
          padding: [60, 60],
          animate: false,
        });
      } else {
        map.fitBounds([[0, 0], [IMAGE_SIZE, IMAGE_SIZE]], {
          animate: false,
        });
      }
    });
  }, [routePoints, loading]);

  function toggleRoute(routeId) {
    setVisibleRoutes((current) => {
      const next = new Set(current);

      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }

      return next;
    });
  }

  function showAll() {
    setVisibleRoutes(new Set(routes.map((route) => route.id)));
  }

  function hideAll() {
    setVisibleRoutes(new Set());
  }

  function setFilter(filter) {
    setRouteFilter(filter);
    setSelectedRouteId(null);
    setHoveredRouteId(null);
  }

  const selectedRoute = routes.find((route) => route.id === selectedRouteId);
  const selectedRoutePoints = selectedRoute ? routePoints[selectedRoute.id] || [] : [];

  return (
    <div className="modal-backdrop all-routes-backdrop">
      <div className="modal modal-all-routes">
        <div className="route-editor-header">
          <div className="route-editor-header-copy">
            <span className="eyebrow">ROUTE NETWORK</span>
            <h2>All Routes</h2>
            <p>
              {visibleRoutes.size} of {routes.length} routes visible across the route network.
            </p>
          </div>

          <div className="route-preview-toolbar-actions">
            <div className="custom-select all-routes-filter">
              <button
                type="button"
                className="custom-select-trigger"
                onClick={(event) => {
                  const menu = event.currentTarget.nextElementSibling;

                  if (menu) {
                    menu.hidden = !menu.hidden;
                  }
                }}
              >
                <span>
                  {routeFilter === "ALL"
                    ? "All Routes"
                    : routeFilter === "EARLY_AM"
                      ? "Early AM"
                      : routeFilter === "LATE_AM"
                        ? "Late AM"
                        : routeFilter === "EARLY_PM"
                          ? "Early PM"
                          : routeFilter === "LATE_PM"
                            ? "Late PM"
                            : "Transfers"}
                </span>

                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div className="custom-select-menu" hidden>
                {[
                  ["ALL", "All Routes"],
                  ["EARLY_AM", "Early AM"],
                  ["LATE_AM", "Late AM"],
                  ["EARLY_PM", "Early PM"],
                  ["LATE_PM", "Late PM"],
                  ["SHUTTLE", "Transfers"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`custom-select-option${routeFilter === value ? " selected" : ""}`}
                    onClick={(event) => {
                      setFilter(value);
                      event.currentTarget.parentElement.hidden = true;
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="button button-secondary" onClick={showAll}>
              Show All
            </button>

            <button type="button" className="button button-secondary" onClick={hideAll}>
              Hide All
            </button>

            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="route-editor-workspace">
          <div className="route-editor-map-panel">
            <div className="route-editor-map" ref={mapRef}>
              {loading && (
                <div className="route-preview-loading">
                  Loading route geometry...
                </div>
              )}

              {error && (
                <div className="alert alert-error route-editor-alert">
                  {error}
                </div>
              )}

              {selectedRoute && (
                <div className="route-point-inspector all-routes-inspector">
                  <div className="route-point-inspector-header">
                    <div>
                      <span className="eyebrow">SELECTED ROUTE</span>
                      <h3>{selectedRoute.route_code ? `${selectedRoute.route_code} — ${selectedRoute.name}` : selectedRoute.name}</h3>
                    </div>

                    <button type="button" className="route-point-inspector-close" aria-label="Close route inspector" onClick={() => setSelectedRouteId(null)}>
                      ×
                    </button>
                  </div>

                  <div className="all-routes-selected-status">
                    <StatusBadge status={selectedRoute.status} />
                  </div>

                  <p className="all-routes-selected-description">
                    {selectedRoute.description || "No route description provided."}
                  </p>

                  <div className="route-point-preview-details">
                    <div className="route-point-preview-detail">
                      <span>POINTS</span>
                      <strong>{selectedRoutePoints.length}</strong>
                    </div>

                    <div className="route-point-preview-detail">
                      <span>VISIBLE</span>
                      <strong>{visibleRoutes.has(selectedRoute.id) ? "YES" : "NO"}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="all-routes-map-legend">
                <span className="eyebrow">ROUTES</span>

                <div className="all-routes-map-legend-list">
                  {filteredRoutes.map((route, index) => {
                    const routeIndex = routes.findIndex((item) => item.id === route.id);
                    const style = routeStyles[(routeIndex >= 0 ? routeIndex : index) % routeStyles.length];
                    const visible = visibleRoutes.has(route.id);
                    const selected = selectedRouteId === route.id;
                    const hovered = hoveredRouteId === route.id;

                    return (
                      <button type="button" key={route.id} className={`all-routes-map-legend-item${visible ? " is-visible" : ""}${selected ? " is-selected" : ""}${hovered ? " is-hovered" : ""}`} onMouseEnter={() => setHoveredRouteId(route.id)} onMouseLeave={() => setHoveredRouteId((current) => current === route.id ? null : current)} onClick={() => {
                        setSelectedRouteId(route.id);
                        toggleRoute(route.id);
                      }}>
                        <span className="all-routes-swatch" style={{ backgroundColor: style.color }} />
                        <span>{route.route_code || route.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Maintenance({ canEdit }) {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [defectSearch, setDefectSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("ALL");
  const [maintenanceGarageFilter, setMaintenanceGarageFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyGarageFilter, setHistoryGarageFilter] = useState("ALL");
  const [defectSeverityFilter, setDefectSeverityFilter] = useState("ALL");
  const [defectStatusFilter, setDefectStatusFilter] = useState("ALL");
  const [maintenanceStatusDropdownOpen, setMaintenanceStatusDropdownOpen] = useState(false);
  const [maintenanceGarageDropdownOpen, setMaintenanceGarageDropdownOpen] = useState(false);
  const [defectSeverityDropdownOpen, setDefectSeverityDropdownOpen] = useState(false);
  const [defectStatusDropdownOpen, setDefectStatusDropdownOpen] = useState(false);
  const [historyStatusDropdownOpen, setHistoryStatusDropdownOpen] = useState(false);
  const [historyGarageDropdownOpen, setHistoryGarageDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    vehicleId: "",
    maintenanceType: "",
    description: "",
    mileage: "",
    performedBy: "",
    status: "SCHEDULED",
    performedAt: "",
    dueAt: "",
    dueMileage: "",
    recurrenceDays: "",
    recurrenceMiles: "",
  });

  async function loadMaintenance(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    try {
      const [
        { data: maintenanceData, error: maintenanceError },
        { data: vehicleData, error: vehicleError },
        { data: defectData, error: defectError },
      ] = await Promise.all([
        supabase.from("maintenance_records").select("*").order("status", { ascending: true }).order("due_at", { ascending: true }),
        supabase.from("vehicles").select("id,fleet_number,year,make,model,mileage,status,garage").order("fleet_number", { ascending: true }),
        supabase.from("vehicle_defects").select("id,vehicle_id,category,item,description,severity,status,quantity,reported_at").neq("status", "CLOSED").order("reported_at", { ascending: false }),
      ]);

      if (maintenanceError) {
        throw maintenanceError;
      }

      if (vehicleError) {
        throw vehicleError;
      }

      if (defectError) {
        throw defectError;
      }

      setRecords(maintenanceData || []);
      setVehicles(vehicleData || []);
      setDefects(defectData || []);
    } catch (err) {
      setError(err.message || "Unable to load maintenance data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMaintenance();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(""), 3500);

    return () => window.clearTimeout(timer);
  }, [message]);

  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const getVehicle = (vehicleId) => vehicleMap.get(vehicleId);

  const getVehicleLabel = (vehicleId) => {
    const vehicle = getVehicle(vehicleId);

    if (!vehicle) {
      return "Unknown vehicle";
    }

    return `${vehicle.fleet_number}${vehicle.year ? ` · ${vehicle.year}` : ""}`;
  };

  const getRecordStatus = (record) => {
    const status = String(record.status || "COMPLETED").toUpperCase();

    if (status === "COMPLETED" || status === "CANCELLED" || status === "IN_PROGRESS") {
      return status;
    }

    if (status === "SCHEDULED" && record.due_at) {
      const dueTime = new Date(record.due_at).getTime();

      if (Number.isFinite(dueTime) && dueTime < Date.now()) {
        return "OVERDUE";
      }
    }

    return status;
  };

  const activeQueue = records.filter((record) => {
    const status = getRecordStatus(record);

    return status === "SCHEDULED" || status === "OVERDUE" || status === "IN_PROGRESS";
  });

  const historyRecords = records.filter((record) => {
    const status = getRecordStatus(record);

    return status === "COMPLETED" || status === "CANCELLED";
  });

  const overdueCount = records.filter((record) => getRecordStatus(record) === "OVERDUE").length;
  const scheduledCount = records.filter((record) => getRecordStatus(record) === "SCHEDULED").length;
  const inProgressCount = records.filter((record) => getRecordStatus(record) === "IN_PROGRESS").length;
  const openDefectCount = defects.length;
  const criticalDefectCount = defects.filter((defect) => String(defect.severity || "").toUpperCase() === "CRITICAL").length;
  const majorDefectCount = defects.filter((defect) => String(defect.severity || "").toUpperCase() === "MAJOR").length;
  const completedCount = historyRecords.filter((record) => getRecordStatus(record) === "COMPLETED").length;
  const cancelledCount = historyRecords.filter((record) => getRecordStatus(record) === "CANCELLED").length;

  const garages = [...new Set(vehicles.map((vehicle) => vehicle.garage).filter(Boolean))].sort();

  const filteredQueue = activeQueue.filter((record) => {
    const vehicle = getVehicle(record.vehicle_id);
    const status = getRecordStatus(record);
    const query = maintenanceSearch.trim().toLowerCase();

    const searchValues = [
      record.maintenance_type,
      record.description,
      record.performed_by,
      vehicle?.fleet_number,
      vehicle?.make,
      vehicle?.model,
      vehicle?.year,
    ].filter(Boolean);

    const matchesSearch = !query || searchValues.some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = maintenanceStatusFilter === "ALL" || status === maintenanceStatusFilter;
    const matchesGarage = maintenanceGarageFilter === "ALL" || vehicle?.garage === maintenanceGarageFilter;

    return matchesSearch && matchesStatus && matchesGarage;
  });

  const filteredHistory = historyRecords.filter((record) => {
    const vehicle = getVehicle(record.vehicle_id);
    const status = getRecordStatus(record);
    const query = historySearch.trim().toLowerCase();

    const searchValues = [
      record.maintenance_type,
      record.description,
      record.performed_by,
      vehicle?.fleet_number,
      vehicle?.make,
      vehicle?.model,
      vehicle?.year,
    ].filter(Boolean);

    const matchesSearch = !query || searchValues.some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = historyStatusFilter === "ALL" || status === historyStatusFilter;
    const matchesGarage = historyGarageFilter === "ALL" || vehicle?.garage === historyGarageFilter;

    return matchesSearch && matchesStatus && matchesGarage;
  });

  const filteredDefects = defects.filter((defect) => {
    const vehicle = getVehicle(defect.vehicle_id);
    const query = defectSearch.trim().toLowerCase();

    const searchValues = [
      defect.item,
      defect.description,
      defect.category,
      defect.severity,
      defect.status,
      vehicle?.fleet_number,
      vehicle?.make,
      vehicle?.model,
    ].filter(Boolean);

    const matchesSearch = !query || searchValues.some((value) => String(value).toLowerCase().includes(query));
    const matchesSeverity = defectSeverityFilter === "ALL" || String(defect.severity || "MINOR").toUpperCase() === defectSeverityFilter;
    const matchesStatus = defectStatusFilter === "ALL" || String(defect.status || "REPORTED").toUpperCase() === defectStatusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatMileage = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return `${number.toLocaleString()} mi`;
  };

  const resetForm = () => {
    setForm({
      vehicleId: "",
      maintenanceType: "",
      description: "",
      mileage: "",
      performedBy: "",
      status: "SCHEDULED",
      performedAt: "",
      dueAt: "",
      dueMileage: "",
      recurrenceDays: "",
      recurrenceMiles: "",
    });
  };

  const openNewServiceOrder = () => {
    resetForm();
    setSelectedRecord(null);
    setShowServiceForm(true);
    setError("");
  };

  const openEditRecord = (record) => {
    setForm({
      vehicleId: record.vehicle_id || "",
      maintenanceType: record.maintenance_type || "",
      description: record.description || "",
      mileage: record.mileage ?? "",
      performedBy: record.performed_by || "",
      status: getRecordStatus(record) === "OVERDUE" ? "SCHEDULED" : getRecordStatus(record),
      performedAt: record.performed_at ? record.performed_at.slice(0, 16) : "",
      dueAt: record.due_at ? record.due_at.slice(0, 16) : "",
      dueMileage: record.due_mileage ?? "",
      recurrenceDays: record.recurrence_days ?? "",
      recurrenceMiles: record.recurrence_miles ?? "",
    });

    setSelectedRecord(record);
    setShowServiceForm(true);
    setError("");
  };

  const saveServiceOrder = async (event) => {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    if (!form.vehicleId || !form.maintenanceType.trim()) {
      setError("Vehicle and maintenance type are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        vehicle_id: form.vehicleId,
        maintenance_type: form.maintenanceType.trim(),
        description: form.description.trim() || null,
        mileage: form.mileage === "" ? null : Number(form.mileage),
        performed_by: form.performedBy.trim() || null,
        status: form.status === "OVERDUE" ? "SCHEDULED" : form.status,
        performed_at: form.performedAt ? new Date(form.performedAt).toISOString() : null,
        due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        due_mileage: form.dueMileage === "" ? null : Number(form.dueMileage),
        recurrence_days: form.recurrenceDays === "" ? null : Number(form.recurrenceDays),
        recurrence_miles: form.recurrenceMiles === "" ? null : Number(form.recurrenceMiles),
      };

      if (selectedRecord) {
        const { error: updateError } = await supabase.from("maintenance_records").update(payload).eq("id", selectedRecord.id);

        if (updateError) {
          throw updateError;
        }

        setMessage("Service order updated.");
      } else {
        const { error: insertError } = await supabase.from("maintenance_records").insert(payload);

        if (insertError) {
          throw insertError;
        }

        setMessage("Service order created.");
      }

      setShowServiceForm(false);
      setSelectedRecord(null);
      resetForm();
      await loadMaintenance(false);
    } catch (err) {
      setError(err.message || "Unable to save service order.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (record, status) => {
    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const update = {
        status,
        performed_at: status === "COMPLETED" ? new Date().toISOString() : record.performed_at,
      };

      const { error: updateError } = await supabase.from("maintenance_records").update(update).eq("id", record.id);

      if (updateError) {
        throw updateError;
      }

      setMessage(status === "COMPLETED" ? "Service order completed." : "Service order updated.");
      await loadMaintenance(false);
    } catch (err) {
      setError(err.message || "Unable to update service order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">Fleet Service</span>
            <h1>Maintenance</h1>
            <p>Loading maintenance operations...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Fleet Service</span>
          <h1>Maintenance</h1>
          <p>Manage scheduled service, active work, and defects.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button type="button" className="button button-primary" onClick={openNewServiceOrder}>
              New Service Order
            </button>
          )}

          <button type="button" className="button button-secondary refresh-button" onClick={() => loadMaintenance(false)} disabled={refreshing}>
            <span className={`refresh-icon${refreshing ? " spinning" : ""}`} aria-hidden="true">↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="dashboard-kpi-grid">
        <DashboardKpi
          label="Open Service Orders"
          value={activeQueue.length}
          detail={`${scheduledCount} scheduled · ${inProgressCount} in progress`}
          icon="clipboard"
          alert={overdueCount > 0}
        />

        <DashboardKpi
          label="Overdue"
          value={overdueCount}
          detail={activeQueue.length > 0 ? `${Math.round((overdueCount / activeQueue.length) * 100)}% of open orders` : "No open orders"}
          icon="alert"
          alert={overdueCount > 0}
        />

        <DashboardKpi
          label="In Progress"
          value={inProgressCount}
          detail={activeQueue.length > 0 ? `${Math.round((inProgressCount / activeQueue.length) * 100)}% of open orders` : "No open orders"}
          icon="wrench"
        />

        <DashboardKpi
          label="Open Defects"
          value={openDefectCount}
          detail={`${criticalDefectCount} critical · ${majorDefectCount} major`}
          icon="defect"
          alert={criticalDefectCount > 0}
        />
      </section>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Service Queue</span>
            <h3>Maintenance Queue</h3>
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={maintenanceSearch}
                onChange={(event) => setMaintenanceSearch(event.target.value)}
                placeholder="Fleet number, service type, description, or technician"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setMaintenanceStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      SCHEDULED: "Scheduled",
                      OVERDUE: "Overdue",
                      IN_PROGRESS: "In progress",
                    }[maintenanceStatusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {maintenanceStatusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["SCHEDULED", "Scheduled"],
                      ["OVERDUE", "Overdue"],
                      ["IN_PROGRESS", "In progress"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${maintenanceStatusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setMaintenanceStatusFilter(value);
                          setMaintenanceStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Garage</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setMaintenanceGarageDropdownOpen((open) => !open)}
                >
                  <span>{maintenanceGarageFilter === "ALL" ? "All garages" : maintenanceGarageFilter}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {maintenanceGarageDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${maintenanceGarageFilter === "ALL" ? "selected" : ""}`}
                      onClick={() => {
                        setMaintenanceGarageFilter("ALL");
                        setMaintenanceGarageDropdownOpen(false);
                      }}
                    >
                      All garages
                    </button>

                    {garages.map((garage) => (
                      <button
                        key={garage}
                        type="button"
                        className={`custom-select-option ${maintenanceGarageFilter === garage ? "selected" : ""}`}
                        onClick={() => {
                          setMaintenanceGarageFilter(garage);
                          setMaintenanceGarageDropdownOpen(false);
                        }}
                      >
                        {garage}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="empty-state">
            <strong>No active service orders</strong>
            <span>There are no maintenance orders matching the current filters.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table maintenance-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Technician</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredQueue.map((record) => {
                  const vehicle = getVehicle(record.vehicle_id);
                  const status = getRecordStatus(record);

                  return (
                    <tr key={record.id}>
                      <td>
                        <div className="table-primary">{vehicle?.fleet_number || "Unknown"}</div>
                        <div className="table-secondary">
                          {vehicle ? `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim() : "Vehicle unavailable"}
                        </div>
                      </td>

                      <td>
                        <div className="table-primary">{record.maintenance_type || "Service"}</div>
                        <div className="table-secondary">{record.description || "No description"}</div>
                      </td>

                      <td>
                        <StatusBadge status={status} />
                      </td>

                      <td>
                        <div className="table-primary">
                          {record.due_at ? formatDate(record.due_at) : "No date"}
                        </div>

                        {record.due_mileage !== null && record.due_mileage !== undefined && (
                          <div className="table-secondary">{formatMileage(record.due_mileage)}</div>
                        )}
                      </td>

                      <td>{record.performed_by || "Unassigned"}</td>

                      <td>
                        <div className="table-actions">
                          <button type="button" className="button button-small button-secondary" onClick={() => openEditRecord(record)}>
                            Open
                          </button>

                          {canEdit && status !== "IN_PROGRESS" && (
                            <button type="button" className="button button-small button-secondary" onClick={() => updateStatus(record, "IN_PROGRESS")} disabled={saving}>
                              Start
                            </button>
                          )}

                          {canEdit && (
                            <button type="button" className="button button-small button-primary" onClick={() => updateStatus(record, "COMPLETED")} disabled={saving}>
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Defect Management</span>
            <h3>Open Vehicle Defects</h3>
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={defectSearch}
                onChange={(event) => setDefectSearch(event.target.value)}
                placeholder="Fleet number, defect, category, or description"
              />
            </label>

            <label className="select-control">
              <span>Severity</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setDefectSeverityDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All severities",
                      CRITICAL: "Critical",
                      MAJOR: "Major",
                      MINOR: "Minor",
                    }[defectSeverityFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {defectSeverityDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All severities"],
                      ["CRITICAL", "Critical"],
                      ["MAJOR", "Major"],
                      ["MINOR", "Minor"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${defectSeverityFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setDefectSeverityFilter(value);
                          setDefectSeverityDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setDefectStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      REPORTED: "Reported",
                      OPEN: "Open",
                      IN_PROGRESS: "In progress",
                    }[defectStatusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {defectStatusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["REPORTED", "Reported"],
                      ["OPEN", "Open"],
                      ["IN_PROGRESS", "In progress"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${defectStatusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setDefectStatusFilter(value);
                          setDefectStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {filteredDefects.length === 0 ? (
          <div className="empty-state">
            <strong>No open defects</strong>
            <span>There are currently no unresolved vehicle defects matching the current filters.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Defect</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported</th>
                </tr>
              </thead>

              <tbody>
                {filteredDefects.map((defect) => (
                  <tr key={defect.id}>
                    <td>
                      <div className="table-primary">{getVehicle(defect.vehicle_id)?.fleet_number || "Unknown"}</div>
                      <div className="table-secondary">{getVehicleLabel(defect.vehicle_id)}</div>
                    </td>

                    <td>
                      <div className="table-primary">{defect.item || "Unspecified defect"}</div>
                      <div className="table-secondary">{defect.description || "No description"}</div>
                    </td>

                    <td>{defect.category || "—"}</td>
                    <td><StatusBadge status={defect.severity || "MINOR"} /></td>
                    <td><StatusBadge status={defect.status || "REPORTED"} /></td>
                    <td>{formatDate(defect.reported_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Maintenance Records</span>
            <h3>Service History</h3>
          </div>

          <div className="table-secondary">
            {completedCount} completed · {cancelledCount} cancelled
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>

              <input
                type="search"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Fleet number, service type, description, or technician"
              />
            </label>

            <label className="select-control">
              <span>Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setHistoryStatusDropdownOpen((open) => !open)}
                >
                  <span>
                    {{
                      ALL: "All statuses",
                      COMPLETED: "Completed",
                      CANCELLED: "Cancelled",
                    }[historyStatusFilter]}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {historyStatusDropdownOpen && (
                  <div className="custom-select-menu">
                    {[
                      ["ALL", "All statuses"],
                      ["COMPLETED", "Completed"],
                      ["CANCELLED", "Cancelled"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select-option ${historyStatusFilter === value ? "selected" : ""}`}
                        onClick={() => {
                          setHistoryStatusFilter(value);
                          setHistoryStatusDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Garage</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setHistoryGarageDropdownOpen((open) => !open)}
                >
                  <span>{historyGarageFilter === "ALL" ? "All garages" : historyGarageFilter}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {historyGarageDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${historyGarageFilter === "ALL" ? "selected" : ""}`}
                      onClick={() => {
                        setHistoryGarageFilter("ALL");
                        setHistoryGarageDropdownOpen(false);
                      }}
                    >
                      All garages
                    </button>

                    {garages.map((garage) => (
                      <button
                        key={garage}
                        type="button"
                        className={`custom-select-option ${historyGarageFilter === garage ? "selected" : ""}`}
                        onClick={() => {
                          setHistoryGarageFilter(garage);
                          setHistoryGarageDropdownOpen(false);
                        }}
                      >
                        {garage}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            <strong>No service history found</strong>
            <span>Completed and cancelled service records will appear here.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table maintenance-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Completed</th>
                  <th>Performed By</th>
                  <th>Mileage</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((record) => {
                  const vehicle = getVehicle(record.vehicle_id);

                  return (
                    <tr key={record.id}>
                      <td>
                        <div className="table-primary">{vehicle?.fleet_number || "Unknown"}</div>
                        <div className="table-secondary">
                          {vehicle ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim() : "Vehicle unavailable"}
                        </div>
                      </td>

                      <td>
                        <div className="table-primary">{record.maintenance_type || "Service"}</div>
                        <div className="table-secondary">{record.description || "No description"}</div>
                      </td>

                      <td>{formatDateTime(record.performed_at || record.created_at)}</td>
                      <td>{record.performed_by || "—"}</td>
                      <td>{formatMileage(record.mileage)}</td>
                      <td><StatusBadge status={getRecordStatus(record)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showServiceForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setShowServiceForm(false);
            setSelectedRecord(null);
          }
        }}>
          <div className="modal modal-large">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Fleet Service</span>
                <h2>{selectedRecord ? "Service Order" : "New Service Order"}</h2>
                <p>{selectedRecord ? "Review and update this maintenance record." : "Create a maintenance order for a fleet vehicle."}</p>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => {
                setShowServiceForm(false);
                setSelectedRecord(null);
              }} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={saveServiceOrder}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Vehicle</span>
                    <select value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))} required>
                      <option value="">Select vehicle...</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.fleet_number} — {vehicle.year || ""} {vehicle.make || ""} {vehicle.model || ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Maintenance Type</span>
                    <input value={form.maintenanceType} onChange={(event) => setForm((current) => ({ ...current, maintenanceType: event.target.value }))} placeholder="e.g. Preventive Service" required />
                  </label>
                </div>

                <label className="form-field">
                  <span>Description</span>
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Describe the work required or completed." />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Status</span>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Performed By</span>
                    <input value={form.performedBy} onChange={(event) => setForm((current) => ({ ...current, performedBy: event.target.value }))} placeholder="Technician or shop" />
                  </label>
                </div>

                <div className="form-grid form-grid-three">
                  <label className="form-field">
                    <span>Current Mileage</span>
                    <input type="number" min="0" step="1" value={form.mileage} onChange={(event) => setForm((current) => ({ ...current, mileage: event.target.value }))} />
                  </label>

                  <label className="form-field">
                    <span>Due Mileage</span>
                    <input type="number" min="0" step="1" value={form.dueMileage} onChange={(event) => setForm((current) => ({ ...current, dueMileage: event.target.value }))} />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Due Date</span>
                    <input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
                  </label>

                  <label className="form-field">
                    <span>Performed Date</span>
                    <input type="datetime-local" value={form.performedAt} onChange={(event) => setForm((current) => ({ ...current, performedAt: event.target.value }))} />
                  </label>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <span className="eyebrow">Recurring Service</span>
                    <p>Optional intervals for the next scheduled service.</p>
                  </div>

                  <div className="form-grid">
                    <label className="form-field">
                      <span>Recurrence Days</span>
                      <input type="number" min="1" step="1" value={form.recurrenceDays} onChange={(event) => setForm((current) => ({ ...current, recurrenceDays: event.target.value }))} placeholder="e.g. 180" />
                    </label>

                    <label className="form-field">
                      <span>Recurrence Miles</span>
                      <input type="number" min="1" step="1" value={form.recurrenceMiles} onChange={(event) => setForm((current) => ({ ...current, recurrenceMiles: event.target.value }))} placeholder="e.g. 5000" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => {
                  setShowServiceForm(false);
                  setSelectedRecord(null);
                }} disabled={saving}>
                  Cancel
                </button>

                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "Saving..." : selectedRecord ? "Save Service Order" : "Create Service Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Inspections({ canEdit }) {
  const inspectionTypes = [
    { value: "PRE_TRIP", label: "Pre-Trip" },
    { value: "POST_TRIP", label: "Post-Trip" },
    { value: "ANNUAL", label: "Annual" },
    { value: "PERIODIC", label: "Periodic" },
    { value: "SPECIAL", label: "Special" },
  ];

  const checklistSections = [
    {
      title: "Exterior Lighting",
      type: "lighting",
      items: [
        { key: "lowBeam", label: "Low Beam Headlights", lamp: true },
        { key: "highBeam", label: "High Beam Headlights", lamp: true },
        { key: "runningLights", label: "Running Lights", lamp: true },
        { key: "markerLights", label: "Marker Lights", lamp: true },
        { key: "clearanceLights", label: "Clearance Lights", lamp: true },
        { key: "brakeLights", label: "Brake Lights", lamp: true },
        { key: "turnSignals", label: "Turn Signals", lamp: true },
        { key: "fourWayFlashers", label: "Four-Way Flashers", lamp: true },
        { key: "reverseLights", label: "Backup / Reverse Lights", lamp: true },
        { key: "licensePlateLights", label: "License-Plate Lights", lamp: true },
        { key: "amberWarningLights", label: "Amber Warning Lights", lamp: true },
        { key: "redWarningLights", label: "Red Warning Lights", lamp: true },
        { key: "stopArmLights", label: "Stop-Arm Lights", lamp: true },
      ],
    },
    {
      title: "Exterior",
      type: "standard",
      items: [
        { key: "outsideMirrors", label: "Outside Mirrors" },
        { key: "crossoverMirror", label: "Crossover Mirror" },
        { key: "windshield", label: "Windshield / Glass" },
        { key: "wipers", label: "Windshield Wipers" },
        { key: "washerFluid", label: "Windshield Washer System" },
        { key: "bodyPanels", label: "Body Panels" },
        { key: "serviceDoor", label: "Service / Passenger Door" },
        { key: "emergencyDoor", label: "Emergency Door" },
        { key: "emergencyWindows", label: "Emergency Windows" },
        { key: "roofHatches", label: "Emergency Roof Hatches" },
        { key: "stopArm", label: "Stop Arm" },
        { key: "crossingGate", label: "Crossing Gate" },
      ],
    },
    {
      title: "Interior",
      type: "standard",
      items: [
        { key: "seats", label: "Passenger Seats" },
        { key: "aisle", label: "Aisle" },
        { key: "floor", label: "Floor Condition" },
        { key: "interiorLighting", label: "Interior / Dome Lighting" },
        { key: "handrails", label: "Handrails" },
        { key: "gauges", label: "Gauges / Instruments" },
        { key: "horn", label: "Horn" },
        { key: "interiorMirrors", label: "Interior Mirrors" },
        { key: "warningIndicators", label: "Warning Indicators" },
        { key: "heater", label: "Heater" },
        { key: "defrosterFan", label: "Defroster / Blower Fan" },
        { key: "defroster", label: "Defroster" },
        { key: "fans", label: "Passenger Fans" },
      ],
    },
    {
      title: "Mechanical",
      type: "mechanical",
      items: [
        { key: "transmissionFluid", label: "Transmission / Drive Fluid" },
        { key: "beltsHoses", label: "Belts / Hoses" },
        { key: "exhaustSystem", label: "Exhaust System" },
        { key: "dpf", label: "Diesel Particulate Filter (DPF)", dieselOnly: true },
        { key: "def", label: "Diesel Exhaust Fluid (DEF) System", dieselOnly: true },
      ],
      evItems: [
        { key: "highVoltagePlacards", label: "High-Voltage Placards" },
        { key: "highVoltageWiring", label: "High-Voltage Wiring" },
        { key: "batteryCooling", label: "Battery Cooling System" },
        { key: "batteryCarriage", label: "Battery Carriage / Mounting" },
        { key: "electricDriveMotor", label: "Electric Drive Motor" },
      ],
    },
    {
      title: "Brakes & Steering",
      type: "standard",
      items: [
        { key: "serviceBrakes", label: "Service Brakes" },
        { key: "parkingBrake", label: "Parking Brake" },
        { key: "steering", label: "Steering System" },
        { key: "absWarning", label: "ABS Warning System" },
        { key: "electronicStabilityControl", label: "Electronic Stability Control" },
      ],
    },
    {
      title: "Chassis",
      type: "standard",
      items: [
        { key: "frontTires", label: "Front Tires" },
        { key: "rearTires", label: "Rear Tires" },
        { key: "tireTread", label: "Tire Condition / Tread" },
        { key: "wheelLugNuts", label: "Wheel Lug Nuts" },
        { key: "wheels", label: "Wheels / Rims" },
        { key: "axles", label: "Axles" },
        { key: "suspension", label: "Suspension" },
        { key: "frame", label: "Frame / Structural Supports" },
      ],
    },
    {
      title: "Safety",
      type: "standard",
      items: [
        { key: "emergencyExitAlarms", label: "Emergency-Exit Alarms" },
        { key: "fireExtinguisher", label: "Fire Extinguisher" },
        { key: "firstAidKit", label: "First-Aid Kit" },
        { key: "emergencyReflectors", label: "Emergency Reflectors" },
      ],
    },
  ];

  const lampSystems = [
    { key: "lowBeam", label: "Low Beam Headlights", maximum: 4 },
    { key: "highBeam", label: "High Beam Headlights", maximum: 4 },
    { key: "runningLights", label: "Running Lights", maximum: 2 },
    { key: "markerLights", label: "Marker Lights", maximum: 6 },
    { key: "clearanceLights", label: "Clearance Lights", maximum: 6 },
    { key: "brakeLights", label: "Brake Lights", maximum: 2 },
    { key: "turnSignals", label: "Turn Signals", maximum: 8 },
    { key: "fourWayFlashers", label: "Four-Way Flashers", maximum: 4 },
    { key: "reverseLights", label: "Backup / Reverse Lights", maximum: 2 },
    { key: "licensePlateLights", label: "License-Plate Lights", maximum: 2 },
    { key: "amberWarningLights", label: "Amber Warning Lights", maximum: 4 },
    { key: "redWarningLights", label: "Red Warning Lights", maximum: 4 },
    { key: "stopArmLights", label: "Stop-Arm Lights", maximum: 8 },
  ];

  const lightingKeys = new Set(lampSystems.map((lamp) => lamp.key));

  const mspFailureTagMap = {
    outsideMirrors: "RED",
    crossoverMirror: "RED",
    windshield: "RED",
    wipers: "RED",
    washerFluid: "YELLOW",
    bodyPanels: "YELLOW",
    serviceDoor: "RED",
    emergencyDoor: "RED",
    emergencyWindows: "RED",
    roofHatches: "RED",
    stopArm: "RED",
    crossingGate: "RED",

    seats: "RED",
    aisle: "RED",
    floor: "YELLOW",
    interiorLighting: "YELLOW",
    handrails: "RED",
    gauges: "YELLOW",
    horn: "RED",
    interiorMirrors: "YELLOW",
    warningIndicators: "RED",
    heater: "YELLOW",
    defrosterFan: "RED",
    defroster: "RED",
    fans: "YELLOW",

    transmissionFluid: "YELLOW",
    beltsHoses: "RED",
    exhaustSystem: "RED",
    dpf: "YELLOW",
    def: "YELLOW",

    serviceBrakes: "RED",
    parkingBrake: "RED",
    steering: "RED",
    absWarning: "YELLOW",
    electronicStabilityControl: "YELLOW",

    frontTires: "RED",
    rearTires: "RED",
    tireTread: "RED",
    wheelLugNuts: "RED",
    wheels: "RED",
    axles: "RED",
    suspension: "RED",
    frame: "RED",

    emergencyExitAlarms: "YELLOW",
    fireExtinguisher: "RED",
    firstAidKit: "YELLOW",
    emergencyReflectors: "YELLOW",

    highVoltagePlacards: "YELLOW",
    highVoltageWiring: "RED",
    batteryCooling: "RED",
    batteryCarriage: "RED",
    electricDriveMotor: "RED",
  };

  const mspLightingRules = {
    lowBeam: { yellowAt: 1, redAt: 2 },
    highBeam: { yellowAt: 1, redAt: null },
    runningLights: { yellowAt: 1, redAt: null },
    markerLights: { yellowAt: 1, redAt: null },
    clearanceLights: { yellowAt: 1, redAt: null },
    brakeLights: { yellowAt: 1, redAt: 2 },
    turnSignals: { yellowAt: null, redAt: 1 },
    fourWayFlashers: { yellowAt: null, redAt: 1 },
    reverseLights: { yellowAt: 1, redAt: 2 },
    licensePlateLights: { yellowAt: 1, redAt: null },
    amberWarningLights: { yellowAt: 1, redAt: null },
    redWarningLights: { yellowAt: null, redAt: 1 },
    stopArmLights: { yellowAt: 1, redAt: 2 },
  };

  const [audits, setAudits] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [inspectorDropdownOpen, setInspectorDropdownOpen] = useState(false);
  const [inspectionTypeDropdownOpen, setInspectionTypeDropdownOpen] = useState(false);

  const [inspectionView, setInspectionView] = useState("list");
  const [selectedInspection, setSelectedInspection] = useState(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [inspectionType, setInspectionType] = useState("PRE_TRIP");
  const [checklist, setChecklist] = useState({});
  const [lampDefects, setLampDefects] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(selectedVehicleId)) || null;

  function vehicleText(vehicle) {
    return [
      vehicle?.engine,
      vehicle?.fuel_type,
      vehicle?.fuel,
      vehicle?.powertrain,
      vehicle?.model,
      vehicle?.make,
    ].filter(Boolean).join(" ");
  }

  function isDieselVehicle(vehicle) {
    return /diesel/i.test(vehicleText(vehicle));
  }

  function isElectricVehicle(vehicle) {
    return /electric|battery electric|bev|\bev\b/i.test(vehicleText(vehicle));
  }

  const selectedVehicleIsDiesel = isDieselVehicle(selectedVehicle);
  const selectedVehicleIsElectric = isElectricVehicle(selectedVehicle);

  const totalInspections = audits.length;
  const passedInspections = audits.filter((inspection) => inspection.result === "PASS").length;
  const failedInspections = audits.filter((inspection) => inspection.result === "FAIL").length;

  const filteredAudits = audits.filter((inspection) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      inspection.vehicles?.fleet_number,
      inspection.drivers?.name,
      inspection.audit_type,
      inspection.result,
      inspection.notes,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  function createDefaultLampDefects() {
    const values = {};

    lampSystems.forEach((lamp) => {
      values[lamp.key] = 0;
    });

    return values;
  }

  function createDefaultChecklist(vehicle = null) {
    const isDiesel = isDieselVehicle(vehicle);
    const isElectric = isElectricVehicle(vehicle);
    const values = {};

    checklistSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.dieselOnly && !isDiesel) {
          values[item.key] = "N/A";
        } else {
          values[item.key] = "PENDING";
        }
      });

      (section.evItems || []).forEach((item) => {
        values[item.key] = isElectric ? "PENDING" : "N/A";
      });
    });

    return values;
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString();
  }

  function getInspectionTypeLabel(value) {
    return inspectionTypes.find((type) => type.value === value)?.label || value || "—";
  }

  function getConditionClass(value) {
    if (value === "PASS") {
      return "status-badge status-pass";
    }

    if (value === "FAIL" || value === "RED") {
      return "status-badge status-fail";
    }

    if (value === "YELLOW") {
      return "status-badge inspection-result-yellow";
    }

    if (value === "N/A" || value === "NA") {
      return "status-badge status-neutral";
    }

    return "status-badge status-neutral";
  }

  function getInspectionTagLabel(tag) {
    if (tag === "RED") {
      return "RED TAG";
    }

    if (tag === "YELLOW") {
      return "YELLOW TAG";
    }

    if (tag === "PENDING") {
      return "PENDING";
    }

    if (tag === "N/A") {
      return "N/A";
    }

    return "PASS";
  }

  function resetInspectionForm() {
    setSelectedVehicleId("");
    setSelectedDriverId("");
    setInspectionType("PRE_TRIP");
    setChecklist(createDefaultChecklist());
    setLampDefects(createDefaultLampDefects());
    setNotes("");
    setFormError("");
  }

  function openNewInspection() {
    resetInspectionForm();
    setVehicleDropdownOpen(false);
    setInspectorDropdownOpen(false);
    setInspectionTypeDropdownOpen(false);
    setInspectionView("new");
    setMessage("");
  }

  function openInspectionDetails(inspection) {
    setSelectedInspection(inspection);
    setInspectionView("details");
  }

  function returnToInspectionList() {
    if (saving) {
      return;
    }

    setSelectedInspection(null);
    setInspectionView("list");
    setFormError("");
  }

  function selectVehicle(vehicleId) {
    const vehicle = vehicles.find((item) => String(item.id) === String(vehicleId)) || null;

    setSelectedVehicleId(vehicleId);
    setChecklist(createDefaultChecklist(vehicle));
    setLampDefects(createDefaultLampDefects());
    setFormError("");
  }

  function updateChecklist(key, value) {
    setChecklist((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function incrementLampDefect(key, maximum) {
    setLampDefects((current) => ({
      ...current,
      [key]: Math.min(maximum, (Number(current[key]) || 0) + 1),
    }));
  }

  function decrementLampDefect(key) {
    setLampDefects((current) => ({
      ...current,
      [key]: Math.max(0, (Number(current[key]) || 0) - 1),
    }));
  }

  function getEffectiveChecklist() {
    const effectiveChecklist = {
      ...checklist,
      lampDefects: {
        ...lampDefects,
      },
    };

    if (!selectedVehicleIsDiesel) {
      effectiveChecklist.dpf = "N/A";
      effectiveChecklist.def = "N/A";
    }

    if (!selectedVehicleIsElectric) {
      effectiveChecklist.highVoltagePlacards = "N/A";
      effectiveChecklist.highVoltageWiring = "N/A";
      effectiveChecklist.batteryCooling = "N/A";
      effectiveChecklist.batteryCarriage = "N/A";
      effectiveChecklist.electricDriveMotor = "N/A";
    }

    return effectiveChecklist;
  }

  function getLightingTag(key, quantity) {
    const count = Number(quantity) || 0;
    const rule = mspLightingRules[key];

    if (count <= 0 || !rule) {
      return "PASS";
    }

    if (rule.redAt !== null && count >= rule.redAt) {
      return "RED";
    }

    if (rule.yellowAt !== null && count >= rule.yellowAt) {
      return "YELLOW";
    }

    return "PASS";
  }

  function getItemTag(itemKey, value) {
    if (value === "N/A" || value === "NA") {
      return "N/A";
    }

    if (value === "PENDING") {
      return "PENDING";
    }

    if (value !== "FAIL") {
      return "PASS";
    }

    return mspFailureTagMap[itemKey] || "YELLOW";
  }

  function getSectionTag(section, sectionItems, currentChecklist, currentLampDefects) {
    const items = sectionItems || [];

    if (items.length === 0) {
      return "N/A";
    }

    let hasPending = false;
    let hasYellow = false;

    for (const item of items) {
      if (section.type === "lighting") {
        const tag = getLightingTag(item.key, currentLampDefects?.[item.key]);

        if (tag === "RED") {
          return "RED";
        }

        if (tag === "YELLOW") {
          hasYellow = true;
        }

        continue;
      }

      const tag = getItemTag(item.key, currentChecklist?.[item.key]);

      if (tag === "PENDING") {
        hasPending = true;
      }

      if (tag === "RED") {
        return "RED";
      }

      if (tag === "YELLOW") {
        hasYellow = true;
      }
    }

    if (hasPending) {
      return "PENDING";
    }

    if (hasYellow) {
      return "YELLOW";
    }

    return "PASS";
  }

  function getOverallInspectionTag(currentChecklist, currentLampDefects) {
    let hasPending = false;
    let hasYellow = false;

    for (const section of checklistSections) {
      const sectionTag = getSectionTag(section, section.items, currentChecklist, currentLampDefects);

      if (sectionTag === "RED") {
        return "RED";
      }

      if (sectionTag === "YELLOW") {
        hasYellow = true;
      }

      if (sectionTag === "PENDING") {
        hasPending = true;
      }

      if (section.evItems) {
        const evTag = getSectionTag(section, section.evItems, currentChecklist, currentLampDefects);

        if (evTag === "RED") {
          return "RED";
        }

        if (evTag === "YELLOW") {
          hasYellow = true;
        }

        if (evTag === "PENDING") {
          hasPending = true;
        }
      }
    }

    if (hasPending) {
      return "PENDING";
    }

    if (hasYellow) {
      return "YELLOW";
    }

    return "PASS";
  }

  function getInspectionTagClass(tag) {
    if (tag === "RED") {
      return "status-badge status-fail";
    }

    if (tag === "YELLOW") {
      return "status-badge inspection-result-yellow";
    }

    if (tag === "PENDING") {
      return "status-badge status-neutral";
    }

    return "status-badge status-pass";
  }

  function buildDefects() {
    const defects = [];
    const effectiveChecklist = getEffectiveChecklist();

    Object.entries(effectiveChecklist).forEach(([item, value]) => {
      if (item === "lampDefects") {
        Object.entries(value).forEach(([lampKey, quantity]) => {
          const count = Number(quantity) || 0;

          if (count <= 0) {
            return;
          }

          const lamp = lampSystems.find((entry) => entry.key === lampKey);
          const tag = getLightingTag(lampKey, count);

          defects.push({
            category: "Exterior Lighting",
            item: lamp?.label || lampKey,
            description: `${count} defective ${String(lamp?.label || lampKey).toLowerCase()}.`,
            tag,
            severity: tag === "RED" ? "CRITICAL" : "MINOR",
            quantity: count,
          });
        });

        return;
      }

      if (lightingKeys.has(item)) {
        return;
      }

      if (value !== "FAIL") {
        return;
      }

      let category = "Inspection";
      let label = item;

      checklistSections.forEach((section) => {
        const matchingItem = section.items.find((entry) => entry.key === item);
        const matchingEvItem = (section.evItems || []).find((entry) => entry.key === item);

        if (matchingItem) {
          category = section.title;
          label = matchingItem.label;
        }

        if (matchingEvItem) {
          category = "Mechanical";
          label = matchingEvItem.label;
        }
      });

      const tag = mspFailureTagMap[item] || "YELLOW";

      defects.push({
        category,
        item: label,
        description: `${label} failed inspection.`,
        tag,
        severity: tag === "RED" ? "CRITICAL" : "MINOR",
        quantity: 1,
      });
    });

    return defects;
  }

  function calculateResult() {
    const effectiveChecklist = getEffectiveChecklist();
    const tag = getOverallInspectionTag(effectiveChecklist, lampDefects);

    return {
      result: tag === "RED" ? "FAIL" : "PASS",
      tag,
    };
  }

  async function loadInspections(showSpinner = false) {
    if (showSpinner) {
      setRefreshing(true);
    }

    setError("");

    try {
      const [
        { data: auditData, error: auditError },
        { data: vehicleData, error: vehicleError },
        { data: driverData, error: driverError },
      ] = await Promise.all([
        supabase.from("audits").select(`
          *,
          vehicles(fleet_number),
          drivers(name)
        `).order("created_at", { ascending: false }),

        supabase.from("vehicles").select("*").order("garage", { ascending: true }).order("year", { ascending: true }).order("fleet_number", { ascending: true }),

        supabase.from("drivers").select("*").order("name", { ascending: true }),
      ]);

      if (auditError) {
        throw auditError;
      }

      if (vehicleError) {
        throw vehicleError;
      }

      if (driverError) {
        throw driverError;
      }

      setAudits(auditData || []);
      setVehicles(vehicleData || []);
      setDrivers(driverData || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load inspections.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInspections();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [message]);

  async function saveInspection() {
    setFormError("");

    if (!selectedVehicleId) {
      setFormError("Select a vehicle before completing the inspection.");
      return;
    }

    const effectiveChecklist = getEffectiveChecklist();

    const hasPendingItems = Object.entries(effectiveChecklist).some(([key, value]) => {
      if (key === "lampDefects") {
        return false;
      }

      return value === "PENDING";
    });

    if (hasPendingItems) {
      setFormError("Complete every applicable inspection item before completing the inspection.");
      return;
    }

    const defects = buildDefects();
    const calculated = calculateResult();

    if (calculated.tag === "PENDING") {
      setFormError("Complete every applicable inspection item before completing the inspection.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: inspectionError } = await supabase.rpc("submit_vehicle_inspection", {
        p_vehicle_id: selectedVehicleId,
        p_checklist: effectiveChecklist,
        p_defects: defects,
        p_driver_id: selectedDriverId || null,
        p_audit_type: inspectionType,
        p_notes: notes.trim() || null,
      });

      if (inspectionError) {
        throw inspectionError;
      }

      const savedResult = data?.result || calculated.result;

      resetInspectionForm();
      await loadInspections();

      setInspectionView("list");

      if (calculated.tag === "RED" || savedResult === "FAIL") {
        setMessage("Inspection completed. Red Tag condition identified.");
      } else if (calculated.tag === "YELLOW") {
        setMessage("Inspection completed. Yellow Tag deficiencies identified; no Red Tag condition was found.");
      } else {
        setMessage("Inspection completed. No MSP Yellow Tag or Red Tag deficiencies identified.");
      }
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save inspection.");
    } finally {
      setSaving(false);
    }
  }

  function getStoredChecklistValue(inspection, key) {
    return inspection?.checklist?.[key] || "N/A";
  }

  function getInspectionVehicle(inspection) {
    return vehicles.find((vehicle) => String(vehicle.id) === String(inspection?.vehicle_id)) || null;
  }

  function getStoredSectionTag(section, inspection, sectionItems) {
    const storedChecklist = inspection?.checklist || {};
    const storedLampDefects = storedChecklist.lampDefects || {};

    return getSectionTag(section, sectionItems, storedChecklist, storedLampDefects);
  }

  function getStoredOverallTag(inspection) {
    return getOverallInspectionTag(
      inspection?.checklist || {},
      inspection?.checklist?.lampDefects || {},
    );
  }

  function renderConditionButtons(item, value) {
    return (
      <div className="inspection-condition-buttons">
        <button
          type="button"
          className={`button button-small inspection-condition-button inspection-condition-button-pass ${value === "PASS" ? "active" : ""
            }`}
          onClick={() => updateChecklist(item.key, "PASS")}
          disabled={saving}
        >
          Pass
        </button>

        <button
          type="button"
          className={`button button-small inspection-condition-button inspection-condition-button-fail ${value === "FAIL" ? "active" : ""
            }`}
          onClick={() => updateChecklist(item.key, "FAIL")}
          disabled={saving}
        >
          Fail
        </button>

        <button
          type="button"
          className={`button button-small inspection-condition-button inspection-condition-button-na ${value === "N/A" ? "active" : ""
            }`}
          onClick={() => updateChecklist(item.key, "N/A")}
          disabled={saving}
        >
          N/A
        </button>
      </div>
    );
  }

  function renderLampDefectCounter(lamp) {
    const defectiveCount = Number(lampDefects[lamp.key]) || 0;

    return (
      <div className="inspection-defect-counter">
        <button
          type="button"
          className="button button-secondary button-small inspection-defect-button inspection-defect-button-minus"
          onClick={() => decrementLampDefect(lamp.key)}
          disabled={saving || defectiveCount <= 0}
          aria-label={`Decrease defective ${lamp.label}`}
        >
          −
        </button>

        <span
          className={`inspection-defect-count ${defectiveCount > 0 ? "active" : ""
            }`}
        >
          {defectiveCount}
        </span>

        <button
          type="button"
          className="button button-secondary button-small inspection-defect-button inspection-defect-button-plus"
          onClick={() => incrementLampDefect(lamp.key, lamp.maximum)}
          disabled={saving || defectiveCount >= lamp.maximum}
          aria-label={`Increase defective ${lamp.label}`}
        >
          +
        </button>
      </div>
    );
  }

  function renderInspectionTable(
    sectionItems,
    section,
    stored = false,
    inspection = null,
  ) {
    const isLighting = section.type === "lighting";
    const storedChecklist = inspection?.checklist || {};
    const storedLampDefects = storedChecklist.lampDefects || {};

    return (
      <div className="table-container">
        <table
          className={`data-table inspection-checklist-table ${isLighting ? "inspection-lighting-table" : ""
            }`}
        >
          <tbody>
            {sectionItems.map((item) => {
              const value = stored
                ? getStoredChecklistValue(inspection, item.key)
                : checklist[item.key] || "PENDING";

              const lamp = isLighting
                ? lampSystems.find((entry) => entry.key === item.key)
                : null;

              const defectiveCount = stored
                ? Number(storedLampDefects[item.key]) || 0
                : Number(lampDefects[item.key]) || 0;

              const storedTag = isLighting
                ? getLightingTag(item.key, defectiveCount)
                : getItemTag(item.key, value);

              return (
                <tr key={item.key}>
                  <td>
                    <span className="table-main-text inspection-item-label">
                      {item.label}
                    </span>
                  </td>

                  {isLighting && (
                    <td className="inspection-defective-cell">
                      {stored ? (
                        <span
                          className={
                            defectiveCount > 0
                              ? "inspection-lamp-defect"
                              : "table-main-text"
                          }
                        >
                          {defectiveCount}
                        </span>
                      ) : (
                        renderLampDefectCounter(lamp)
                      )}
                    </td>
                  )}

                  {(stored || !isLighting) && (
                    <td className="inspection-condition-cell">
                      {stored ? (
                        <span className={getConditionClass(storedTag)}>
                          {getInspectionTagLabel(storedTag)}
                        </span>
                      ) : (
                        renderConditionButtons(item, value)
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderInspectionReportForm() {
    if (!selectedVehicle) {
      return (
        <div className="empty-state">
          <strong>Select a vehicle to begin</strong>
          <span>The inspection report will appear after a vehicle is selected.</span>
        </div>
      );
    }

    return (
      <div className="inspection-report-content">
        {checklistSections.map((section) => {
          const sectionItems = section.items.filter((item) => {
            if (item.dieselOnly && !selectedVehicleIsDiesel) {
              return false;
            }

            return true;
          });

          const sectionTag = getSectionTag(section, sectionItems, checklist, lampDefects);
          const showEvSystems = section.title === "Mechanical" && selectedVehicleIsElectric;

          if (sectionItems.length === 0 && !showEvSystems) {
            return null;
          }

          return (
            <div className="inspection-report-section" key={section.title}>
              <div className="inspection-report-section-header">
                <div>
                  <span className="eyebrow">Checklist</span>
                  <h4>{section.title}</h4>
                </div>

                <span className={getInspectionTagClass(sectionTag)}>
                  {getInspectionTagLabel(sectionTag)}
                </span>
              </div>

              {sectionItems.length > 0 && renderInspectionTable(sectionItems, section)}

              {showEvSystems && (
                <div className="inspection-report-subsection">
                  <div className="inspection-subsection-header">
                    <div>
                      <span className="eyebrow">Electric Vehicle</span>
                      <h4>EV Systems</h4>
                    </div>

                    <span className={getInspectionTagClass(getSectionTag(section, section.evItems, checklist, lampDefects))}>
                      {getInspectionTagLabel(getSectionTag(section, section.evItems, checklist, lampDefects))}
                    </span>
                  </div>

                  {renderInspectionTable(section.evItems, section)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderInspectionReportDetails(inspection) {
    const inspectionVehicle = getInspectionVehicle(inspection);
    const inspectionIsDiesel = isDieselVehicle(inspectionVehicle);
    const inspectionIsElectric = isElectricVehicle(inspectionVehicle);

    return (
      <div className="inspection-report-content">
        {checklistSections.map((section) => {
          const sectionItems = section.items.filter((item) => {
            if (item.dieselOnly) {
              return inspectionIsDiesel;
            }

            return true;
          });

          const sectionTag = getStoredSectionTag(section, inspection, sectionItems);
          const showEvSystems = section.title === "Mechanical" && inspectionIsElectric;

          if (sectionItems.length === 0 && !showEvSystems) {
            return null;
          }

          return (
            <div className="inspection-report-section" key={section.title}>
              <div className="inspection-report-section-header">
                <div>
                  <span className="eyebrow">Checklist</span>
                  <h4>{section.title}</h4>
                </div>

                <span className={getInspectionTagClass(sectionTag)}>
                  {getInspectionTagLabel(sectionTag)}
                </span>
              </div>

              {sectionItems.length > 0 && renderInspectionTable(sectionItems, section, true, inspection)}

              {showEvSystems && (
                <div className="inspection-report-subsection">
                  <div className="inspection-subsection-header">
                    <div>
                      <span className="eyebrow">Electric Vehicle</span>
                      <h4>EV Systems</h4>
                    </div>

                    <span className={getInspectionTagClass(getStoredSectionTag(section, inspection, section.evItems))}>
                      {getInspectionTagLabel(getStoredSectionTag(section, inspection, section.evItems))}
                    </span>
                  </div>

                  {renderInspectionTable(section.evItems, section, true, inspection)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (inspectionView === "new") {
    return (
      <section className="page-section inspection-page inspection-form-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToInspectionList}
              disabled={saving}
            >
              ← Back to Inspections
            </button>

            <span className="eyebrow">Fleet Compliance / New Inspection</span>
            <h1>New Inspection</h1>
            <p>Record the inspection results for a vehicle.</p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={returnToInspectionList}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveInspection}
              disabled={saving || !selectedVehicle}
            >
              {saving ? "Completing..." : "Complete Inspection"}
            </button>
          </div>
        </div>

        {formError && (
          <div className="alert alert-error">
            {formError}
          </div>
        )}

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Inspection Setup</span>
              <h3>Inspection Information</h3>
            </div>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="select-control">
              <span>Vehicle</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setVehicleDropdownOpen((open) => !open);
                    setInspectorDropdownOpen(false);
                    setInspectionTypeDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>{selectedVehicle?.fleet_number || "Select vehicle"}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {vehicleDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${!selectedVehicleId ? "selected" : ""}`}
                      onClick={() => {
                        selectVehicle("");
                        setVehicleDropdownOpen(false);
                      }}
                    >
                      Select vehicle
                    </button>

                    {vehicles.map((vehicle) => (
                      <button
                        type="button"
                        key={vehicle.id}
                        className={`custom-select-option ${String(selectedVehicleId) === String(vehicle.id) ? "selected" : ""}`}
                        onClick={() => {
                          selectVehicle(vehicle.id);
                          setVehicleDropdownOpen(false);
                        }}
                      >
                        {vehicle.fleet_number}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Inspector</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setInspectorDropdownOpen((open) => !open);
                    setVehicleDropdownOpen(false);
                    setInspectionTypeDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>{drivers.find((driver) => String(driver.id) === String(selectedDriverId))?.name || "No inspector assigned"}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {inspectorDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${!selectedDriverId ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedDriverId("");
                        setInspectorDropdownOpen(false);
                      }}
                    >
                      No inspector assigned
                    </button>

                    {drivers.map((driver) => (
                      <button
                        type="button"
                        key={driver.id}
                        className={`custom-select-option ${String(selectedDriverId) === String(driver.id) ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedDriverId(driver.id);
                          setInspectorDropdownOpen(false);
                        }}
                      >
                        {driver.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Inspection Type</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setInspectionTypeDropdownOpen((open) => !open);
                    setVehicleDropdownOpen(false);
                    setInspectorDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>{getInspectionTypeLabel(inspectionType)}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {inspectionTypeDropdownOpen && (
                  <div className="custom-select-menu">
                    {inspectionTypes.map((type) => (
                      <button
                        type="button"
                        key={type.value}
                        className={`custom-select-option ${inspectionType === type.value ? "selected" : ""}`}
                        onClick={() => {
                          setInspectionType(type.value);
                          setInspectionTypeDropdownOpen(false);
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="panel inspection-report-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Inspection Report</span>
              <h3>{selectedVehicle ? "New Inspection Report" : "Select a vehicle to begin"}</h3>
            </div>
          </div>

          {renderInspectionReportForm()}
        </div>

        {selectedVehicle && (
          <div className="inspection-notes-section">
            <div className="inspection-notes-header">
              <div>
                <span className="eyebrow">Inspection Notes</span>
                <h3>Notes</h3>
              </div>
            </div>

            <div className="inspection-notes-content inspection-notes-editor">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Enter inspection notes..."
                rows="6"
                disabled={saving}
              />
            </div>
          </div>
        )}

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToInspectionList}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={saveInspection}
            disabled={saving || !selectedVehicle}
          >
            {saving ? "Completing..." : "Complete Inspection"}
          </button>
        </div>
      </section>
    );
  }

  if (inspectionView === "details" && selectedInspection) {
    const inspectionVehicle = getInspectionVehicle(selectedInspection);
    const overallTag = getStoredOverallTag(selectedInspection);

    return (
      <section className="page-section inspection-page inspection-detail-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button type="button" className="button button-secondary button-small inspection-back-button" onClick={returnToInspectionList}>
              ← Back to Inspections
            </button>

            <span className="eyebrow">Fleet Compliance / Inspection Record</span>
            <h1>{selectedInspection.vehicles?.fleet_number || "Unknown"}</h1>
            <p>{getInspectionTypeLabel(selectedInspection.audit_type)} inspection record.</p>
          </div>
        </div>

        <div className="panel inspection-information-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Inspection Information</span>
              <h3>Inspection Record</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list-row">
              <span>Inspection Type</span>
              <strong>{getInspectionTypeLabel(selectedInspection.audit_type)}</strong>
            </div>

            <div className="detail-list-row">
              <span>Vehicle</span>
              <strong>{selectedInspection.vehicles?.fleet_number || "Unknown"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Vehicle Details</span>
              <strong>
                {[inspectionVehicle?.year, inspectionVehicle?.make, inspectionVehicle?.model]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </strong>
            </div>

            <div className="detail-list-row">
              <span>Inspector</span>
              <strong>{selectedInspection.drivers?.name || "Unassigned"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Completed</span>
              <strong>
                {formatDate(selectedInspection.completed_at || selectedInspection.created_at)}
              </strong>
            </div>
          </div>
        </div>

        <div className="panel inspection-report-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Inspection Results</span>
              <h3>Inspection Results</h3>
            </div>

            <span className={getInspectionTagClass(overallTag)}>
              {getInspectionTagLabel(overallTag)}
            </span>
          </div>

          {renderInspectionReportDetails(selectedInspection)}
        </div>

        <div className="inspection-notes-section inspection-notes-readonly">
          <div className="inspection-notes-header">
            <div>
              <span className="eyebrow">Inspection Notes</span>
              <h3>Notes</h3>
            </div>
          </div>

          <div className="inspection-notes-content">
            {selectedInspection.notes || "No notes were recorded for this inspection."}
          </div>
        </div>

        <div className="inspection-page-footer">
          <button type="button" className="button button-secondary" onClick={returnToInspectionList}>
            Back to Inspections
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section inspection-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Fleet Compliance</span>
          <h1>Inspections</h1>
          <p>Pre-trip, post-trip, annual, periodic, and special vehicle inspections.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button type="button" className="button button-primary" onClick={openNewInspection}>
              New Inspection
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadInspections(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="inspection-success-popup">
          <div>
            <strong>Inspection Completed</strong>
            <span>{message}</span>
          </div>

          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="inspection-kpi-grid">
        <DashboardKpi label="Total Inspections" value={totalInspections} detail="Recorded inspections" />
        <DashboardKpi label="Passed" value={passedInspections} detail="Completed inspections without a Red Tag" />
        <DashboardKpi label="Failed" value={failedInspections} detail="Inspections receiving a Red Tag" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Inspection History</span>
            <h3>Previous Inspections</h3>
          </div>

          <span className="panel-count">
            {filteredAudits.length} of {totalInspections}
          </span>
        </div>

        <div className="toolbar">
          <div className="toolbar-controls">
            <label className="search-control">
              <span>Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Fleet, inspector, type, result..."
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Loading inspections</strong>
            <span>Retrieving inspection records.</span>
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="empty-state">
            <strong>No inspections found</strong>
            <span>Adjust the search or create a new inspection.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Inspector</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Completed</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredAudits.map((inspection) => {
                  const inspectionTag = getStoredOverallTag(inspection);

                  return (
                    <tr key={inspection.id}>
                      <td>
                        <span className="table-primary-link">
                          {inspection.vehicles?.fleet_number || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <span className="table-main-text">
                          {inspection.drivers?.name || "Unassigned"}
                        </span>
                      </td>

                      <td>
                        <span className="table-main-text">
                          {getInspectionTypeLabel(inspection.audit_type)}
                        </span>
                      </td>

                      <td>
                        <span className={getInspectionTagClass(inspectionTag)}>
                          {getInspectionTagLabel(inspectionTag)}
                        </span>
                      </td>

                      <td>
                        <span className="table-main-text">
                          {formatDate(inspection.completed_at || inspection.created_at)}
                        </span>
                      </td>

                      <td className="inspection-history-notes">
                        <span title={inspection.notes || ""}>
                          {inspection.notes || "—"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => openInspectionDetails(inspection)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Settings({ role, canEdit, preferences, setPreferences, session, setPage }) {
  const [activeSection, setActiveSection] = useState("Operations");
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const sections = [
    {
      label: "Operations",
      description: "Fleet tracking and live operations behavior.",
    },
    {
      label: "Dashboard",
      description: "Control the amount of operational information displayed.",
    },
    {
      label: "Alerts",
      description: "Choose which operational warnings are displayed.",
    },
    {
      label: "Interface",
      description: "Control the appearance and default behavior of the system.",
    },
    {
      label: "Account",
      description: "Manage your account session and authentication settings.",
    },
    {
      label: "System",
      description: "Review system configuration and account access.",
    },
  ];

  function updatePreference(key, value) {
    if (!canEdit) {
      return;
    }

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    setSaveMessage("Settings saved");
    window.clearTimeout(window.__clinoSettingsMessageTimeout);
    window.__clinoSettingsMessageTimeout = window.setTimeout(() => {
      setSaveMessage("");
    }, 1800);
  }

  function resetPreferences() {
    if (!canEdit) {
      return;
    }

    const defaults = {
      density: "comfortable",
      telemetryInterval: 15,
      showOffline: true,
      showStale: true,
      defaultSection: "Dashboard",
      activityCount: 8,
      maintenanceCount: 8,
      autoFollowVehicle: false,
      vehicleLabels: true,
      mapRefresh: 15,
      maintenanceWarnings: true,
      inspectionWarnings: true,
      offlineWarnings: true,
    };

    setPreferences(defaults);
    setSaveMessage("Preferences reset to defaults");
    window.clearTimeout(window.__clinoSettingsMessageTimeout);
    window.__clinoSettingsMessageTimeout = window.setTimeout(() => {
      setSaveMessage("");
    }, 2200);
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!passwordForm.password || !passwordForm.confirmPassword) {
      setPasswordError("Enter and confirm your new password.");
      return;
    }

    if (passwordForm.password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setPasswordBusy(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.password,
    });

    if (error) {
      setPasswordError(error.message || "Unable to update password.");
      setPasswordBusy(false);
      return;
    }

    setPasswordForm({
      password: "",
      confirmPassword: "",
    });

    setPasswordMessage("Password updated successfully.");
    setPasswordBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const accountName = session?.user?.email?.split("@")[0] || "User";
  const accountEmail = session?.user?.email || "Unknown";
  const roleLabel = role === "admin" ? "Administrator" : role === "viewer" ? "Viewer" : role;

  function renderOperations() {
    return (
      <>
        <div className="page-section">
          <div className="page-intro">
            <div className="page-intro-copy">
              <div className="eyebrow">OPERATIONS CONFIGURATION</div>
              <h2>Fleet tracking</h2>
              <p>Control how frequently the application refreshes live fleet information and how vehicles are presented during operations.</p>
            </div>
          </div>

          <div className="settings-grid">
            <section className="panel settings-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">TELEMETRY</span>
                  <h3>Live fleet updates</h3>
                </div>
              </div>

              <div className="settings-list">
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Telemetry interval</strong>
                    <span>How often the application expects updated vehicle telemetry.</span>
                  </div>

                  <select
                    className="select-control settings-select"
                    value={preferences.telemetryInterval}
                    onChange={(event) => updatePreference("telemetryInterval", Number(event.target.value))}
                    disabled={!canEdit}
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>

                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Map refresh</strong>
                    <span>Controls how frequently the live map refreshes its displayed fleet state.</span>
                  </div>

                  <select
                    className="select-control settings-select"
                    value={preferences.mapRefresh}
                    onChange={(event) => updatePreference("mapRefresh", Number(event.target.value))}
                    disabled={!canEdit}
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>

                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Automatically follow selected vehicle</strong>
                    <span>Keep the live map centered on a selected vehicle while it is being tracked.</span>
                  </div>

                  <button
                    type="button"
                    className={`settings-toggle ${preferences.autoFollowVehicle ? "active" : ""}`}
                    onClick={() => updatePreference("autoFollowVehicle", !preferences.autoFollowVehicle)}
                    disabled={!canEdit}
                    aria-pressed={preferences.autoFollowVehicle}
                  >
                    <span />
                    <strong>{preferences.autoFollowVehicle ? "On" : "Off"}</strong>
                  </button>
                </div>

                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Vehicle labels</strong>
                    <span>Display fleet numbers directly on live vehicle markers.</span>
                  </div>

                  <button
                    type="button"
                    className={`settings-toggle ${preferences.vehicleLabels ? "active" : ""}`}
                    onClick={() => updatePreference("vehicleLabels", !preferences.vehicleLabels)}
                    disabled={!canEdit}
                    aria-pressed={preferences.vehicleLabels}
                  >
                    <span />
                    <strong>{preferences.vehicleLabels ? "On" : "Off"}</strong>
                  </button>
                </div>
              </div>
            </section>

            <section className="panel settings-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">FLEET VISIBILITY</span>
                  <h3>Vehicle status display</h3>
                </div>
              </div>

              <div className="settings-list">
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Show offline vehicles</strong>
                    <span>Keep vehicles without a current live connection visible in fleet views.</span>
                  </div>

                  <button
                    type="button"
                    className={`settings-toggle ${preferences.showOffline ? "active" : ""}`}
                    onClick={() => updatePreference("showOffline", !preferences.showOffline)}
                    disabled={!canEdit}
                    aria-pressed={preferences.showOffline}
                  >
                    <span />
                    <strong>{preferences.showOffline ? "On" : "Off"}</strong>
                  </button>
                </div>

                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Show stale telemetry</strong>
                    <span>Display vehicles whose latest telemetry is older than the normal update interval.</span>
                  </div>

                  <button
                    type="button"
                    className={`settings-toggle ${preferences.showStale ? "active" : ""}`}
                    onClick={() => updatePreference("showStale", !preferences.showStale)}
                    disabled={!canEdit}
                    aria-pressed={preferences.showStale}
                  >
                    <span />
                    <strong>{preferences.showStale ? "On" : "Off"}</strong>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </>
    );
  }

  function renderDashboard() {
    return (
      <div className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <div className="eyebrow">DASHBOARD CONFIGURATION</div>
            <h2>Dashboard display</h2>
            <p>Set how much recent operational information is shown on the dashboard.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">RECENT ACTIVITY</span>
                <h3>Activity feed</h3>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Activity entries</strong>
                  <span>Number of recent operational events shown on the dashboard.</span>
                </div>

                <select
                  className="select-control settings-select"
                  value={preferences.activityCount}
                  onChange={(event) => updatePreference("activityCount", Number(event.target.value))}
                  disabled={!canEdit}
                >
                  <option value={5}>5 entries</option>
                  <option value={8}>8 entries</option>
                  <option value={10}>10 entries</option>
                  <option value={15}>15 entries</option>
                  <option value={20}>20 entries</option>
                </select>
              </div>

              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Maintenance entries</strong>
                  <span>Number of maintenance records shown in the dashboard service section.</span>
                </div>

                <select
                  className="select-control settings-select"
                  value={preferences.maintenanceCount}
                  onChange={(event) => updatePreference("maintenanceCount", Number(event.target.value))}
                  disabled={!canEdit}
                >
                  <option value={5}>5 entries</option>
                  <option value={8}>8 entries</option>
                  <option value={10}>10 entries</option>
                  <option value={15}>15 entries</option>
                  <option value={20}>20 entries</option>
                </select>
              </div>
            </div>
          </section>

          <section className="panel settings-panel settings-info-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">CONFIGURATION</span>
                <h3>Current dashboard profile</h3>
              </div>
            </div>

            <div className="settings-summary">
              <div>
                <span>Activity feed</span>
                <strong>{preferences.activityCount} entries</strong>
              </div>
              <div>
                <span>Maintenance feed</span>
                <strong>{preferences.maintenanceCount} entries</strong>
              </div>
              <div>
                <span>Default section</span>
                <strong>{preferences.defaultSection}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderAlerts() {
    return (
      <div className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <div className="eyebrow">ALERT CONFIGURATION</div>
            <h2>Operational alerts</h2>
            <p>Control which fleet conditions produce visible warnings throughout the system.</p>
          </div>
        </div>

        <section className="panel settings-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">WARNING TYPES</span>
              <h3>Alert visibility</h3>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-row-copy">
                <strong>Maintenance warnings</strong>
                <span>Display warnings when vehicles have outstanding service requirements.</span>
              </div>

              <button
                type="button"
                className={`settings-toggle ${preferences.maintenanceWarnings ? "active" : ""}`}
                onClick={() => updatePreference("maintenanceWarnings", !preferences.maintenanceWarnings)}
                disabled={!canEdit}
                aria-pressed={preferences.maintenanceWarnings}
              >
                <span />
                <strong>{preferences.maintenanceWarnings ? "On" : "Off"}</strong>
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-copy">
                <strong>Inspection warnings</strong>
                <span>Display warnings for pending or failed vehicle inspections.</span>
              </div>

              <button
                type="button"
                className={`settings-toggle ${preferences.inspectionWarnings ? "active" : ""}`}
                onClick={() => updatePreference("inspectionWarnings", !preferences.inspectionWarnings)}
                disabled={!canEdit}
                aria-pressed={preferences.inspectionWarnings}
              >
                <span />
                <strong>{preferences.inspectionWarnings ? "On" : "Off"}</strong>
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-copy">
                <strong>Offline vehicle warnings</strong>
                <span>Display warnings when expected fleet telemetry is no longer being received.</span>
              </div>

              <button
                type="button"
                className={`settings-toggle ${preferences.offlineWarnings ? "active" : ""}`}
                onClick={() => updatePreference("offlineWarnings", !preferences.offlineWarnings)}
                disabled={!canEdit}
                aria-pressed={preferences.offlineWarnings}
              >
                <span />
                <strong>{preferences.offlineWarnings ? "On" : "Off"}</strong>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderInterface() {
    return (
      <div className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <div className="eyebrow">INTERFACE CONFIGURATION</div>
            <h2>System interface</h2>
            <p>Configure the layout density and the section opened when you enter the fleet system.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">DISPLAY</span>
                <h3>Interface density</h3>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Content density</strong>
                  <span>Adjust the amount of information shown within tables and operational panels.</span>
                </div>

                <select
                  className="select-control settings-select"
                  value={preferences.density}
                  onChange={(event) => updatePreference("density", event.target.value)}
                  disabled={!canEdit}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>
          </section>

          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">STARTUP</span>
                <h3>Default section</h3>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Open this section after sign-in</strong>
                  <span>The selected page becomes the initial destination when the system loads.</span>
                </div>

                <select
                  className="select-control settings-select"
                  value={preferences.defaultSection}
                  onChange={(event) => updatePreference("defaultSection", event.target.value)}
                  disabled={!canEdit}
                >
                  <option value="Dashboard">Dashboard</option>
                  <option value="Live Fleet">Live Fleet</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Drivers">Drivers</option>
                  <option value="Assignments">Assignments</option>
                  <option value="Routes">Routes</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Audits">Audits</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {canEdit && (
          <section className="panel settings-danger-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">LOCAL CONFIGURATION</span>
                <h3>Reset preferences</h3>
              </div>
            </div>

            <div className="settings-danger-content">
              <div>
                <strong>Restore default interface settings</strong>
                <span>This only resets your saved application preferences. Fleet records, assignments, routes, maintenance records, audits, and other database information are not changed.</span>
              </div>

              <button type="button" className="secondary-button" onClick={resetPreferences}>
                Reset preferences
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  function renderAccount() {
    return (
      <div className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <div className="eyebrow">ACCOUNT MANAGEMENT</div>
            <h2>Account</h2>
            <p>Review your account identity, access level, and authentication settings.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">IDENTITY</span>
                <h3>Current account</h3>
              </div>
            </div>

            <div className="account-settings-profile">
              <div className="account-avatar large">
                {accountEmail.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{accountName}</strong>
                <span>{accountEmail}</span>
                <small>{roleLabel}</small>
              </div>
            </div>

            <div className="settings-summary account-summary">
              <div>
                <span>Email</span>
                <strong>{accountEmail}</strong>
              </div>
              <div>
                <span>Access level</span>
                <strong>{roleLabel}</strong>
              </div>
              <div>
                <span>User ID</span>
                <strong>{session?.user?.id || "Unavailable"}</strong>
              </div>
            </div>
          </section>

          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">AUTHENTICATION</span>
                <h3>Change password</h3>
              </div>
            </div>

            <form className="settings-form" onSubmit={changePassword}>
              <label className="form-field">
                <span>New password</span>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  disabled={!canEdit || passwordBusy}
                />
              </label>

              <label className="form-field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  disabled={!canEdit || passwordBusy}
                />
              </label>

              {passwordError && <div className="error">{passwordError}</div>}
              {passwordMessage && <div className="success-message">{passwordMessage}</div>}

              {canEdit && (
                <div className="settings-form-actions">
                  <button type="submit" className="primary-button" disabled={passwordBusy}>
                    {passwordBusy ? "Updating..." : "Update password"}
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>

        <section className="panel settings-danger-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">SESSION</span>
              <h3>Sign out</h3>
            </div>
          </div>

          <div className="settings-danger-content">
            <div>
              <strong>End the current session</strong>
              <span>Sign out of the fleet operations system on this device.</span>
            </div>

            <button type="button" className="secondary-button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderSystem() {
    return (
      <div className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <div className="eyebrow">SYSTEM INFORMATION</div>
            <h2>System</h2>
            <p>Review the current application configuration and your permissions within the fleet system.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">APPLICATION</span>
                <h3>Fleet Tracker</h3>
              </div>

              <span className="status-badge status-active">Operational</span>
            </div>

            <div className="system-details">
              <div>
                <span>Application</span>
                <strong>Clino Fleet Tracker</strong>
              </div>
              <div>
                <span>Environment</span>
                <strong>Private Operations</strong>
              </div>
              <div>
                <span>Telemetry interval</span>
                <strong>{preferences.telemetryInterval} seconds</strong>
              </div>
              <div>
                <span>Map refresh</span>
                <strong>{preferences.mapRefresh} seconds</strong>
              </div>
              <div>
                <span>Interface density</span>
                <strong>{preferences.density}</strong>
              </div>
              <div>
                <span>Access level</span>
                <strong>{roleLabel}</strong>
              </div>
            </div>
          </section>

          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">ACCESS</span>
                <h3>Permissions</h3>
              </div>
            </div>

            <div className="permission-list">
              <div className="permission-row">
                <div>
                  <strong>View fleet data</strong>
                  <span>Vehicles, drivers, routes, assignments, maintenance, audits, and live telemetry.</span>
                </div>
                <span className="status-badge status-active">Allowed</span>
              </div>

              <div className="permission-row">
                <div>
                  <strong>Modify fleet records</strong>
                  <span>Create and update operational records when permitted by the assigned role.</span>
                </div>
                <span className={`status-badge ${canEdit ? "status-active" : "status-neutral"}`}>
                  {canEdit ? "Allowed" : "Read only"}
                </span>
              </div>

              <div className="permission-row">
                <div>
                  <strong>Account administration</strong>
                  <span>Administrative account and system-management functions.</span>
                </div>
                <span className={`status-badge ${role === "admin" ? "status-active" : "status-neutral"}`}>
                  {role === "admin" ? "Administrator" : "Restricted"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-intro settings-page-intro">
        <div className="page-intro-copy">
          <div className="eyebrow">SYSTEM CONFIGURATION</div>
          <h2>Settings</h2>
          <p>Configure fleet operations, interface behavior, alerts, and account preferences.</p>
        </div>

        <div className="page-intro-actions">
          {saveMessage && <span className="save-indicator">{saveMessage}</span>}
          <span className={`status-badge ${canEdit ? "status-active" : "status-neutral"}`}>
            {canEdit ? "Editing enabled" : "Read only"}
          </span>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="panel settings-sidebar">
          <div className="settings-sidebar-heading">
            <span className="panel-kicker">CONFIGURATION</span>
            <strong>System settings</strong>
          </div>

          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.label}
                type="button"
                className={`settings-nav-button ${activeSection === section.label ? "active" : ""}`}
                onClick={() => setActiveSection(section.label)}
              >
                <span>{section.label}</span>
                <small>{section.description}</small>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          {activeSection === "Operations" && renderOperations()}
          {activeSection === "Dashboard" && renderDashboard()}
          {activeSection === "Alerts" && renderAlerts()}
          {activeSection === "Interface" && renderInterface()}
          {activeSection === "Account" && renderAccount()}
          {activeSection === "System" && renderSystem()}
        </div>
      </div>
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

function Empty() {
  return <div className="empty">No records found.</div>;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

export default App;