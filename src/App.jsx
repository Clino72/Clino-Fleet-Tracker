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
              navigateTo={navigate}
              onViewVehicle={openVehicleDetails}
            />
          )}

          {page === "Vehicle Details" && (
            <VehicleDetails
              canEdit={canEdit}
              vehicleId={selectedVehicleId}
              navigateTo={navigate}
              onBack={returnToVehicles}
            />
          )}

          {page === "Drivers" && (
            <Drivers
              canEdit={canEdit}
              navigateTo={navigate}
              onViewDriver={openDriverDetails}
            />
          )}

          {page === "Driver Details" && (
            <DriverDetails
              canEdit={canEdit}
              driverId={selectedDriverId}
              navigateTo={navigate}
              onBack={returnToDrivers}
            />
          )}

          {page === "Assignments" && <Assignments canEdit={canEdit} />}

          {page === "Routes" && <Routes canEdit={canEdit} />}

          {page === "Route Editor" && <RouteEditor canEdit={canEdit} />}

          {page === "Route Preview" && <RoutePreview />}

          {page === "All Routes Preview" && <AllRoutesPreview />}

          {page === "Maintenance" && <Maintenance canEdit={canEdit} />}

          {page === "Audits" && <Audits canEdit={canEdit} />}

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
      items: ["Maintenance", "Audits"],
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
    Audits: "M7 3h10v18H7zM9 7h6M9 11h6M9 15h3",
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
            className="button button-secondary"
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

      <div className="panel live-fleet-toolbar">
        <div className="toolbar-heading">
          <div>
            <span className="eyebrow">FLEET FILTER</span>
            <strong>Vehicle activity</strong>
          </div>

          <span className="toolbar-result-count">
            {filteredFleet.length} of {fleet.length}
          </span>
        </div>

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

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="IN_SERVICE">In service</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="STALE">Stale telemetry</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
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

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  function robloxToMap(x, z) {
    const imageX = (ROBLOX_HALF_SIZE - Number(x)) * PIXELS_PER_STUD;
    const imageY = (ROBLOX_HALF_SIZE + Number(z)) * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const bounds = [[0, 0], [IMAGE_SIZE, IMAGE_SIZE]];

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 4,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
    });

    L.imageOverlay(`${import.meta.env.BASE_URL}map.png`, bounds).addTo(map);

    map.fitBounds(bounds);

    map.setMaxBounds([
      [-IMAGE_SIZE * 0.15, -IMAGE_SIZE * 0.15],
      [IMAGE_SIZE * 1.15, IMAGE_SIZE * 1.15],
    ]);

    mapInstanceRef.current = map;

    return () => {
      markerMapRef.current.forEach((marker) => marker.remove());
      markerMapRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
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

      activeFleetNumbers.add(fleetNumber);

      const position = robloxToMap(bus.x, bus.z);
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

function Vehicles({ canEdit, navigateTo }) {
  const [vehicles, setVehicles] = useState([]);
  const [liveVehicles, setLiveVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [garageFilter, setGarageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

    const [{ data: vehicleData, error: vehicleError }, { data: liveData, error: liveError }] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("fleet_live").select("*"),
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

      return String(a.fleet_number || "").localeCompare(String(b.fleet_number || ""), undefined, { numeric: true });
    });

    setVehicles(sortedVehicles);
    setLiveVehicles(liveData || []);
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

    return {
      ...vehicle,
      live,
      displayStatus: live?.effective_status || vehicle.status || "UNKNOWN",
    };
  });

  const garages = [...new Set(vehicleRows.map((vehicle) => vehicle.garage).filter(Boolean))].sort();

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
      vehicle.live?.driver_name,
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

  function openVehicle(vehicle) {
    navigateTo("Vehicle Details", {
      vehicleId: vehicle.id,
    });
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
          <button type="button" className="button button-secondary" onClick={() => loadVehicles(false)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh Fleet"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="stat-grid vehicle-stat-grid">
        <div className="stat-card">
          <span className="stat-card-label">Total Fleet</span>
          <strong>{totalCount}</strong>
          <span className="stat-card-meta">Registered vehicles</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Available</span>
          <strong>{availableCount}</strong>
          <span className="stat-card-meta">Ready for assignment</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Assigned</span>
          <strong>{assignedCount}</strong>
          <span className="stat-card-meta">Currently assigned</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">In Service</span>
          <strong>{inServiceCount}</strong>
          <span className="stat-card-meta">Currently operating</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Maintenance</span>
          <strong>{maintenanceCount}</strong>
          <span className="stat-card-meta">Unavailable for service</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Out of Service</span>
          <strong>{outOfServiceCount}</strong>
          <span className="stat-card-meta">Not operational</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Fleet Inventory</span>
            <h2>Vehicle Directory</h2>
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
              <select value={garageFilter} onChange={(event) => setGarageFilter(event.target.value)}>
                <option value="ALL">All garages</option>
                {garages.map((garage) => (
                  <option key={garage} value={garage}>
                    {garage}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-control">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {String(status).replaceAll("_", " ")}
                  </option>
                ))}
              </select>
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

                    <td>
                      {vehicle.live?.driver_name || "Unassigned"}
                    </td>

                    <td>
                      {vehicle.live?.route_name || "No active route"}
                    </td>

                    <td>
                      <span className={getStatusClass(vehicle.displayStatus)}>
                        {String(vehicle.displayStatus || "UNKNOWN").replaceAll("_", " ")}
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

function VehicleDetails({ canEdit, vehicleId, navigateTo }) {
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
            <button type="button" className="button button-secondary" onClick={() => navigateTo("Vehicles")}>
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
            <button type="button" className="breadcrumb-button" onClick={() => navigateTo("Vehicles")}>
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

function Drivers({ openDriverDetails }) {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
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
      setLoading(false);
      return;
    }

    const { data: liveData, error: liveError } = await supabase.from("fleet_live").select("driver_id,fleet_number,driver_name,route_name,last_ping,effective_status");

    if (liveError) {
      setError(liveError.message);
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
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const interval = window.setInterval(loadData, 15000);

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
          <button type="button" className="button button-secondary" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
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

      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <span className="stat-card-label">Total Drivers</span>
          <strong className="stat-card-value">{drivers.length}</strong>
          <span className="stat-card-meta">Personnel records</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Active</span>
          <strong className="stat-card-value">{activeCount}</strong>
          <span className="stat-card-meta">Currently transmitting</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Assigned</span>
          <strong className="stat-card-value">{assignedCount}</strong>
          <span className="stat-card-meta">Vehicle or route assignment</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Offline</span>
          <strong className="stat-card-value">{offlineCount}</strong>
          <span className="stat-card-meta">No active telemetry</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">DRIVER DIRECTORY</span>
            <h3>Personnel Records</h3>
          </div>

          <div className="panel-header-meta">
            <span>{filteredDrivers.length} shown</span>
          </div>
        </div>

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
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
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
                        <button type="button" className="button button-secondary button-small" onClick={() => openDriverDetails(driver.id)}>
                          View
                        </button>

                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() => deleteDriver(driver)}
                          disabled={deletingId === driver.id}
                        >
                          {deletingId === driver.id ? "Deleting..." : "Delete"}
                        </button>
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

function DriverDetails({ driverId, returnToDrivers }) {
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

function DriverDetails({ driverId, returnToDrivers }) {
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
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRoutes = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
  };

  useEffect(() => {
    loadRoutes();
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

  const resetForm = () => {
    setRouteCode("");
    setName("");
    setDescription("");
    setEditingDetails(null);
  };

  const createRoute = async (event) => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to create route.");
    } finally {
      setSaving(false);
    }
  };

  const openDetailsEditor = (route) => {
    setEditingDetails(route);
    setEditRouteCode(route.route_code || "");
    setName(route.name || "");
    setDescription(route.description || "");
    setError("");
  };

  const saveRouteDetails = async (event) => {
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
        updated_at: new Date().toISOString(),
      }).eq("id", editingDetails.id);

      if (updateError) {
        throw updateError;
      }

      setEditingDetails(null);
      resetForm();
      setMessage("Route details updated.");
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to update route.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateRoute = async (route) => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to duplicate route.");
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteRoute = (route) => {
    if (!canEdit) {
      return;
    }

    setDeleteTarget(route);
    setError("");
  };

  const deleteRoute = async () => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to delete route.");
    } finally {
      setSaving(false);
    }
  };

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
  const archivedCount = routes.filter((route) => route.status === "ARCHIVED").length;
  const totalPoints = routes.reduce((total, route) => total + (routePointCounts[route.id] || 0), 0);

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">Route Operations</span>
            <h1>Routes</h1>
            <p>Loading route registry...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Route Operations</span>
          <h1>Routes</h1>
          <p>Manage route definitions, geometry, status, and operational usage.</p>
        </div>

        <div className="page-intro-actions">
          <button type="button" className="button button-secondary" onClick={() => setAllRoutesOpen(true)}>
            View All Routes
          </button>

          {canEdit && (
            <button type="button" className="button button-primary" onClick={() => {
              resetForm();
              setShowForm(true);
              setError("");
            }}>
              New Route
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stats-grid">
        <Stat label="Total Routes" value={routes.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Inactive" value={inactiveCount} />
        <Stat label="Route Points" value={totalPoints} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Route Registry</h2>
            <p>{filteredRoutes.length} route{filteredRoutes.length === 1 ? "" : "s"} shown</p>
          </div>

          <button type="button" className="button button-secondary" onClick={() => loadRoutes(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="toolbar-controls">
          <label className="search-control">
            <span>Search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Route code, name, or description" />
          </label>

          <label className="select-control">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        </div>

        {filteredRoutes.length === 0 ? (
          <Empty title="No routes found" description="Try changing the search or status filter." />
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
                  <th>Actions</th>
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

                      <td>
                        <div className="table-actions">
                          <button type="button" className="button button-small button-secondary" onClick={() => setPreviewRoute(route)}>
                            Preview
                          </button>

                          {canEdit && (
                            <>
                              <button type="button" className="button button-small button-secondary" onClick={() => setEditingRoute(route)}>
                                Edit Route
                              </button>

                              <button type="button" className="button button-small button-secondary" onClick={() => openDetailsEditor(route)}>
                                Edit Details
                              </button>

                              <button type="button" className="button button-small button-secondary" onClick={() => duplicateRoute(route)} disabled={saving}>
                                Duplicate
                              </button>

                              <button type="button" className="button button-small button-danger" onClick={() => requestDeleteRoute(route)} disabled={saving}>
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
                <span className="eyebrow">Route Registry</span>
                <h2>New Route</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowForm(false)} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={createRoute}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input value={routeCode} onChange={(event) => setRouteCode(event.target.value)} placeholder="e.g. 101A" autoFocus />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. North Elementary" />
                  </label>
                </div>

                <label className="form-field">
                  <span>Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Describe the route and its service area." />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
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
                <span className="eyebrow">Route Registry</span>
                <h2>Edit Route Details</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => {
                setEditingDetails(null);
                resetForm();
              }} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={saveRouteDetails}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input value={editRouteCode} onChange={(event) => setEditRouteCode(event.target.value)} autoFocus />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => {
                  setEditingDetails(null);
                  resetForm();
                }} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
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
                <span className="eyebrow">Destructive Action</span>
                <h2>Delete Route</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDeleteTarget(null)} disabled={saving}>
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
              <button type="button" className="button button-secondary" onClick={() => setDeleteTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="button button-danger" onClick={deleteRoute} disabled={saving}>
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
            loadRoutes(true);
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

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const mapToRoblox = (lat, lng) => {
    const x = (IMAGE_SIZE / 2 - lng) / PIXELS_PER_STUD;
    const z = (IMAGE_SIZE / 2 - lat) / PIXELS_PER_STUD;

    return {
      x: Number(x.toFixed(3)),
      y: 0,
      z: Number(z.toFixed(3)),
    };
  };

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  const normalizePoints = (items) => {
    return items.map((point, index) => ({
      id: point.id || `local-${Date.now()}-${index}`,
      sequence: index + 1,
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      z: Number(point.z) || 0,
      point_type: point.point_type || "STRAIGHT",
    }));
  };

  const loadPoints = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        throw pointError;
      }

      const normalized = normalizePoints(data || []);
      setPoints(normalized);
      historyRef.current = [];

      if (normalized.length) {
        setSelectedIndex(0);
      } else {
        setSelectedIndex(null);
      }
    } catch (err) {
      setError(err.message || "Unable to load route points.");
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    const { data, error: routeError } = await supabase.from("routes").select("id,route_code,name").neq("id", route.id).order("name", { ascending: true });

    if (!routeError) {
      setRoutes(data || []);
    }
  };

  useEffect(() => {
    loadPoints();
    loadRoutes();
  }, [route.id]);

  const pushHistory = (currentPoints) => {
    historyRef.current = [...historyRef.current, structuredClone(currentPoints)].slice(-50);
  };

  const updatePoints = (mutator, selectIndex = null) => {
    setPoints((current) => {
      pushHistory(current);
      const next = normalizePoints(mutator(structuredClone(current)));

      return next;
    });

    if (selectIndex !== null) {
      setSelectedIndex(selectIndex);
    }
  };

  const undoPoint = () => {
    const previous = historyRef.current.pop();

    if (!previous) {
      return;
    }

    setPoints(previous);

    if (!previous.length) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex((current) => Math.min(current ?? 0, previous.length - 1));
    }
  };

  const addPoint = (latlng) => {
    const coords = mapToRoblox(latlng.lat, latlng.lng);

    setPoints((current) => {
      pushHistory(current);

      const newPoint = {
        id: `local-${Date.now()}`,
        sequence: current.length + 1,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        point_type: "STRAIGHT",
      };

      if (selectedIndex === null || selectedIndex === current.length - 1) {
        return normalizePoints([...current, newPoint]);
      }

      const next = [...current];
      next.splice(selectedIndex + 1, 0, newPoint);

      return normalizePoints(next);
    });

    setSelectedIndex((current) => current === null ? 0 : current + 1);
  };

  const updatePoint = (index, field, value) => {
    setPoints((current) => {
      pushHistory(current);

      const next = structuredClone(current);

      if (field === "x" || field === "y" || field === "z") {
        next[index][field] = Number(value) || 0;
      } else {
        next[index][field] = value;
      }

      return normalizePoints(next);
    });
  };

  const deletePoint = (index) => {
    setPoints((current) => {
      pushHistory(current);

      const next = current.filter((_, pointIndex) => pointIndex !== index);

      return normalizePoints(next);
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
  };

  const movePoint = (index, direction) => {
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
  };

  const copyPoint = () => {
    if (selectedIndex === null || !points[selectedIndex]) {
      return;
    }

    setClipboard({
      type: "POINT",
      points: [structuredClone(points[selectedIndex])],
    });

    setMessage("Point copied.");
  };

  const copyAll = () => {
    if (!points.length) {
      return;
    }

    setClipboard({
      type: "POINTS",
      points: structuredClone(points),
    });

    setMessage(`${points.length} points copied.`);
  };

  const pastePoints = () => {
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
  };

  const clearPoints = () => {
    if (!points.length) {
      return;
    }

    pushHistory(points);
    setPoints([]);
    setSelectedIndex(null);
  };

  const sendPointsToRoute = async () => {
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

      const copiedPoints = clipboard.points.map((point) => ({
        route_id: targetRouteId,
        sequence: (existingPoints?.length || 0) + 1,
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
  };

  const savePoints = async () => {
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
      setMessage("Route geometry saved.");

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(err.message || "Unable to save route geometry.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const markerLayer = L.layerGroup().addTo(map);

    map.on("click", (event) => {
      addPoint(event.latlng);
    });

    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

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
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(point.x, point.z);
      const selected = selectedIndex === index;

      const marker = L.marker(position, {
        draggable: true,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: "route-editor-marker-wrapper",
          html: `<div class="route-editor-marker${selected ? " is-selected" : ""}">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        setSelectedIndex(index);
      });

      marker.on("dragstart", () => {
        pushHistory(points);
      });

      marker.on("dragend", (event) => {
        const newPosition = event.target.getLatLng();
        const coords = mapToRoblox(newPosition.lat, newPosition.lng);

        setPoints((current) => {
          const next = structuredClone(current);

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

      marker.bindTooltip(`Point ${index + 1}`, {
        direction: "top",
        offset: [0, -12],
      });

      marker.addTo(markerLayer);
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

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal modal-large">
          <div className="modal-header">
            <div>
              <span className="eyebrow">Route Editor</span>
              <h2>{route.name}</h2>
            </div>
          </div>
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop route-editor-backdrop">
      <div className="modal modal-route-editor">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Editor</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>{points.length} route point{points.length === 1 ? "" : "s"}</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error route-editor-alert">{error}</div>}
        {message && <div className="alert alert-success route-editor-alert">{message}</div>}

        <div className="route-editor-layout">
          <div className="route-editor-map" ref={mapRef} />

          <aside className="route-editor-sidebar">
            <div className="route-editor-toolbar">
              <button type="button" className="button button-secondary" onClick={undoPoint} disabled={!historyRef.current.length}>
                Undo
              </button>

              <button type="button" className="button button-secondary" onClick={clearPoints} disabled={!points.length}>
                Clear
              </button>

              <button type="button" className="button button-secondary" onClick={copyAll} disabled={!points.length}>
                Copy All
              </button>

              <button type="button" className="button button-secondary" onClick={pastePoints} disabled={!clipboard?.points?.length}>
                Paste
              </button>
            </div>

            <div className="route-editor-help">
              <span>Map controls</span>
              <p>Click the map to add a point. Drag a marker to reposition it. Right-click a marker to delete it.</p>
            </div>

            <div className="route-editor-section">
              <div className="route-editor-section-header">
                <div>
                  <span className="eyebrow">Point List</span>
                  <h3>Route Geometry</h3>
                </div>
              </div>

              <div className="route-point-list">
                {points.length === 0 ? (
                  <div className="route-point-empty">
                    <strong>No route points</strong>
                    <span>Click anywhere on the map to create the first point.</span>
                  </div>
                ) : (
                  points.map((point, index) => (
                    <button type="button" key={point.id} className={`route-point-row${selectedIndex === index ? " is-selected" : ""}`} onClick={() => setSelectedIndex(index)}>
                      <span className="route-point-number">{index + 1}</span>
                      <span className="route-point-summary">
                        <strong>{point.point_type.replaceAll("_", " ")}</strong>
                        <small>
                          X {point.x.toFixed(1)} · Y {point.y.toFixed(1)} · Z {point.z.toFixed(1)}
                        </small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedPoint && (
              <div className="route-editor-section">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Selected Point</span>
                    <h3>Point {selectedIndex + 1}</h3>
                  </div>
                </div>

                <div className="form-grid form-grid-three">
                  <label className="form-field">
                    <span>X</span>
                    <input type="number" step="0.1" value={selectedPoint.x} onChange={(event) => updatePoint(selectedIndex, "x", event.target.value)} />
                  </label>

                  <label className="form-field">
                    <span>Y</span>
                    <input type="number" step="0.1" value={selectedPoint.y} onChange={(event) => updatePoint(selectedIndex, "y", event.target.value)} />
                  </label>

                  <label className="form-field">
                    <span>Z</span>
                    <input type="number" step="0.1" value={selectedPoint.z} onChange={(event) => updatePoint(selectedIndex, "z", event.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Point Type</span>
                  <select value={selectedPoint.point_type} onChange={(event) => updatePoint(selectedIndex, "point_type", event.target.value)}>
                    <option value="STRAIGHT">Straight</option>
                    <option value="TURN_LEFT">Turn Left</option>
                    <option value="TURN_RIGHT">Turn Right</option>
                    <option value="STOP_LEFT">Stop Left</option>
                    <option value="STOP_RIGHT">Stop Right</option>
                  </select>
                </label>

                <div className="route-editor-point-actions">
                  <button type="button" className="button button-secondary" onClick={() => movePoint(selectedIndex, "up")} disabled={selectedIndex === 0}>
                    Move Up
                  </button>

                  <button type="button" className="button button-secondary" onClick={() => movePoint(selectedIndex, "down")} disabled={selectedIndex === points.length - 1}>
                    Move Down
                  </button>

                  <button type="button" className="button button-secondary" onClick={copyPoint}>
                    Copy
                  </button>

                  <button type="button" className="button button-danger" onClick={() => deletePoint(selectedIndex)}>
                    Delete
                  </button>
                </div>
              </div>
            )}

            {clipboard?.points?.length > 0 && (
              <div className="route-editor-section">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Clipboard</span>
                    <h3>{clipboard.points.length} point{clipboard.points.length === 1 ? "" : "s"}</h3>
                  </div>
                </div>

                <label className="form-field">
                  <span>Send To Route</span>
                  <select value={targetRouteId} onChange={(event) => setTargetRouteId(event.target.value)}>
                    <option value="">Select route...</option>
                    {routes.map((targetRoute) => (
                      <option key={targetRoute.id} value={targetRoute.id}>
                        {targetRoute.route_code ? `${targetRoute.route_code} — ` : ""}{targetRoute.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="button" className="button button-secondary button-full" onClick={sendPointsToRoute} disabled={!targetRouteId || saving}>
                  Send Points
                </button>
              </div>
            )}
          </aside>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-info">
            {points.length > 0 ? `${points.length} point${points.length === 1 ? "" : "s"} ready to save.` : "Route currently has no points."}
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            <button type="button" className="button button-primary" onClick={savePoints} disabled={saving}>
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
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  useEffect(() => {
    const loadPoints = async () => {
      setLoading(true);
      setError("");

      const { data, error: pointError } = await supabase.from("route_points").select("id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        setError(pointError.message || "Unable to load route preview.");
      } else {
        setPoints(data || []);
      }

      setLoading(false);
    };

    loadPoints();
  }, [route.id]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const layer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = layer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
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
        weight: 5,
        opacity: 0.9,
      }).addTo(layer);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(Number(point.x) || 0, Number(point.z) || 0);
      const selected = selectedIndex === index;

      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "route-preview-marker-wrapper",
          html: `<div class="route-preview-marker${selected ? " is-selected" : ""}">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", () => {
        setSelectedIndex(index);
      });

      marker.bindTooltip(`Point ${index + 1}`, {
        direction: "top",
        offset: [0, -12],
      });

      marker.addTo(layer);
    });

    if (latLngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [40, 40],
      });
    }
  }, [points, selectedIndex]);

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <div className="modal-backdrop">
      <div className="modal modal-large modal-route-preview">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Preview</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>{route.description || "No route description provided."}</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        ) : (
          <div className="route-preview-layout">
            <div className="route-preview-map" ref={mapRef} />

            <aside className="route-preview-sidebar">
              <div className="route-preview-summary">
                <div>
                  <span>Points</span>
                  <strong>{points.length}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <StatusBadge status={route.status} />
                </div>
              </div>

              {selectedPoint && (
                <div className="route-preview-selected">
                  <span className="eyebrow">Selected Point</span>
                  <h3>Point {selectedIndex + 1}</h3>

                  <div className="detail-grid">
                    <Detail label="Type" value={selectedPoint.point_type?.replaceAll("_", " ") || "STRAIGHT"} />
                    <Detail label="X" value={Number(selectedPoint.x || 0).toFixed(1)} />
                    <Detail label="Y" value={Number(selectedPoint.y || 0).toFixed(1)} />
                    <Detail label="Z" value={Number(selectedPoint.z || 0).toFixed(1)} />
                  </div>
                </div>
              )}

              <div className="route-preview-point-list">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Geometry</span>
                    <h3>Route Points</h3>
                  </div>
                </div>

                {points.length === 0 ? (
                  <div className="route-point-empty">
                    <strong>No route points</strong>
                    <span>This route does not currently contain geometry.</span>
                  </div>
                ) : (
                  points.map((point, index) => (
                    <button type="button" key={point.id || index} className={`route-preview-point-row${selectedIndex === index ? " is-selected" : ""}`} onClick={() => setSelectedIndex(index)}>
                      <span className="route-point-number">{index + 1}</span>
                      <span className="route-point-summary">
                        <strong>{point.point_type?.replaceAll("_", " ") || "STRAIGHT"}</strong>
                        <small>
                          X {Number(point.x || 0).toFixed(1)} · Y {Number(point.y || 0).toFixed(1)} · Z {Number(point.z || 0).toFixed(1)}
                        </small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

        <div className="modal-footer">
          <div className="modal-footer-info">
            {points.length} route point{points.length === 1 ? "" : "s"}
          </div>

          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AllRoutesPreview({ routes, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const [routePoints, setRoutePoints] = useState({});
  const [visibleRoutes, setVisibleRoutes] = useState(() => new Set(routes.map((route) => route.id)));
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const routeStyles = [
    {
      color: "#f5a500",
      dashArray: null,
    },
    {
      color: "#5b8def",
      dashArray: "10 8",
    },
    {
      color: "#51b36a",
      dashArray: "3 7",
    },
    {
      color: "#d46b9b",
      dashArray: "14 7 3 7",
    },
    {
      color: "#8b72c7",
      dashArray: "7 5",
    },
    {
      color: "#e07b39",
      dashArray: "18 6",
    },
  ];

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  useEffect(() => {
    const loadPoints = async () => {
      setLoading(true);
      setError("");

      const routeIds = routes.map((route) => route.id);

      if (!routeIds.length) {
        setRoutePoints({});
        setLoading(false);
        return;
      }

      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").in("route_id", routeIds).order("sequence", { ascending: true });

      if (pointError) {
        setError(pointError.message || "Unable to load route geometry.");
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
    };

    loadPoints();
  }, [routes]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const layer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = layer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();

    routes.forEach((route, routeIndex) => {
      if (!visibleRoutes.has(route.id)) {
        return;
      }

      const points = routePoints[route.id] || [];

      if (points.length < 2) {
        return;
      }

      const style = routeStyles[routeIndex % routeStyles.length];
      const selected = selectedRouteId === route.id;

      const latLngs = points.map((point) => robloxToMap(Number(point.x) || 0, Number(point.z) || 0));

      const line = L.polyline(latLngs, {
        color: style.color,
        weight: selected ? 7 : 4,
        opacity: selected ? 1 : 0.78,
        dashArray: style.dashArray,
      });

      line.on("click", () => {
        setSelectedRouteId(route.id);
      });

      line.bindTooltip(route.route_code ? `${route.route_code} — ${route.name}` : route.name);

      line.addTo(layer);
    });
  }, [routes, routePoints, visibleRoutes, selectedRouteId]);

  const toggleRoute = (routeId) => {
    setVisibleRoutes((current) => {
      const next = new Set(current);

      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }

      return next;
    });
  };

  const showAll = () => {
    setVisibleRoutes(new Set(routes.map((route) => route.id)));
  };

  const hideAll = () => {
    setVisibleRoutes(new Set());
  };

  const selectedRoute = routes.find((route) => route.id === selectedRouteId);

  return (
    <div className="modal-backdrop">
      <div className="modal modal-large modal-all-routes">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Network</span>
            <h2>All Routes</h2>
            <p>View route geometry across the entire route network.</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        ) : (
          <div className="all-routes-layout">
            <div className="all-routes-map" ref={mapRef} />

            <aside className="all-routes-sidebar">
              <div className="all-routes-controls">
                <button type="button" className="button button-secondary" onClick={showAll}>
                  Show All
                </button>

                <button type="button" className="button button-secondary" onClick={hideAll}>
                  Hide All
                </button>
              </div>

              {selectedRoute && (
                <div className="all-routes-selected">
                  <span className="eyebrow">Selected Route</span>
                  <h3>{selectedRoute.route_code ? `${selectedRoute.route_code} — ${selectedRoute.name}` : selectedRoute.name}</h3>
                  <p>{selectedRoute.description || "No description provided."}</p>

                  <div className="detail-grid">
                    <Detail label="Status" value={selectedRoute.status} />
                    <Detail label="Points" value={(routePoints[selectedRoute.id] || []).length} />
                  </div>
                </div>
              )}

              <div className="all-routes-list">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Network</span>
                    <h3>Routes</h3>
                  </div>

                  <span className="all-routes-count">
                    {visibleRoutes.size}/{routes.length}
                  </span>
                </div>

                {routes.map((route, index) => {
                  const style = routeStyles[index % routeStyles.length];
                  const visible = visibleRoutes.has(route.id);
                  const points = routePoints[route.id] || [];

                  return (
                    <button type="button" key={route.id} className={`all-routes-row${visible ? " is-visible" : ""}${selectedRouteId === route.id ? " is-selected" : ""}`} onClick={() => {
                      toggleRoute(route.id);
                      setSelectedRouteId(route.id);
                    }}>
                      <span className="all-routes-swatch" style={{ backgroundColor: style.color }} />
                      <span className="all-routes-route-copy">
                        <strong>{route.route_code || route.name}</strong>
                        <small>{route.route_code ? route.name : `${points.length} points`}</small>
                      </span>
                      <span className="all-routes-route-count">{points.length}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        <div className="modal-footer">
          <div className="modal-footer-info">
            {visibleRoutes.size} of {routes.length} routes visible
          </div>

          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
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
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRoutes = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
  };

  useEffect(() => {
    loadRoutes();
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

  const resetForm = () => {
    setRouteCode("");
    setName("");
    setDescription("");
    setEditingDetails(null);
  };

  const createRoute = async (event) => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to create route.");
    } finally {
      setSaving(false);
    }
  };

  const openDetailsEditor = (route) => {
    setEditingDetails(route);
    setEditRouteCode(route.route_code || "");
    setName(route.name || "");
    setDescription(route.description || "");
    setError("");
  };

  const saveRouteDetails = async (event) => {
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
        updated_at: new Date().toISOString(),
      }).eq("id", editingDetails.id);

      if (updateError) {
        throw updateError;
      }

      setEditingDetails(null);
      resetForm();
      setMessage("Route details updated.");
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to update route.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateRoute = async (route) => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to duplicate route.");
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteRoute = (route) => {
    if (!canEdit) {
      return;
    }

    setDeleteTarget(route);
    setError("");
  };

  const deleteRoute = async () => {
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
      await loadRoutes(true);
    } catch (err) {
      setError(err.message || "Unable to delete route.");
    } finally {
      setSaving(false);
    }
  };

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
  const archivedCount = routes.filter((route) => route.status === "ARCHIVED").length;
  const totalPoints = routes.reduce((total, route) => total + (routePointCounts[route.id] || 0), 0);

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">Route Operations</span>
            <h1>Routes</h1>
            <p>Loading route registry...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Route Operations</span>
          <h1>Routes</h1>
          <p>Manage route definitions, geometry, status, and operational usage.</p>
        </div>

        <div className="page-intro-actions">
          <button type="button" className="button button-secondary" onClick={() => setAllRoutesOpen(true)}>
            View All Routes
          </button>

          {canEdit && (
            <button type="button" className="button button-primary" onClick={() => {
              resetForm();
              setShowForm(true);
              setError("");
            }}>
              New Route
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stats-grid">
        <Stat label="Total Routes" value={routes.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Inactive" value={inactiveCount} />
        <Stat label="Route Points" value={totalPoints} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Route Registry</h2>
            <p>{filteredRoutes.length} route{filteredRoutes.length === 1 ? "" : "s"} shown</p>
          </div>

          <button type="button" className="button button-secondary" onClick={() => loadRoutes(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="toolbar-controls">
          <label className="search-control">
            <span>Search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Route code, name, or description" />
          </label>

          <label className="select-control">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        </div>

        {filteredRoutes.length === 0 ? (
          <Empty title="No routes found" description="Try changing the search or status filter." />
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
                  <th>Actions</th>
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

                      <td>
                        <div className="table-actions">
                          <button type="button" className="button button-small button-secondary" onClick={() => setPreviewRoute(route)}>
                            Preview
                          </button>

                          {canEdit && (
                            <>
                              <button type="button" className="button button-small button-secondary" onClick={() => setEditingRoute(route)}>
                                Edit Route
                              </button>

                              <button type="button" className="button button-small button-secondary" onClick={() => openDetailsEditor(route)}>
                                Edit Details
                              </button>

                              <button type="button" className="button button-small button-secondary" onClick={() => duplicateRoute(route)} disabled={saving}>
                                Duplicate
                              </button>

                              <button type="button" className="button button-small button-danger" onClick={() => requestDeleteRoute(route)} disabled={saving}>
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
                <span className="eyebrow">Route Registry</span>
                <h2>New Route</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowForm(false)} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={createRoute}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input value={routeCode} onChange={(event) => setRouteCode(event.target.value)} placeholder="e.g. 101A" autoFocus />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. North Elementary" />
                  </label>
                </div>

                <label className="form-field">
                  <span>Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Describe the route and its service area." />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
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
                <span className="eyebrow">Route Registry</span>
                <h2>Edit Route Details</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => {
                setEditingDetails(null);
                resetForm();
              }} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={saveRouteDetails}>
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Route Code</span>
                    <input value={editRouteCode} onChange={(event) => setEditRouteCode(event.target.value)} autoFocus />
                  </label>

                  <label className="form-field">
                    <span>Route Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => {
                  setEditingDetails(null);
                  resetForm();
                }} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
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
                <span className="eyebrow">Destructive Action</span>
                <h2>Delete Route</h2>
              </div>

              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDeleteTarget(null)} disabled={saving}>
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
              <button type="button" className="button button-secondary" onClick={() => setDeleteTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="button button-danger" onClick={deleteRoute} disabled={saving}>
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
            loadRoutes(true);
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

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const mapToRoblox = (lat, lng) => {
    const x = (IMAGE_SIZE / 2 - lng) / PIXELS_PER_STUD;
    const z = (IMAGE_SIZE / 2 - lat) / PIXELS_PER_STUD;

    return {
      x: Number(x.toFixed(3)),
      y: 0,
      z: Number(z.toFixed(3)),
    };
  };

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  const normalizePoints = (items) => {
    return items.map((point, index) => ({
      id: point.id || `local-${Date.now()}-${index}`,
      sequence: index + 1,
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      z: Number(point.z) || 0,
      point_type: point.point_type || "STRAIGHT",
    }));
  };

  const loadPoints = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        throw pointError;
      }

      const normalized = normalizePoints(data || []);
      setPoints(normalized);
      historyRef.current = [];

      if (normalized.length) {
        setSelectedIndex(0);
      } else {
        setSelectedIndex(null);
      }
    } catch (err) {
      setError(err.message || "Unable to load route points.");
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    const { data, error: routeError } = await supabase.from("routes").select("id,route_code,name").neq("id", route.id).order("name", { ascending: true });

    if (!routeError) {
      setRoutes(data || []);
    }
  };

  useEffect(() => {
    loadPoints();
    loadRoutes();
  }, [route.id]);

  const pushHistory = (currentPoints) => {
    historyRef.current = [...historyRef.current, structuredClone(currentPoints)].slice(-50);
  };

  const updatePoints = (mutator, selectIndex = null) => {
    setPoints((current) => {
      pushHistory(current);
      const next = normalizePoints(mutator(structuredClone(current)));

      return next;
    });

    if (selectIndex !== null) {
      setSelectedIndex(selectIndex);
    }
  };

  const undoPoint = () => {
    const previous = historyRef.current.pop();

    if (!previous) {
      return;
    }

    setPoints(previous);

    if (!previous.length) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex((current) => Math.min(current ?? 0, previous.length - 1));
    }
  };

  const addPoint = (latlng) => {
    const coords = mapToRoblox(latlng.lat, latlng.lng);

    setPoints((current) => {
      pushHistory(current);

      const newPoint = {
        id: `local-${Date.now()}`,
        sequence: current.length + 1,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        point_type: "STRAIGHT",
      };

      if (selectedIndex === null || selectedIndex === current.length - 1) {
        return normalizePoints([...current, newPoint]);
      }

      const next = [...current];
      next.splice(selectedIndex + 1, 0, newPoint);

      return normalizePoints(next);
    });

    setSelectedIndex((current) => current === null ? 0 : current + 1);
  };

  const updatePoint = (index, field, value) => {
    setPoints((current) => {
      pushHistory(current);

      const next = structuredClone(current);

      if (field === "x" || field === "y" || field === "z") {
        next[index][field] = Number(value) || 0;
      } else {
        next[index][field] = value;
      }

      return normalizePoints(next);
    });
  };

  const deletePoint = (index) => {
    setPoints((current) => {
      pushHistory(current);

      const next = current.filter((_, pointIndex) => pointIndex !== index);

      return normalizePoints(next);
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
  };

  const movePoint = (index, direction) => {
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
  };

  const copyPoint = () => {
    if (selectedIndex === null || !points[selectedIndex]) {
      return;
    }

    setClipboard({
      type: "POINT",
      points: [structuredClone(points[selectedIndex])],
    });

    setMessage("Point copied.");
  };

  const copyAll = () => {
    if (!points.length) {
      return;
    }

    setClipboard({
      type: "POINTS",
      points: structuredClone(points),
    });

    setMessage(`${points.length} points copied.`);
  };

  const pastePoints = () => {
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
  };

  const clearPoints = () => {
    if (!points.length) {
      return;
    }

    pushHistory(points);
    setPoints([]);
    setSelectedIndex(null);
  };

  const sendPointsToRoute = async () => {
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

      const copiedPoints = clipboard.points.map((point) => ({
        route_id: targetRouteId,
        sequence: (existingPoints?.length || 0) + 1,
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
  };

  const savePoints = async () => {
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
      setMessage("Route geometry saved.");

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(err.message || "Unable to save route geometry.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const markerLayer = L.layerGroup().addTo(map);

    map.on("click", (event) => {
      addPoint(event.latlng);
    });

    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

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
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(point.x, point.z);
      const selected = selectedIndex === index;

      const marker = L.marker(position, {
        draggable: true,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: "route-editor-marker-wrapper",
          html: `<div class="route-editor-marker${selected ? " is-selected" : ""}">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        setSelectedIndex(index);
      });

      marker.on("dragstart", () => {
        pushHistory(points);
      });

      marker.on("dragend", (event) => {
        const newPosition = event.target.getLatLng();
        const coords = mapToRoblox(newPosition.lat, newPosition.lng);

        setPoints((current) => {
          const next = structuredClone(current);

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

      marker.bindTooltip(`Point ${index + 1}`, {
        direction: "top",
        offset: [0, -12],
      });

      marker.addTo(markerLayer);
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

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal modal-large">
          <div className="modal-header">
            <div>
              <span className="eyebrow">Route Editor</span>
              <h2>{route.name}</h2>
            </div>
          </div>
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop route-editor-backdrop">
      <div className="modal modal-route-editor">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Editor</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>{points.length} route point{points.length === 1 ? "" : "s"}</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error route-editor-alert">{error}</div>}
        {message && <div className="alert alert-success route-editor-alert">{message}</div>}

        <div className="route-editor-layout">
          <div className="route-editor-map" ref={mapRef} />

          <aside className="route-editor-sidebar">
            <div className="route-editor-toolbar">
              <button type="button" className="button button-secondary" onClick={undoPoint} disabled={!historyRef.current.length}>
                Undo
              </button>

              <button type="button" className="button button-secondary" onClick={clearPoints} disabled={!points.length}>
                Clear
              </button>

              <button type="button" className="button button-secondary" onClick={copyAll} disabled={!points.length}>
                Copy All
              </button>

              <button type="button" className="button button-secondary" onClick={pastePoints} disabled={!clipboard?.points?.length}>
                Paste
              </button>
            </div>

            <div className="route-editor-help">
              <span>Map controls</span>
              <p>Click the map to add a point. Drag a marker to reposition it. Right-click a marker to delete it.</p>
            </div>

            <div className="route-editor-section">
              <div className="route-editor-section-header">
                <div>
                  <span className="eyebrow">Point List</span>
                  <h3>Route Geometry</h3>
                </div>
              </div>

              <div className="route-point-list">
                {points.length === 0 ? (
                  <div className="route-point-empty">
                    <strong>No route points</strong>
                    <span>Click anywhere on the map to create the first point.</span>
                  </div>
                ) : (
                  points.map((point, index) => (
                    <button type="button" key={point.id} className={`route-point-row${selectedIndex === index ? " is-selected" : ""}`} onClick={() => setSelectedIndex(index)}>
                      <span className="route-point-number">{index + 1}</span>
                      <span className="route-point-summary">
                        <strong>{point.point_type.replaceAll("_", " ")}</strong>
                        <small>
                          X {point.x.toFixed(1)} · Y {point.y.toFixed(1)} · Z {point.z.toFixed(1)}
                        </small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedPoint && (
              <div className="route-editor-section">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Selected Point</span>
                    <h3>Point {selectedIndex + 1}</h3>
                  </div>
                </div>

                <div className="form-grid form-grid-three">
                  <label className="form-field">
                    <span>X</span>
                    <input type="number" step="0.1" value={selectedPoint.x} onChange={(event) => updatePoint(selectedIndex, "x", event.target.value)} />
                  </label>

                  <label className="form-field">
                    <span>Y</span>
                    <input type="number" step="0.1" value={selectedPoint.y} onChange={(event) => updatePoint(selectedIndex, "y", event.target.value)} />
                  </label>

                  <label className="form-field">
                    <span>Z</span>
                    <input type="number" step="0.1" value={selectedPoint.z} onChange={(event) => updatePoint(selectedIndex, "z", event.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Point Type</span>
                  <select value={selectedPoint.point_type} onChange={(event) => updatePoint(selectedIndex, "point_type", event.target.value)}>
                    <option value="STRAIGHT">Straight</option>
                    <option value="TURN_LEFT">Turn Left</option>
                    <option value="TURN_RIGHT">Turn Right</option>
                    <option value="STOP_LEFT">Stop Left</option>
                    <option value="STOP_RIGHT">Stop Right</option>
                  </select>
                </label>

                <div className="route-editor-point-actions">
                  <button type="button" className="button button-secondary" onClick={() => movePoint(selectedIndex, "up")} disabled={selectedIndex === 0}>
                    Move Up
                  </button>

                  <button type="button" className="button button-secondary" onClick={() => movePoint(selectedIndex, "down")} disabled={selectedIndex === points.length - 1}>
                    Move Down
                  </button>

                  <button type="button" className="button button-secondary" onClick={copyPoint}>
                    Copy
                  </button>

                  <button type="button" className="button button-danger" onClick={() => deletePoint(selectedIndex)}>
                    Delete
                  </button>
                </div>
              </div>
            )}

            {clipboard?.points?.length > 0 && (
              <div className="route-editor-section">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Clipboard</span>
                    <h3>{clipboard.points.length} point{clipboard.points.length === 1 ? "" : "s"}</h3>
                  </div>
                </div>

                <label className="form-field">
                  <span>Send To Route</span>
                  <select value={targetRouteId} onChange={(event) => setTargetRouteId(event.target.value)}>
                    <option value="">Select route...</option>
                    {routes.map((targetRoute) => (
                      <option key={targetRoute.id} value={targetRoute.id}>
                        {targetRoute.route_code ? `${targetRoute.route_code} — ` : ""}{targetRoute.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="button" className="button button-secondary button-full" onClick={sendPointsToRoute} disabled={!targetRouteId || saving}>
                  Send Points
                </button>
              </div>
            )}
          </aside>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-info">
            {points.length > 0 ? `${points.length} point${points.length === 1 ? "" : "s"} ready to save.` : "Route currently has no points."}
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            <button type="button" className="button button-primary" onClick={savePoints} disabled={saving}>
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
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  useEffect(() => {
    const loadPoints = async () => {
      setLoading(true);
      setError("");

      const { data, error: pointError } = await supabase.from("route_points").select("id,sequence,x,y,z,point_type").eq("route_id", route.id).order("sequence", { ascending: true });

      if (pointError) {
        setError(pointError.message || "Unable to load route preview.");
      } else {
        setPoints(data || []);
      }

      setLoading(false);
    };

    loadPoints();
  }, [route.id]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const layer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = layer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
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
        weight: 5,
        opacity: 0.9,
      }).addTo(layer);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(Number(point.x) || 0, Number(point.z) || 0);
      const selected = selectedIndex === index;

      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "route-preview-marker-wrapper",
          html: `<div class="route-preview-marker${selected ? " is-selected" : ""}">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.on("click", () => {
        setSelectedIndex(index);
      });

      marker.bindTooltip(`Point ${index + 1}`, {
        direction: "top",
        offset: [0, -12],
      });

      marker.addTo(layer);
    });

    if (latLngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [40, 40],
      });
    }
  }, [points, selectedIndex]);

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <div className="modal-backdrop">
      <div className="modal modal-large modal-route-preview">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Preview</span>
            <h2>{route.route_code ? `${route.route_code} — ${route.name}` : route.name}</h2>
            <p>{route.description || "No route description provided."}</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        ) : (
          <div className="route-preview-layout">
            <div className="route-preview-map" ref={mapRef} />

            <aside className="route-preview-sidebar">
              <div className="route-preview-summary">
                <div>
                  <span>Points</span>
                  <strong>{points.length}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <StatusBadge status={route.status} />
                </div>
              </div>

              {selectedPoint && (
                <div className="route-preview-selected">
                  <span className="eyebrow">Selected Point</span>
                  <h3>Point {selectedIndex + 1}</h3>

                  <div className="detail-grid">
                    <Detail label="Type" value={selectedPoint.point_type?.replaceAll("_", " ") || "STRAIGHT"} />
                    <Detail label="X" value={Number(selectedPoint.x || 0).toFixed(1)} />
                    <Detail label="Y" value={Number(selectedPoint.y || 0).toFixed(1)} />
                    <Detail label="Z" value={Number(selectedPoint.z || 0).toFixed(1)} />
                  </div>
                </div>
              )}

              <div className="route-preview-point-list">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Geometry</span>
                    <h3>Route Points</h3>
                  </div>
                </div>

                {points.length === 0 ? (
                  <div className="route-point-empty">
                    <strong>No route points</strong>
                    <span>This route does not currently contain geometry.</span>
                  </div>
                ) : (
                  points.map((point, index) => (
                    <button type="button" key={point.id || index} className={`route-preview-point-row${selectedIndex === index ? " is-selected" : ""}`} onClick={() => setSelectedIndex(index)}>
                      <span className="route-point-number">{index + 1}</span>
                      <span className="route-point-summary">
                        <strong>{point.point_type?.replaceAll("_", " ") || "STRAIGHT"}</strong>
                        <small>
                          X {Number(point.x || 0).toFixed(1)} · Y {Number(point.y || 0).toFixed(1)} · Z {Number(point.z || 0).toFixed(1)}
                        </small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

        <div className="modal-footer">
          <div className="modal-footer-info">
            {points.length} route point{points.length === 1 ? "" : "s"}
          </div>

          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


function AllRoutesPreview({ routes, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const [routePoints, setRoutePoints] = useState({});
  const [visibleRoutes, setVisibleRoutes] = useState(() => new Set(routes.map((route) => route.id)));
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const IMAGE_SIZE = 1055;
  const ROBLOX_SIZE = 6144;
  const PIXELS_PER_STUD = IMAGE_SIZE / ROBLOX_SIZE;

  const routeStyles = [
    {
      color: "#f5a500",
      dashArray: null,
    },
    {
      color: "#5b8def",
      dashArray: "10 8",
    },
    {
      color: "#51b36a",
      dashArray: "3 7",
    },
    {
      color: "#d46b9b",
      dashArray: "14 7 3 7",
    },
    {
      color: "#8b72c7",
      dashArray: "7 5",
    },
    {
      color: "#e07b39",
      dashArray: "18 6",
    },
  ];

  const robloxToMap = (x, z) => {
    const imageX = IMAGE_SIZE / 2 - x * PIXELS_PER_STUD;
    const imageY = IMAGE_SIZE / 2 - z * PIXELS_PER_STUD;

    return [imageY, imageX];
  };

  useEffect(() => {
    const loadPoints = async () => {
      setLoading(true);
      setError("");

      const routeIds = routes.map((route) => route.id);

      if (!routeIds.length) {
        setRoutePoints({});
        setLoading(false);
        return;
      }

      const { data, error: pointError } = await supabase.from("route_points").select("id,route_id,sequence,x,y,z,point_type").in("route_id", routeIds).order("sequence", { ascending: true });

      if (pointError) {
        setError(pointError.message || "Unable to load route geometry.");
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
    };

    loadPoints();
  }, [routes]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
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

    L.imageOverlay("/map.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const layer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = layer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();

    routes.forEach((route, routeIndex) => {
      if (!visibleRoutes.has(route.id)) {
        return;
      }

      const points = routePoints[route.id] || [];

      if (points.length < 2) {
        return;
      }

      const style = routeStyles[routeIndex % routeStyles.length];
      const selected = selectedRouteId === route.id;

      const latLngs = points.map((point) => robloxToMap(Number(point.x) || 0, Number(point.z) || 0));

      const line = L.polyline(latLngs, {
        color: style.color,
        weight: selected ? 7 : 4,
        opacity: selected ? 1 : 0.78,
        dashArray: style.dashArray,
      });

      line.on("click", () => {
        setSelectedRouteId(route.id);
      });

      line.bindTooltip(route.route_code ? `${route.route_code} — ${route.name}` : route.name);

      line.addTo(layer);
    });
  }, [routes, routePoints, visibleRoutes, selectedRouteId]);

  const toggleRoute = (routeId) => {
    setVisibleRoutes((current) => {
      const next = new Set(current);

      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }

      return next;
    });
  };

  const showAll = () => {
    setVisibleRoutes(new Set(routes.map((route) => route.id)));
  };

  const hideAll = () => {
    setVisibleRoutes(new Set());
  };

  const selectedRoute = routes.find((route) => route.id === selectedRouteId);

  return (
    <div className="modal-backdrop">
      <div className="modal modal-large modal-all-routes">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Route Network</span>
            <h2>All Routes</h2>
            <p>View route geometry across the entire route network.</p>
          </div>

          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="modal-body">
            <p>Loading route geometry...</p>
          </div>
        ) : (
          <div className="all-routes-layout">
            <div className="all-routes-map" ref={mapRef} />

            <aside className="all-routes-sidebar">
              <div className="all-routes-controls">
                <button type="button" className="button button-secondary" onClick={showAll}>
                  Show All
                </button>

                <button type="button" className="button button-secondary" onClick={hideAll}>
                  Hide All
                </button>
              </div>

              {selectedRoute && (
                <div className="all-routes-selected">
                  <span className="eyebrow">Selected Route</span>
                  <h3>{selectedRoute.route_code ? `${selectedRoute.route_code} — ${selectedRoute.name}` : selectedRoute.name}</h3>
                  <p>{selectedRoute.description || "No description provided."}</p>

                  <div className="detail-grid">
                    <Detail label="Status" value={selectedRoute.status} />
                    <Detail label="Points" value={(routePoints[selectedRoute.id] || []).length} />
                  </div>
                </div>
              )}

              <div className="all-routes-list">
                <div className="route-editor-section-header">
                  <div>
                    <span className="eyebrow">Network</span>
                    <h3>Routes</h3>
                  </div>

                  <span className="all-routes-count">
                    {visibleRoutes.size}/{routes.length}
                  </span>
                </div>

                {routes.map((route, index) => {
                  const style = routeStyles[index % routeStyles.length];
                  const visible = visibleRoutes.has(route.id);
                  const points = routePoints[route.id] || [];

                  return (
                    <button type="button" key={route.id} className={`all-routes-row${visible ? " is-visible" : ""}${selectedRouteId === route.id ? " is-selected" : ""}`} onClick={() => {
                      toggleRoute(route.id);
                      setSelectedRouteId(route.id);
                    }}>
                      <span className="all-routes-swatch" style={{ backgroundColor: style.color }} />
                      <span className="all-routes-route-copy">
                        <strong>{route.route_code || route.name}</strong>
                        <small>{route.route_code ? route.name : `${points.length} points`}</small>
                      </span>
                      <span className="all-routes-route-count">{points.length}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        <div className="modal-footer">
          <div className="modal-footer-info">
            {visibleRoutes.size} of {routes.length} routes visible
          </div>

          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
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
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [garageFilter, setGarageFilter] = useState("ALL");
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

  const garages = [...new Set(vehicles.map((vehicle) => vehicle.garage).filter(Boolean))].sort();

  const filteredQueue = activeQueue.filter((record) => {
    const vehicle = getVehicle(record.vehicle_id);
    const status = getRecordStatus(record);
    const query = search.trim().toLowerCase();

    const searchValues = [
      record.maintenance_type,
      record.description,
      record.performed_by,
      vehicle?.fleet_number,
      vehicle?.make,
      vehicle?.model,
    ].filter(Boolean);

    const matchesSearch = !query || searchValues.some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;
    const matchesGarage = garageFilter === "ALL" || vehicle?.garage === garageFilter;

    return matchesSearch && matchesStatus && matchesGarage;
  });

  const filteredHistory = historyRecords.filter((record) => {
    const vehicle = getVehicle(record.vehicle_id);
    const query = search.trim().toLowerCase();

    const searchValues = [
      record.maintenance_type,
      record.description,
      record.performed_by,
      vehicle?.fleet_number,
      vehicle?.make,
      vehicle?.model,
    ].filter(Boolean);

    const matchesSearch = !query || searchValues.some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = statusFilter === "ALL" || getRecordStatus(record) === statusFilter;
    const matchesGarage = garageFilter === "ALL" || vehicle?.garage === garageFilter;

    return matchesSearch && matchesStatus && matchesGarage;
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
      status: getRecordStatus(record),
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
          <p>Manage scheduled service, active work, defects, and completed maintenance history.</p>
        </div>

        <div className="page-intro-actions">
          <button type="button" className="button button-secondary" onClick={() => loadMaintenance(false)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {canEdit && (
            <button type="button" className="button button-primary" onClick={openNewServiceOrder}>
              New Service Order
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stats-grid maintenance-stats">
        <Stat label="Open Service Orders" value={activeQueue.length} />
        <Stat label="Overdue" value={overdueCount} />
        <Stat label="In Progress" value={inProgressCount} />
        <Stat label="Open Defects" value={openDefectCount} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Service Queue</span>
            <h2>Maintenance Queue</h2>
            <p>{filteredQueue.length} active service order{filteredQueue.length === 1 ? "" : "s"}</p>
          </div>

          <button type="button" className="button button-secondary" onClick={() => setShowHistory((current) => !current)}>
            {showHistory ? "Hide Service History" : "Service History"}
          </button>
        </div>

        <div className="toolbar-controls">
          <label className="search-control">
            <span>Search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fleet number, service, description..." />
          </label>

          <label className="select-control">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label className="select-control">
            <span>Garage</span>
            <select value={garageFilter} onChange={(event) => setGarageFilter(event.target.value)}>
              <option value="ALL">All garages</option>
              {garages.map((garage) => (
                <option key={garage} value={garage}>
                  {garage}
                </option>
              ))}
            </select>
          </label>
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

      {showHistory && (
        <div className="panel service-history-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Maintenance Records</span>
              <h2>Service History</h2>
              <p>{filteredHistory.length} completed or cancelled record{filteredHistory.length === 1 ? "" : "s"}</p>
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
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Defect Management</span>
            <h2>Open Vehicle Defects</h2>
            <p>Reported issues that have not yet been closed.</p>
          </div>
        </div>

        {defects.length === 0 ? (
          <div className="empty-state">
            <strong>No open defects</strong>
            <span>There are currently no unresolved vehicle defects.</span>
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
                {defects.map((defect) => (
                  <tr key={defect.id}>
                    <td>
                      <strong>{getVehicle(defect.vehicle_id)?.fleet_number || "Unknown"}</strong>
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

function Empty() {
  return <div className="empty">No records found.</div>;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

export default App;