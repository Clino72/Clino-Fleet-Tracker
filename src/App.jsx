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
            />
          )}

          {page === "Drivers" && <Drivers canEdit={canEdit} />}

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

function Sidebar({ page, setPage, mobileNavOpen, setMobileNavOpen }) {
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
    setMobileNavOpen(false);
  }

  return (
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-header">
        <button type="button" className="sidebar-brand" onClick={() => handleNavigation("Dashboard")}>
          <div className="brand-mark">72</div>

          <div className="brand-wordmark">
            <strong>CLINO TRANSPORTATION</strong>
            <span>Fleet Management</span>
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
          <span>Management console</span>
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
  const [inspections, setInspections] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadDashboard(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    }

    const [vehiclesResult, driversResult, fleetResult, maintenanceResult, eventsResult, inspectionsResult] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("fleet_live").select("*"),
      supabase.from("maintenance_records").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.maintenanceCount || 8),
      supabase.from("vehicle_events").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.activityCount || 8),
      supabase.from("audits").select("id,vehicle_id,result,created_at,vehicles(fleet_number)").eq("result", "FAIL").order("created_at", { ascending: false }).limit(10),
    ]);

    const results = [vehiclesResult, driversResult, fleetResult, maintenanceResult, inspectionsResult, eventsResult];
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
    setInspections(inspectionsResult.data || []);
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
  }, [preferences?.telemetryInterval, preferences?.activityCount, preferences?.maintenanceCount, preferences?.inspectionWarnings]);

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

  if (preferences?.inspectionWarnings && inspections.length > 0) {
    attentionItems.push({
      type: "danger",
      title: "Failed inspections",
      description: `${inspections.length} vehicle inspection${inspections.length === 1 ? "" : "s"} currently require review.`,
      action: "Inspections",
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

function LiveFleet({ canEdit, preferences }) {
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
    }, (preferences?.mapRefresh || 15) * 1000);

    return () => clearInterval(interval);
  }, [preferences?.mapRefresh]);

  const filteredFleet = fleet.filter((bus) => {
    const status = String(bus.effective_status || bus.status || "UNKNOWN").toUpperCase();

    if (!preferences?.showOffline && status === "OFFLINE") {
      return false;
    }

    if (!preferences?.showStale && status !== "OFFLINE" && Boolean(bus.is_stale)) {
      return false;
    }

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
            preferences={preferences}
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

function FleetMap({ fleet, selectedFleetNumber, onSelect, preferences }) {
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
              <span class="fleet-map-marker-label">${preferences?.vehicleLabels ? fleetNumber : ""}</span>
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
      const label = element.querySelector(".fleet-map-marker-label");
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
  }, [fleet, selectedFleetNumber, onSelect, preferences?.vehicleLabels]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !selectedFleetNumber || !preferences?.autoFollowVehicle) {
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
  }, [selectedFleetNumber, preferences?.autoFollowVehicle]);

  return (
    <div className="fleet-map">
      <div ref={mapRef} className="fleet-map-canvas" />
    </div>
  );
}

function Vehicles({ canEdit, navigateTo }) {
  const [vehicleView, setVehicleView] = useState("list");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

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
  const [message, setMessage] = useState("");

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

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailEditForm, setDetailEditForm] = useState({
    year: "",
    make: "",
    model: "",
    engine: "",
    mileage: "",
    status: "",
    garage: "",
    notes: "",
  });

  const [newVehicleForm, setNewVehicleForm] = useState({
    fleetNumber: "",
    year: "",
    make: "",
    model: "",
    engine: "",
    mileage: "",
    garage: "CLIO",
    status: "AVAILABLE",
    notes: "",
  });

  const [newGarageDropdownOpen, setNewGarageDropdownOpen] = useState(false);
  const [newStatusDropdownOpen, setNewStatusDropdownOpen] = useState(false);
  const [newFormError, setNewFormError] = useState("");

  const garageOptions = ["CLIO", "MAPLECREST"];

  const statusOptions = [
    ["AVAILABLE", "Available"],
    ["ASSIGNED", "Assigned"],
    ["IN_SERVICE", "In Service"],
    ["MAINTENANCE", "Maintenance"],
    ["OUT_OF_SERVICE", "Out of Service"],
  ];

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

  function updateNewVehicleField(field, value) {
    setNewVehicleForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateDetailEditField(field, value) {
    setDetailEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetNewVehicleForm() {
    setNewVehicleForm({
      fleetNumber: "",
      year: "",
      make: "",
      model: "",
      engine: "",
      mileage: "",
      garage: "CLIO",
      status: "AVAILABLE",
      notes: "",
    });

    setNewGarageDropdownOpen(false);
    setNewStatusDropdownOpen(false);
    setNewFormError("");
  }

  function openNewVehicle() {
    if (!canEdit) {
      return;
    }

    resetNewVehicleForm();
    setVehicleView("new");
    setSelectedVehicleId(null);
    setError("");
    setMessage("");
  }

  function openVehicleDetails(vehicleId) {
    setSelectedVehicleId(vehicleId);
    setVehicleView("details");
    setError("");
    setMessage("");
    setEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToVehicleList() {
    if (saving) {
      return;
    }

    setSelectedVehicleId(null);
    setVehicle(null);
    setLiveData(null);
    setDriver(null);
    setRoute(null);
    setServer(null);
    setAssignments([]);
    setRouteAssignments([]);
    setMaintenance([]);
    setDefects([]);
    setAudits([]);
    setEvents([]);
    setEditing(false);
    setError("");
    setMessage("");
    setVehicleView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getInspectionTagClass(tag) {
    if (tag === "RED") {
      return "status-badge status-fail";
    }

    if (tag === "YELLOW") {
      return "status-badge inspection-result-yellow";
    }

    return "status-badge status-pass";
  }

  function getInspectionTagLabel(tag) {
    if (tag === "RED") {
      return "RED TAG";
    }

    if (tag === "YELLOW") {
      return "YELLOW TAG";
    }

    return "PASS";
  }

  async function loadVehicles(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const [
      { data: vehicleData, error: vehicleError },
      { data: liveDataResult, error: liveError },
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
      (driverData || []).map((currentDriver) => [String(currentDriver.id), currentDriver])
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
    setLiveVehicles(liveDataResult || []);
    setDrivers(driverById);
    setLoading(false);
    setRefreshing(false);
  }

  async function loadVehicleDetails(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    if (!selectedVehicleId) {
      setError("No vehicle was selected.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", selectedVehicleId)
      .maybeSingle();

    if (vehicleError) {
      setError(vehicleError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!vehicleData) {
      setVehicle(null);
      setError("Vehicle not found.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setVehicle(vehicleData);

    setDetailEditForm({
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

      supabase.from("assignments").select("*").eq("vehicle_id", selectedVehicleId).order("started_at", { ascending: false }),

      supabase.from("route_assignments").select("*").eq("vehicle_id", selectedVehicleId).order("started_at", { ascending: false }),

      supabase.from("maintenance_records").select("*").eq("vehicle_id", selectedVehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("vehicle_defects").select("*").eq("vehicle_id", selectedVehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("audits").select("*").eq("vehicle_id", selectedVehicleId).order("created_at", { ascending: false }).limit(20),

      supabase.from("vehicle_events").select("*").eq("vehicle_id", selectedVehicleId).order("created_at", { ascending: false }).limit(20),
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
    if (vehicleView === "list") {
      loadVehicles(true);
      return;
    }

    if (vehicleView === "details") {
      loadVehicleDetails(true);
    }
  }, [vehicleView, selectedVehicleId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [message]);

  const liveByFleet = new Map(
    liveVehicles.map((currentVehicle) => [String(currentVehicle.fleet_number), currentVehicle])
  );

  const vehicleRows = vehicles.map((currentVehicle) => {
    const live = liveByFleet.get(String(currentVehicle.fleet_number));
    const assignedDriver = drivers.get(String(currentVehicle.current_driver_id));
    const liveDriver = live?.driver_id ? drivers.get(String(live.driver_id)) : null;

    return {
      ...currentVehicle,
      live,
      driverName: live?.driver_name || liveDriver?.name || assignedDriver?.name || "Unassigned",
      displayStatus: live?.effective_status || currentVehicle.status || "UNKNOWN",
    };
  });

  const garages = [...new Set(vehicleRows.map((currentVehicle) => currentVehicle.garage).filter(Boolean))].sort((a, b) => {
    const garageOrder = {
      CLIO: 0,
      MAPLECREST: 1,
    };

    return (garageOrder[String(a).toUpperCase()] ?? 99) - (garageOrder[String(b).toUpperCase()] ?? 99);
  });

  const statuses = [...new Set(vehicleRows.map((currentVehicle) => currentVehicle.displayStatus).filter(Boolean))].sort();

  const filteredVehicles = vehicleRows.filter((currentVehicle) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      currentVehicle.fleet_number,
      currentVehicle.year,
      currentVehicle.make,
      currentVehicle.model,
      currentVehicle.engine,
      currentVehicle.garage,
      currentVehicle.status,
      currentVehicle.displayStatus,
      currentVehicle.driverName,
      currentVehicle.live?.route_name,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const matchesGarage = garageFilter === "ALL" || currentVehicle.garage === garageFilter;
    const matchesStatus = statusFilter === "ALL" || currentVehicle.displayStatus === statusFilter;

    return matchesSearch && matchesGarage && matchesStatus;
  });

  const totalCount = vehicleRows.length;
  const availableCount = vehicleRows.filter((currentVehicle) => String(currentVehicle.displayStatus).toUpperCase() === "AVAILABLE").length;
  const assignedCount = vehicleRows.filter((currentVehicle) => String(currentVehicle.displayStatus).toUpperCase() === "ASSIGNED").length;
  const inServiceCount = vehicleRows.filter((currentVehicle) => String(currentVehicle.displayStatus).toUpperCase() === "IN_SERVICE").length;
  const maintenanceCount = vehicleRows.filter((currentVehicle) => String(currentVehicle.displayStatus).toUpperCase() === "MAINTENANCE").length;
  const outOfServiceCount = vehicleRows.filter((currentVehicle) => String(currentVehicle.displayStatus).toUpperCase() === "OUT_OF_SERVICE").length;

  async function saveNewVehicle() {
    if (!canEdit || saving) {
      return;
    }

    setNewFormError("");
    setError("");

    const fleetNumber = newVehicleForm.fleetNumber.trim();
    const make = newVehicleForm.make.trim();
    const model = newVehicleForm.model.trim();

    if (!fleetNumber) {
      setNewFormError("Fleet Number is required.");
      return;
    }

    if (!make) {
      setNewFormError("Make is required.");
      return;
    }

    if (!model) {
      setNewFormError("Model is required.");
      return;
    }

    if (newVehicleForm.year !== "") {
      const year = Number(newVehicleForm.year);

      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        setNewFormError("Enter a valid model year.");
        return;
      }
    }

    if (newVehicleForm.mileage !== "") {
      const mileage = Number(newVehicleForm.mileage);

      if (!Number.isFinite(mileage) || mileage < 0) {
        setNewFormError("Mileage must be zero or greater.");
        return;
      }
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("vehicles").insert({
      fleet_number: fleetNumber,
      year: newVehicleForm.year === "" ? null : Number(newVehicleForm.year),
      make,
      model,
      engine: newVehicleForm.engine.trim() || null,
      mileage: newVehicleForm.mileage === "" ? 0 : Number(newVehicleForm.mileage),
      garage: newVehicleForm.garage || null,
      status: newVehicleForm.status,
      notes: newVehicleForm.notes.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setNewFormError("A vehicle with that fleet number already exists.");
      } else {
        setNewFormError(insertError.message);
      }

      setSaving(false);
      return;
    }

    resetNewVehicleForm();
    setSaving(false);
    setMessage("Vehicle added to the fleet.");
    setVehicleView("list");
    await loadVehicles(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveVehicleEdits() {
    if (!canEdit || !vehicle || saving) {
      return;
    }

    setError("");
    setMessage("");

    if (!detailEditForm.make.trim()) {
      setError("Make is required.");
      return;
    }

    if (!detailEditForm.model.trim()) {
      setError("Model is required.");
      return;
    }

    if (detailEditForm.year !== "") {
      const year = Number(detailEditForm.year);

      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        setError("Enter a valid model year.");
        return;
      }
    }

    if (detailEditForm.mileage !== "") {
      const mileage = Number(detailEditForm.mileage);

      if (!Number.isFinite(mileage) || mileage < 0) {
        setError("Mileage must be zero or greater.");
        return;
      }
    }

    setSaving(true);

    const { data, error: rpcError } = await supabase.rpc("update_vehicle", {
      p_vehicle_id: vehicle.id,
      p_year: detailEditForm.year === "" ? null : Number(detailEditForm.year),
      p_make: detailEditForm.make.trim(),
      p_model: detailEditForm.model.trim(),
      p_engine: detailEditForm.engine.trim(),
      p_mileage: detailEditForm.mileage === "" ? null : Number(detailEditForm.mileage),
      p_status: detailEditForm.status,
      p_garage: detailEditForm.garage.trim(),
      p_notes: detailEditForm.notes.trim(),
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
    await loadVehicleDetails(false);
    setSaving(false);
  }

  if (vehicleView === "new") {
    return (
      <section className="page-section inspection-page inspection-form-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToVehicleList}
              disabled={saving}
            >
              ← Back to Vehicles
            </button>

            <span className="eyebrow">Fleet Directory / New Vehicle</span>
            <h1>New Vehicle</h1>
            <p>Register a vehicle in the fleet inventory.</p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={returnToVehicleList}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveNewVehicle}
              disabled={saving || !canEdit}
            >
              {saving ? "Adding..." : "Add Vehicle"}
            </button>
          </div>
        </div>

        {newFormError && (
          <div className="alert alert-error">
            {newFormError}
          </div>
        )}

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Vehicle Setup</span>
              <h3>Vehicle Information</h3>
            </div>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="form-field">
              <span>Fleet Number</span>

              <input
                type="text"
                value={newVehicleForm.fleetNumber}
                onChange={(event) => updateNewVehicleField("fleetNumber", event.target.value)}
                placeholder="e.g. 101"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Year</span>

              <input
                type="number"
                value={newVehicleForm.year}
                onChange={(event) => updateNewVehicleField("year", event.target.value)}
                placeholder="e.g. 2021"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Make</span>

              <input
                type="text"
                value={newVehicleForm.make}
                onChange={(event) => updateNewVehicleField("make", event.target.value)}
                placeholder="e.g. Blue Bird"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Model</span>

              <input
                type="text"
                value={newVehicleForm.model}
                onChange={(event) => updateNewVehicleField("model", event.target.value)}
                placeholder="e.g. Vision"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Engine</span>

              <input
                type="text"
                value={newVehicleForm.engine}
                onChange={(event) => updateNewVehicleField("engine", event.target.value)}
                placeholder="e.g. Cummins B6.7"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Current Mileage</span>

              <input
                type="number"
                min="0"
                step="0.1"
                value={newVehicleForm.mileage}
                onChange={(event) => updateNewVehicleField("mileage", event.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </label>
          </div>
        </div>

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Fleet Operations</span>
              <h3>Operational Configuration</h3>
            </div>

            <span className={getStatusClass(newVehicleForm.status)}>
              {getStatusLabel(newVehicleForm.status)}
            </span>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="select-control">
              <span>Garage</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setNewGarageDropdownOpen((open) => !open);
                    setNewStatusDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>{newVehicleForm.garage || "Select garage"}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {newGarageDropdownOpen && (
                  <div className="custom-select-menu">
                    {garageOptions.map((garage) => (
                      <button
                        type="button"
                        key={garage}
                        className={`custom-select-option ${newVehicleForm.garage === garage ? "selected" : ""}`}
                        onClick={() => {
                          updateNewVehicleField("garage", garage);
                          setNewGarageDropdownOpen(false);
                        }}
                      >
                        {garage}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Initial Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setNewStatusDropdownOpen((open) => !open);
                    setNewGarageDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>{getStatusLabel(newVehicleForm.status)}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {newStatusDropdownOpen && (
                  <div className="custom-select-menu">
                    {statusOptions.map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`custom-select-option ${newVehicleForm.status === value ? "selected" : ""}`}
                        onClick={() => {
                          updateNewVehicleField("status", value);
                          setNewStatusDropdownOpen(false);
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

        <div className="inspection-notes-section">
          <div className="inspection-notes-header">
            <div>
              <span className="eyebrow">Vehicle Record</span>
              <h3>Notes</h3>
            </div>
          </div>

          <div className="inspection-notes-content inspection-notes-editor">
            <textarea
              value={newVehicleForm.notes}
              onChange={(event) => updateNewVehicleField("notes", event.target.value)}
              placeholder="Enter vehicle notes..."
              rows="6"
              disabled={saving}
            />
          </div>
        </div>

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToVehicleList}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={saveNewVehicle}
            disabled={saving || !canEdit}
          >
            {saving ? "Adding..." : "Add Vehicle"}
          </button>
        </div>
      </section>
    );
  }

  if (vehicleView === "details") {
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
              <button
                type="button"
                className="button button-secondary button-small inspection-back-button"
                onClick={returnToVehicleList}
              >
                ← Back to Vehicles
              </button>

              <span className="eyebrow">Fleet Directory / Vehicle Record</span>
              <h1>Vehicle Details</h1>
              <p>{error || "The requested vehicle could not be loaded."}</p>
            </div>
          </div>
        </section>
      );
    }

    const effectiveStatus = liveData?.effective_status || vehicle.status;
    const isOnline = Boolean(liveData);

    return (
      <section className="page-section inspection-page inspection-detail-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToVehicleList}
            >
              ← Back to Vehicles
            </button>

            <span className="eyebrow">Fleet Directory / Vehicle Record</span>
            <h1>{vehicle.fleet_number}</h1>
            <p>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => loadVehicleDetails(false)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {canEdit && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => setEditing((current) => !current)}
              >
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
          <>
            <div className="panel inspection-selection-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Vehicle Record / Edit</span>
                  <h3>Edit Vehicle</h3>
                </div>
              </div>

              <div className="inspection-setup-grid form-grid form-grid-three">
                <label className="form-field">
                  <span>Fleet Number</span>
                  <input type="text" value={vehicle.fleet_number || ""} disabled />
                </label>

                <label className="form-field">
                  <span>Year</span>
                  <input
                    type="number"
                    value={detailEditForm.year}
                    onChange={(event) => updateDetailEditField("year", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Make</span>
                  <input
                    type="text"
                    value={detailEditForm.make}
                    onChange={(event) => updateDetailEditField("make", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Model</span>
                  <input
                    type="text"
                    value={detailEditForm.model}
                    onChange={(event) => updateDetailEditField("model", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Engine</span>
                  <input
                    type="text"
                    value={detailEditForm.engine}
                    onChange={(event) => updateDetailEditField("engine", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Mileage</span>
                  <input
                    type="number"
                    min="0"
                    value={detailEditForm.mileage}
                    onChange={(event) => updateDetailEditField("mileage", event.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

            <div className="panel inspection-selection-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Fleet Operations</span>
                  <h3>Operational Configuration</h3>
                </div>

                <span className={getStatusClass(detailEditForm.status)}>
                  {getStatusLabel(detailEditForm.status)}
                </span>
              </div>

              <div className="inspection-setup-grid form-grid form-grid-three">
                <label className="form-field">
                  <span>Garage</span>
                  <input
                    type="text"
                    value={detailEditForm.garage}
                    onChange={(event) => updateDetailEditField("garage", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Status</span>

                  <select
                    value={detailEditForm.status}
                    onChange={(event) => updateDetailEditField("status", event.target.value)}
                    disabled={saving}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="inspection-notes-section">
              <div className="inspection-notes-header">
                <div>
                  <span className="eyebrow">Vehicle Record</span>
                  <h3>Notes</h3>
                </div>
              </div>

              <div className="inspection-notes-content inspection-notes-editor">
                <textarea
                  value={detailEditForm.notes}
                  onChange={(event) => updateDetailEditField("notes", event.target.value)}
                  rows="6"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="inspection-page-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-primary"
                onClick={saveVehicleEdits}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Vehicle"}
              </button>
            </div>
          </>
        )}

        <div className="panel inspection-information-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Vehicle Information</span>
              <h3>Vehicle Record</h3>
            </div>

            <span className={getStatusClass(effectiveStatus)}>
              {getStatusLabel(effectiveStatus)}
            </span>
          </div>

          <div className="detail-list">
            <div className="detail-list-row">
              <span>Fleet Number</span>
              <strong>{vehicle.fleet_number || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Year</span>
              <strong>{vehicle.year || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Make</span>
              <strong>{vehicle.make || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Model</span>
              <strong>{vehicle.model || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Engine</span>
              <strong>{vehicle.engine || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Mileage</span>
              <strong>{formatMileage(vehicle.mileage)}</strong>
            </div>

            <div className="detail-list-row">
              <span>Garage</span>
              <strong>{vehicle.garage || "—"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Database Status</span>
              <strong>{getStatusLabel(vehicle.status)}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Fleet Operations</span>
              <h3>Current Assignment</h3>
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Live Operations</span>
              <h3>Telemetry</h3>
            </div>

            <span className={isOnline ? "status-badge status-active" : "status-badge"}>
              {isOnline ? "REPORTING" : "NO TELEMETRY"}
            </span>
          </div>

          {liveData ? (
            <div className="telemetry-grid">
              <div className="telemetry-card">
                <span>Speed</span>
                <strong>
                  {liveData.speed !== null && liveData.speed !== undefined ? `${Number(liveData.speed).toFixed(1)} mph` : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>RPM</span>
                <strong>
                  {liveData.rpm !== null && liveData.rpm !== undefined ? Number(liveData.rpm).toLocaleString() : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Coolant</span>
                <strong>
                  {liveData.coolant_temp !== null && liveData.coolant_temp !== undefined ? `${Number(liveData.coolant_temp).toFixed(1)}°` : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Oil</span>
                <strong>
                  {liveData.oil_temp !== null && liveData.oil_temp !== undefined ? `${Number(liveData.oil_temp).toFixed(1)}°` : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Heading</span>
                <strong>
                  {liveData.heading !== null && liveData.heading !== undefined ? `${Number(liveData.heading).toFixed(1)}°` : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Position X</span>
                <strong>
                  {liveData.x !== null && liveData.x !== undefined ? Number(liveData.x).toFixed(2) : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Position Y</span>
                <strong>
                  {liveData.y !== null && liveData.y !== undefined ? Number(liveData.y).toFixed(2) : "—"}
                </strong>
              </div>

              <div className="telemetry-card">
                <span>Position Z</span>
                <strong>
                  {liveData.z !== null && liveData.z !== undefined ? Number(liveData.z).toFixed(2) : "—"}
                </strong>
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
                <span className="eyebrow">Assignments</span>
                <h3>Assignment History</h3>
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
                      <strong>{getStatusLabel(assignment.status)}</strong>
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
                <span className="eyebrow">Routes</span>
                <h3>Route Assignments</h3>
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
                      <span>{getStatusLabel(assignment.status)}</span>
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
                <span className="eyebrow">Maintenance</span>
                <h3>Service History</h3>
              </div>

              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => navigateTo("Maintenance")}
              >
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
                <span className="eyebrow">Defects</span>
                <h3>Vehicle Defects</h3>
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
                        {getStatusLabel(defect.status)}
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
                <span className="eyebrow">Compliance</span>
                <h3>Inspection History</h3>
              </div>

              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => navigateTo("Inspections")}
              >
                Open Inspections
              </button>
            </div>

            {audits.length === 0 ? (
              <div className="empty-state compact">
                <strong>No inspections</strong>
                <span>No inspection records are associated with this vehicle.</span>
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
                      <span className={getInspectionTagClass(audit.result === "FAIL" ? "RED" : "PASS")}>
                        {getInspectionTagLabel(audit.result === "FAIL" ? "RED" : "PASS")}
                      </span>

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
                <span className="eyebrow">History</span>
                <h3>Vehicle Events</h3>
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

        <div className="inspection-notes-section inspection-notes-readonly">
          <div className="inspection-notes-header">
            <div>
              <span className="eyebrow">Vehicle Record</span>
              <h3>Notes</h3>
            </div>
          </div>

          <div className="inspection-notes-content">
            {vehicle.notes || "No vehicle notes have been recorded."}
          </div>
        </div>

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToVehicleList}
          >
            Back to Vehicles
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section inspection-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Fleet Directory</span>
          <h1>Vehicles</h1>
          <p>Fleet inventory, operational status, and vehicle records.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button
              type="button"
              className="button button-primary"
              onClick={openNewVehicle}
            >
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

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

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
                {filteredVehicles.map((currentVehicle) => (
                  <tr key={currentVehicle.id}>
                    <td>
                      <button
                        type="button"
                        className="table-primary-link"
                        onClick={() => openVehicleDetails(currentVehicle.id)}
                      >
                        {currentVehicle.fleet_number || "—"}
                      </button>
                    </td>

                    <td>
                      <div className="table-main-text">
                        {[currentVehicle.year, currentVehicle.make, currentVehicle.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                      </div>
                    </td>

                    <td>{currentVehicle.engine || "—"}</td>

                    <td>
                      {currentVehicle.mileage !== null && currentVehicle.mileage !== undefined && currentVehicle.mileage !== ""
                        ? Number(currentVehicle.mileage).toLocaleString()
                        : "—"}
                    </td>

                    <td>{currentVehicle.garage || "—"}</td>

                    <td>{currentVehicle.driverName}</td>

                    <td>{currentVehicle.live?.route_name || "No active route"}</td>

                    <td>
                      <span className={getStatusClass(currentVehicle.displayStatus)}>
                        {getStatusLabel(currentVehicle.displayStatus)}
                      </span>
                    </td>

                    <td className="table-actions">
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => openVehicleDetails(currentVehicle.id)}
                      >
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

function Drivers({ canEdit }) {
  const [driverView, setDriverView] = useState("list");
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [route, setRoute] = useState(null);
  const [live, setLive] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [routeAssignments, setRouteAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [audits, setAudits] = useState([]);

  const [editing, setEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    employeeNumber: "",
    robloxUserId: "",
    status: "",
  });

  const [newDriverForm, setNewDriverForm] = useState({
    name: "",
    employeeNumber: "",
    robloxUserId: "",
    status: "ACTIVE",
  });

  const [newStatusDropdownOpen, setNewStatusDropdownOpen] = useState(false);
  const [editStatusDropdownOpen, setEditStatusDropdownOpen] = useState(false);
  const [newFormError, setNewFormError] = useState("");

  const driverStatusOptions = [
    ["ACTIVE", "Active"],
    ["INACTIVE", "Inactive"],
  ];

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNewDriverField(field, value) {
    setNewDriverForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetNewDriverForm() {
    setNewDriverForm({
      name: "",
      employeeNumber: "",
      robloxUserId: "",
      status: "ACTIVE",
    });

    setNewStatusDropdownOpen(false);
    setEditStatusDropdownOpen(false);
    setNewFormError("");
  }

  function openNewDriver() {
    if (!canEdit) {
      return;
    }

    resetNewDriverForm();
    setDriverView("new");
    setSelectedDriverId(null);
    setDriver(null);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDriverDetails(driverId) {
    setSelectedDriverId(driverId);
    setDriverView("details");
    setEditing(false);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToDriverList() {
    if (saving || deletingId) {
      return;
    }

    setDriverView("list");
    setSelectedDriverId(null);
    setDriver(null);
    setVehicle(null);
    setRoute(null);
    setLive(null);
    setAssignments([]);
    setRouteAssignments([]);
    setSessions([]);
    setAudits([]);
    setEditing(false);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatDate(timestamp, includeTime = true) {
    if (!timestamp) {
      return "—";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  }

  function formatRelative(timestamp) {
    if (!timestamp) {
      return "No telemetry";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "No telemetry";
    }

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

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

  function getDriverStatusClass(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "ACTIVE") {
      return "status-badge status-active";
    }

    if (normalized === "OFFLINE") {
      return "status-badge status-neutral";
    }

    if (normalized === "INACTIVE") {
      return "status-badge status-danger";
    }

    return "status-badge";
  }

  function getDriverStatusLabel(status) {
    return String(status || "UNKNOWN").replaceAll("_", " ");
  }

  function getAuditTagClass(result) {
    if (result === "FAIL") {
      return "status-badge status-fail";
    }

    if (result === "PASS") {
      return "status-badge status-pass";
    }

    return "status-badge status-neutral";
  }

  function getAuditTagLabel(result) {
    if (result === "FAIL") {
      return "RED TAG";
    }

    if (result === "PASS") {
      return "PASS";
    }

    return String(result || "PENDING");
  }

  async function loadDrivers(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

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

    const liveMap = new Map(
      (liveData || [])
        .filter((item) => item.driver_id)
        .map((item) => [item.driver_id, item])
    );

    const enriched = (data || []).map((currentDriver) => {
      const currentLive = liveMap.get(currentDriver.id);

      return {
        ...currentDriver,
        live: currentLive,
        operationalStatus: currentLive ? "ACTIVE" : "OFFLINE",
      };
    });

    setDrivers(enriched);
    setRefreshing(false);
    setLoading(false);
  }

  async function loadDriverDetails(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    if (!selectedDriverId) {
      setError("No driver was selected.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", selectedDriverId)
      .maybeSingle();

    if (driverError) {
      setError(driverError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!driverData) {
      setDriver(null);
      setError("Driver not found.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setDriver(driverData);

    setEditForm({
      name: driverData.name ?? "",
      employeeNumber: driverData.employee_number ?? "",
      robloxUserId: driverData.roblox_user_id ?? "",
      status: driverData.status ?? "",
    });

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

      supabase.from("fleet_live").select("*").eq("driver_id", selectedDriverId).maybeSingle(),

      supabase.from("assignments").select("id,vehicle_id,driver_id,route_id,status,started_at,ended_at,notes,route_number").eq("driver_id", selectedDriverId).order("started_at", { ascending: false }).limit(10),

      supabase.from("route_assignments").select("id,route_id,route_code,driver_id,vehicle_id,status,started_at,ended_at,created_at,updated_at").eq("driver_id", selectedDriverId).order("created_at", { ascending: false }).limit(10),

      driverData.roblox_user_id
        ? supabase.from("driver_sessions").select("id,roblox_user_id,server_id,player_name,last_seen").eq("roblox_user_id", driverData.roblox_user_id).order("last_seen", { ascending: false }).limit(10)
        : Promise.resolve({ data: [], error: null }),

      supabase.from("audits").select("id,vehicle_id,driver_id,audit_type,result,checklist,notes,completed_at,created_at").eq("driver_id", selectedDriverId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (vehicleError || routeError || liveError || assignmentError || routeAssignmentError || sessionError || auditError) {
      const firstError = vehicleError || routeError || liveError || assignmentError || routeAssignmentError || sessionError || auditError;
      setError(firstError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setVehicle(vehicleData || null);
    setRoute(routeData || null);
    setLive(liveData || null);
    setAssignments(assignmentData || []);
    setRouteAssignments(routeAssignmentData || []);
    setSessions(sessionData || []);
    setAudits(auditData || []);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (driverView === "list") {
      loadDrivers(true);
      return;
    }

    if (driverView === "details") {
      loadDriverDetails(true);
    }
  }, [driverView, selectedDriverId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [message]);

  async function deleteDriver(currentDriver) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete driver "${currentDriver.name || "Unnamed Driver"}"?\n\nThis removes the driver from the personnel directory. Historical assignments, audits, and route records will be retained without the deleted driver attached.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(currentDriver.id);
    setError("");
    setMessage("");

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({ current_driver_id: null })
      .eq("current_driver_id", currentDriver.id);

    if (vehicleError) {
      setError(vehicleError.message);
      setDeletingId(null);
      return;
    }

    const { error: assignmentError } = await supabase
      .from("assignments")
      .update({ driver_id: null })
      .eq("driver_id", currentDriver.id);

    if (assignmentError) {
      setError(assignmentError.message);
      setDeletingId(null);
      return;
    }

    const { error: routeAssignmentError } = await supabase
      .from("route_assignments")
      .update({ driver_id: null })
      .eq("driver_id", currentDriver.id);

    if (routeAssignmentError) {
      setError(routeAssignmentError.message);
      setDeletingId(null);
      return;
    }

    const { error: auditError } = await supabase
      .from("audits")
      .update({ driver_id: null })
      .eq("driver_id", currentDriver.id);

    if (auditError) {
      setError(auditError.message);
      setDeletingId(null);
      return;
    }

    const { error: stateError } = await supabase
      .from("vehicle_current_state")
      .update({ driver_id: null })
      .eq("driver_id", currentDriver.id);

    if (stateError) {
      setError(stateError.message);
      setDeletingId(null);
      return;
    }

    const { error: driverError } = await supabase
      .from("drivers")
      .delete()
      .eq("id", currentDriver.id);

    if (driverError) {
      setError(driverError.message);
      setDeletingId(null);
      return;
    }

    setDrivers((current) => current.filter((item) => item.id !== currentDriver.id));
    setMessage(`${currentDriver.name || "Driver"} was deleted.`);
    setDeletingId(null);
  }

  async function saveNewDriver() {
    if (!canEdit || saving) {
      return;
    }

    setNewFormError("");
    setError("");

    const name = newDriverForm.name.trim();
    const employeeNumber = newDriverForm.employeeNumber.trim();
    const robloxUserId = newDriverForm.robloxUserId.trim();

    if (!name) {
      setNewFormError("Driver Name is required.");
      return;
    }

    if (!employeeNumber) {
      setNewFormError("Employee Number is required.");
      return;
    }

    if (!robloxUserId) {
      setNewFormError("Roblox User ID is required.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("drivers").insert({
      name,
      employee_number: employeeNumber,
      roblox_user_id: robloxUserId,
      status: newDriverForm.status,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setNewFormError("A driver with that employee number or Roblox User ID already exists.");
      } else {
        setNewFormError(insertError.message);
      }

      setSaving(false);
      return;
    }

    resetNewDriverForm();
    setSaving(false);
    setMessage(`${name} was added to the driver directory.`);
    setDriverView("list");
    await loadDrivers(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDriverEdits() {
    if (!canEdit || !driver || saving) {
      return;
    }

    setError("");
    setMessage("");

    const name = editForm.name.trim();
    const employeeNumber = editForm.employeeNumber.trim();
    const robloxUserId = editForm.robloxUserId.trim();

    if (!name) {
      setError("Driver Name is required.");
      return;
    }

    if (!employeeNumber) {
      setError("Employee Number is required.");
      return;
    }

    if (!robloxUserId) {
      setError("Roblox User ID is required.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("drivers")
      .update({
        name,
        employee_number: employeeNumber,
        roblox_user_id: robloxUserId,
        status: editForm.status,
      })
      .eq("id", driver.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditing(false);
    setMessage("Driver record updated.");
    await loadDriverDetails(false);
    setSaving(false);
  }

  const filteredDrivers = drivers.filter((currentDriver) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      currentDriver.name,
      currentDriver.employee_number,
      currentDriver.roblox_user_id,
      currentDriver.current_vehicle?.fleet_number,
      currentDriver.current_route?.route_code,
      currentDriver.current_route?.name,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || currentDriver.operationalStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = drivers.filter((currentDriver) => currentDriver.operationalStatus === "ACTIVE").length;
  const assignedCount = drivers.filter((currentDriver) => currentDriver.current_vehicle || currentDriver.current_route).length;
  const offlineCount = drivers.filter((currentDriver) => currentDriver.operationalStatus === "OFFLINE").length;

  if (driverView === "new") {
    return (
      <section className="page-section inspection-page inspection-form-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToDriverList}
              disabled={saving}
            >
              ← Back to Drivers
            </button>

            <span className="eyebrow">Personnel / New Driver</span>
            <h1>New Driver</h1>
            <p>Register a driver in the personnel directory.</p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={returnToDriverList}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveNewDriver}
              disabled={saving || !canEdit}
            >
              {saving ? "Adding..." : "Add Driver"}
            </button>
          </div>
        </div>

        {newFormError && (
          <div className="alert alert-error">
            {newFormError}
          </div>
        )}

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Driver Setup</span>
              <h3>Personnel Information</h3>
            </div>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="form-field">
              <span>Driver Name</span>

              <input
                type="text"
                value={newDriverForm.name}
                onChange={(event) => updateNewDriverField("name", event.target.value)}
                placeholder="e.g. John Smith"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Employee Number</span>

              <input
                type="text"
                value={newDriverForm.employeeNumber}
                onChange={(event) => updateNewDriverField("employeeNumber", event.target.value)}
                placeholder="e.g. 1042"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Roblox User ID</span>

              <input
                type="text"
                value={newDriverForm.robloxUserId}
                onChange={(event) => updateNewDriverField("robloxUserId", event.target.value)}
                placeholder="e.g. 123456789"
                disabled={saving}
              />
            </label>
          </div>
        </div>

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Personnel Operations</span>
              <h3>Account Configuration</h3>
            </div>

            <span className={getDriverStatusClass(newDriverForm.status)}>
              {getDriverStatusLabel(newDriverForm.status)}
            </span>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="select-control">
              <span>Initial Status</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setNewStatusDropdownOpen((open) => !open)}
                  disabled={saving}
                >
                  <span>{getDriverStatusLabel(newDriverForm.status)}</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {newStatusDropdownOpen && (
                  <div className="custom-select-menu">
                    {driverStatusOptions.map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`custom-select-option ${newDriverForm.status === value ? "selected" : ""}`}
                        onClick={() => {
                          updateNewDriverField("status", value);
                          setNewStatusDropdownOpen(false);
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

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToDriverList}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={saveNewDriver}
            disabled={saving || !canEdit}
          >
            {saving ? "Adding..." : "Add Driver"}
          </button>
        </div>
      </section>
    );
  }

  if (driverView === "details") {
    if (loading) {
      return (
        <section className="page-section inspection-page">
          <div className="empty-state">
            <strong>Loading driver</strong>
            <span>Retrieving driver information and operating history.</span>
          </div>
        </section>
      );
    }

    if (!driver) {
      return (
        <section className="page-section inspection-page">
          <div className="page-intro">
            <div className="page-intro-copy">
              <button
                type="button"
                className="button button-secondary button-small inspection-back-button"
                onClick={returnToDriverList}
              >
                ← Back to Drivers
              </button>

              <span className="eyebrow">Personnel / Driver Record</span>
              <h1>Driver Details</h1>
              <p>{error || "The requested driver could not be loaded."}</p>
            </div>
          </div>
        </section>
      );
    }

    const active = Boolean(live);

    return (
      <section className="page-section inspection-page inspection-detail-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToDriverList}
            >
              ← Back to Drivers
            </button>

            <span className="eyebrow">Personnel / Driver Record</span>
            <h1>{driver.name || "Unnamed Driver"}</h1>
            <p>{driver.employee_number ? `Employee ${driver.employee_number}` : "No employee number assigned"}</p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => loadDriverDetails(false)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {canEdit && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => setEditing((current) => !current)}
              >
                {editing ? "Cancel Edit" : "Edit Driver"}
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
          <>
            <div className="panel inspection-selection-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Personnel / Edit</span>
                  <h3>Edit Driver</h3>
                </div>
              </div>

              <div className="inspection-setup-grid form-grid form-grid-three">
                <label className="form-field">
                  <span>Driver Name</span>

                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => updateEditField("name", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Employee Number</span>

                  <input
                    type="text"
                    value={editForm.employeeNumber}
                    onChange={(event) => updateEditField("employeeNumber", event.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className="form-field">
                  <span>Roblox User ID</span>

                  <input
                    type="text"
                    value={editForm.robloxUserId}
                    onChange={(event) => updateEditField("robloxUserId", event.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

            <div className="panel inspection-selection-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Personnel Operations</span>
                  <h3>Driver Status</h3>
                </div>

                <span className={getDriverStatusClass(editForm.status)}>
                  {getDriverStatusLabel(editForm.status)}
                </span>
              </div>

              <div className="inspection-setup-grid form-grid form-grid-three">
                <label className="select-control">
                  <span>Status</span>

                  <div className="custom-select">
                    <button
                      type="button"
                      className="custom-select-trigger"
                      onClick={() => setEditStatusDropdownOpen((open) => !open)}
                      disabled={saving}
                    >
                      <span>{getDriverStatusLabel(editForm.status)}</span>

                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 10l5 5 5-5" />
                      </svg>
                    </button>

                    {editStatusDropdownOpen && (
                      <div className="custom-select-menu">
                        {driverStatusOptions.map(([value, label]) => (
                          <button
                            type="button"
                            key={value}
                            className={`custom-select-option ${editForm.status === value ? "selected" : ""}`}
                            onClick={() => {
                              updateEditField("status", value);
                              setEditStatusDropdownOpen(false);
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

            <div className="inspection-page-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-primary"
                onClick={saveDriverEdits}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Driver"}
              </button>
            </div>
          </>
        )}

        <div className="panel inspection-information-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Driver Information</span>
              <h3>Personnel Record</h3>
            </div>

            <span className={getDriverStatusClass(active ? "ACTIVE" : "OFFLINE")}>
              {active ? "ACTIVE" : "OFFLINE"}
            </span>
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
              <strong>{driver.roblox_user_id || "—"}</strong>
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
              <span className="eyebrow">Current Assignment</span>
              <h3>Operational Assignment</h3>
            </div>

            <span className={active ? "status-badge status-active" : "status-badge status-neutral"}>
              {active ? "ACTIVE" : "OFFLINE"}
            </span>
          </div>

          <div className="detail-list">
            <div className="detail-list-row">
              <span>Vehicle</span>
              <strong>{vehicle?.fleet_number || "Unassigned"}</strong>
            </div>

            <div className="detail-list-row">
              <span>Vehicle Details</span>
              <strong>
                {vehicle
                  ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
                  : "No vehicle assigned"}
              </strong>
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
          </div>
        </div>

        {live && (
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Live Telemetry</span>
                <h3>Current Vehicle Telemetry</h3>
              </div>

              <span className="status-badge status-active">
                REPORTING
              </span>
            </div>

            <div className="telemetry-grid">
              <div className="telemetry-card">
                <span>Speed</span>
                <strong>{Math.round(Number(live.speed) || 0)} MPH</strong>
              </div>

              <div className="telemetry-card">
                <span>RPM</span>
                <strong>{Math.round(Number(live.rpm) || 0).toLocaleString()}</strong>
              </div>

              <div className="telemetry-card">
                <span>Heading</span>
                <strong>{Math.round(Number(live.heading) || 0)}°</strong>
              </div>

              <div className="telemetry-card">
                <span>Coolant</span>
                <strong>{live.coolant_temp != null ? `${Math.round(Number(live.coolant_temp))}°` : "—"}</strong>
              </div>

              <div className="telemetry-card">
                <span>Oil</span>
                <strong>{live.oil_temp != null ? `${Math.round(Number(live.oil_temp))}°` : "—"}</strong>
              </div>

              <div className="telemetry-card">
                <span>Last Update</span>
                <strong>{formatRelative(live.last_ping)}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="detail-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Assignment History</span>
                <h3>Vehicle Assignments</h3>
              </div>

              <span className="panel-count">{assignments.length}</span>
            </div>

            <div className="table-container">
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
                      <td colSpan="4">
                        <div className="empty-state compact">
                          <strong>No assignment history</strong>
                          <span>No vehicle assignment records exist for this driver.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <div className="table-main-text">
                            {assignment.route_number || "No route number"}
                          </div>

                          <div className="table-secondary">
                            {assignment.notes || "Vehicle assignment"}
                          </div>
                        </td>

                        <td>
                          <span className="status-badge status-neutral">
                            {getDriverStatusLabel(assignment.status)}
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
                <span className="eyebrow">Route History</span>
                <h3>Route Assignments</h3>
              </div>

              <span className="panel-count">{routeAssignments.length}</span>
            </div>

            <div className="table-container">
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
                      <td colSpan="4">
                        <div className="empty-state compact">
                          <strong>No route history</strong>
                          <span>No route assignment records exist for this driver.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    routeAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <div className="table-main-text">
                            {assignment.route_code || "—"}
                          </div>

                          <div className="table-secondary">
                            Route assignment
                          </div>
                        </td>

                        <td>
                          <span className="status-badge status-neutral">
                            {getDriverStatusLabel(assignment.status)}
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

        <div className="detail-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Server Activity</span>
                <h3>Recent Sessions</h3>
              </div>

              <span className="panel-count">{sessions.length}</span>
            </div>

            {sessions.length === 0 ? (
              <div className="empty-state compact">
                <strong>No session history</strong>
                <span>No Roblox driver sessions have been recorded.</span>
              </div>
            ) : (
              <div className="record-list">
                {sessions.map((currentSession) => (
                  <div className="record-list-item" key={currentSession.id}>
                    <div>
                      <strong>{currentSession.player_name || driver.name}</strong>
                      <span>
                        Server {currentSession.server_id ? currentSession.server_id.slice(0, 8) : "—"}
                      </span>
                    </div>

                    <div className="record-list-meta">
                      <span>{formatDate(currentSession.last_seen)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Inspection Records</span>
                <h3>Recent Audits</h3>
              </div>

              <span className="panel-count">{audits.length}</span>
            </div>

            {audits.length === 0 ? (
              <div className="empty-state compact">
                <strong>No driver-linked audits</strong>
                <span>No inspection records are associated with this driver.</span>
              </div>
            ) : (
              <div className="record-list">
                {audits.map((audit) => (
                  <div className="record-list-item" key={audit.id}>
                    <div>
                      <strong>{audit.audit_type || "Inspection"}</strong>
                      <span>{audit.notes || "No inspection notes."}</span>
                    </div>

                    <div className="record-list-meta">
                      <span className={getAuditTagClass(audit.result)}>
                        {getAuditTagLabel(audit.result)}
                      </span>

                      <span>{formatDate(audit.completed_at || audit.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="inspection-notes-section inspection-notes-readonly">
          <div className="inspection-notes-header">
            <div>
              <span className="eyebrow">Driver Record</span>
              <h3>Record Information</h3>
            </div>
          </div>

          <div className="inspection-notes-content">
            Driver ID: {driver.id || "—"}
            <br />
            Roblox User ID: {driver.roblox_user_id || "—"}
          </div>
        </div>

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToDriverList}
          >
            Back to Drivers
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section inspection-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Personnel / Driver Operations</span>
          <h1>Drivers</h1>
          <p>Driver records, current assignments, and live operating status.</p>
        </div>

        <div className="page-intro-actions">
          {canEdit && (
            <button
              type="button"
              className="button button-primary"
              onClick={openNewDriver}
            >
              New Driver
            </button>
          )}

          <button
            type="button"
            className="button button-secondary refresh-button"
            onClick={() => loadDrivers(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
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
            <span className="eyebrow">Driver Directory</span>
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
                placeholder="Name, employee number, fleet, route..."
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

        {loading ? (
          <div className="empty-state">
            <strong>Loading drivers</strong>
            <span>Retrieving personnel records and live operating status.</span>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="empty-state">
            <strong>No drivers found</strong>
            <span>Adjust the search or filters to find a driver.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Vehicle</th>
                  <th>Route</th>
                  <th>Telemetry</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredDrivers.map((currentDriver) => (
                  <tr key={currentDriver.id}>
                    <td>
                      <div className="table-main-text">
                        {currentDriver.name || "Unnamed Driver"}
                      </div>

                      <div className="table-secondary">
                        {currentDriver.employee_number || "No employee number"} · Roblox {currentDriver.roblox_user_id || "—"}
                      </div>
                    </td>

                    <td>
                      <span className={getDriverStatusClass(currentDriver.operationalStatus)}>
                        <span className="status-badge-dot" />
                        {currentDriver.operationalStatus === "ACTIVE" ? "Active" : "Offline"}
                      </span>
                    </td>

                    <td>
                      {currentDriver.current_vehicle ? (
                        <>
                          <div className="table-main-text">
                            {currentDriver.current_vehicle.fleet_number}
                          </div>

                          <div className="table-secondary">
                            {currentDriver.current_vehicle.year} {currentDriver.current_vehicle.make} {currentDriver.current_vehicle.model}
                          </div>
                        </>
                      ) : (
                        <span className="table-muted">Unassigned</span>
                      )}
                    </td>

                    <td>
                      {currentDriver.current_route ? (
                        <>
                          <div className="table-main-text">
                            {currentDriver.current_route.route_code || currentDriver.current_route.name}
                          </div>

                          <div className="table-secondary">
                            {currentDriver.current_route.name}
                          </div>
                        </>
                      ) : (
                        <span className="table-muted">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <span className="table-secondary">
                        {formatRelative(currentDriver.live?.last_ping)}
                      </span>
                    </td>

                    <td className="table-actions">
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => openDriverDetails(currentDriver.id)}
                      >
                        View
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() => deleteDriver(currentDriver)}
                          disabled={deletingId === currentDriver.id}
                        >
                          {deletingId === currentDriver.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
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

function Assignments({ canEdit }) {
  const [assignmentView, setAssignmentView] = useState("list");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endingId, setEndingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formVehicleId, setFormVehicleId] = useState("");
  const [formDriverId, setFormDriverId] = useState("");
  const [formRouteNumber, setFormRouteNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");

  function resetForm() {
    setSelectedAssignmentId(null);
    setFormVehicleId("");
    setFormDriverId("");
    setFormRouteNumber("");
    setFormNotes("");
    setVehicleDropdownOpen(false);
    setDriverDropdownOpen(false);
  }

  function openNewAssignment() {
    if (!canEdit) {
      return;
    }

    resetForm();
    setError("");
    setMessage("");
    setAssignmentView("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditAssignment(assignment) {
    if (!canEdit) {
      return;
    }

    setSelectedAssignmentId(assignment.id);
    setFormVehicleId(assignment.vehicle_id || "");
    setFormDriverId(assignment.driver_id || "");
    setFormRouteNumber(assignment.route_number || "");
    setFormNotes(assignment.notes || "");
    setVehicleDropdownOpen(false);
    setDriverDropdownOpen(false);
    setError("");
    setMessage("");
    setAssignmentView("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToAssignmentList() {
    if (saving || endingId) {
      return;
    }

    resetForm();
    setError("");
    setMessage("");
    setAssignmentView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

    const vehicleMap = new Map(
      (vehicleData || []).map((vehicle) => [vehicle.id, vehicle])
    );

    const driverMap = new Map(
      (driverData || []).map((driver) => [driver.id, driver])
    );

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

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [message]);

  async function saveAssignment() {
    if (!canEdit || saving) {
      return;
    }

    setError("");
    setMessage("");

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

    if (assignmentView === "edit") {
      const existingAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId);

      if (!existingAssignment) {
        setError("The selected assignment could not be found.");
        setSaving(false);
        return;
      }

      const oldVehicleId = existingAssignment.vehicle_id;
      const oldDriverId = existingAssignment.driver_id;

      const { error: assignmentError } = await supabase.from("assignments").update({
        vehicle_id: formVehicleId,
        driver_id: formDriverId,
        route_number: formRouteNumber.trim(),
        notes: formNotes.trim() || null,
      }).eq("id", existingAssignment.id);

      if (assignmentError) {
        setError(assignmentError.message);
        setSaving(false);
        return;
      }

      if (oldVehicleId !== formVehicleId) {
        const { error: oldVehicleError } = await supabase.from("vehicles").update({
          current_driver_id: null,
        }).eq("id", oldVehicleId).eq("current_driver_id", oldDriverId);

        if (oldVehicleError) {
          setError(oldVehicleError.message);
          setSaving(false);
          return;
        }

        const { error: newVehicleError } = await supabase.from("vehicles").update({
          current_driver_id: formDriverId,
        }).eq("id", formVehicleId);

        if (newVehicleError) {
          setError(newVehicleError.message);
          setSaving(false);
          return;
        }
      } else {
        const { error: vehicleError } = await supabase.from("vehicles").update({
          current_driver_id: formDriverId,
        }).eq("id", formVehicleId);

        if (vehicleError) {
          setError(vehicleError.message);
          setSaving(false);
          return;
        }
      }

      if (oldDriverId !== formDriverId) {
        const { error: oldDriverError } = await supabase.from("drivers").update({
          current_vehicle_id: null,
        }).eq("id", oldDriverId).eq("current_vehicle_id", oldVehicleId);

        if (oldDriverError) {
          setError(oldDriverError.message);
          setSaving(false);
          return;
        }
      }

      const { error: driverError } = await supabase.from("drivers").update({
        current_vehicle_id: formVehicleId,
      }).eq("id", formDriverId);

      if (driverError) {
        setError(driverError.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setMessage("Assignment updated successfully.");
      await loadData(false);
      returnToAssignmentList();
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

    setSaving(false);
    setMessage(`${selectedVehicle.fleet_number} was assigned to ${selectedDriver.name || "the selected driver"}.`);
    await loadData(false);
    returnToAssignmentList();
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

  const assignedVehicleIds = new Set(
    activeAssignments.map((assignment) => assignment.vehicle_id)
  );

  const assignedDriverIds = new Set(
    activeAssignments.map((assignment) => assignment.driver_id)
  );

  const availableVehicleCount = vehicles.filter((vehicle) => {
    return !assignedVehicleIds.has(vehicle.id) &&
      String(vehicle.status || "").toUpperCase() !== "OUT_OF_SERVICE" &&
      String(vehicle.status || "").toUpperCase() !== "MAINTENANCE";
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
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || String(assignment.status || "").toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function formatDate(timestamp) {
    if (!timestamp) {
      return "—";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    return date.toLocaleString([], {
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

  const editingAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) || null;

  const availableFormVehicles = vehicles.filter((vehicle) => {
    if (editingAssignment?.vehicle_id === vehicle.id) {
      return true;
    }

    return !assignedVehicleIds.has(vehicle.id) &&
      String(vehicle.status || "").toUpperCase() !== "OUT_OF_SERVICE" &&
      String(vehicle.status || "").toUpperCase() !== "MAINTENANCE";
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

  const selectedFormVehicle = availableFormVehicles.find((vehicle) => vehicle.id === formVehicleId) || vehicles.find((vehicle) => vehicle.id === formVehicleId);
  const selectedFormDriver = availableFormDrivers.find((driver) => driver.id === formDriverId) || drivers.find((driver) => driver.id === formDriverId);

  if (assignmentView === "new" || assignmentView === "edit") {
    const isEditing = assignmentView === "edit";

    return (
      <section className="page-section inspection-page inspection-form-page assignments-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToAssignmentList}
              disabled={saving}
            >
              ← Back to Assignments
            </button>

            <span className="eyebrow">
              Fleet Operations / {isEditing ? "Edit Assignment" : "New Assignment"}
            </span>

            <h1>{isEditing ? "Edit Assignment" : "New Assignment"}</h1>

            <p>
              {isEditing
                ? "Update the vehicle, driver, route, and notes associated with this assignment."
                : "Create a current vehicle and driver assignment."}
            </p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={returnToAssignmentList}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveAssignment}
              disabled={saving || !canEdit}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Assign Vehicle"}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Assignment Setup</span>
              <h3>Assignment Information</h3>
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
                    setDriverDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>
                    {selectedFormVehicle
                      ? `${selectedFormVehicle.fleet_number} — ${selectedFormVehicle.year || ""} ${selectedFormVehicle.make || ""} ${selectedFormVehicle.model || ""}`.trim()
                      : "Select vehicle"}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {vehicleDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${!formVehicleId ? "selected" : ""}`}
                      onClick={() => {
                        setFormVehicleId("");
                        setVehicleDropdownOpen(false);
                      }}
                    >
                      Select vehicle
                    </button>

                    {availableFormVehicles.map((currentVehicle) => (
                      <button
                        type="button"
                        key={currentVehicle.id}
                        className={`custom-select-option ${formVehicleId === currentVehicle.id ? "selected" : ""}`}
                        onClick={() => {
                          setFormVehicleId(currentVehicle.id);
                          setVehicleDropdownOpen(false);
                          setError("");
                        }}
                      >
                        {currentVehicle.fleet_number} — {currentVehicle.year || ""} {currentVehicle.make || ""} {currentVehicle.model || ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="select-control">
              <span>Driver</span>

              <div className="custom-select">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => {
                    setDriverDropdownOpen((open) => !open);
                    setVehicleDropdownOpen(false);
                  }}
                  disabled={saving}
                >
                  <span>
                    {selectedFormDriver
                      ? `${selectedFormDriver.name}${selectedFormDriver.employee_number ? ` — ${selectedFormDriver.employee_number}` : ""}`
                      : "Select driver"}
                  </span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {driverDropdownOpen && (
                  <div className="custom-select-menu">
                    <button
                      type="button"
                      className={`custom-select-option ${!formDriverId ? "selected" : ""}`}
                      onClick={() => {
                        setFormDriverId("");
                        setDriverDropdownOpen(false);
                      }}
                    >
                      Select driver
                    </button>

                    {availableFormDrivers.map((currentDriver) => (
                      <button
                        type="button"
                        key={currentDriver.id}
                        className={`custom-select-option ${formDriverId === currentDriver.id ? "selected" : ""}`}
                        onClick={() => {
                          setFormDriverId(currentDriver.id);
                          setDriverDropdownOpen(false);
                          setError("");
                        }}
                      >
                        {currentDriver.name}
                        {currentDriver.employee_number ? ` — ${currentDriver.employee_number}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="form-field">
              <span>Route Number</span>

              <input
                type="text"
                value={formRouteNumber}
                onChange={(event) => setFormRouteNumber(event.target.value)}
                placeholder="e.g. 16"
                disabled={saving}
              />
            </label>
          </div>
        </div>

        <div className="inspection-notes-section">
          <div className="inspection-notes-header">
            <div>
              <span className="eyebrow">Assignment Record</span>
              <h3>Notes</h3>
            </div>
          </div>

          <div className="inspection-notes-content inspection-notes-editor">
            <textarea
              value={formNotes}
              onChange={(event) => setFormNotes(event.target.value)}
              placeholder="Enter assignment notes..."
              rows="6"
              disabled={saving}
            />
          </div>
        </div>

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToAssignmentList}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={saveAssignment}
            disabled={saving || !canEdit}
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Assign Vehicle"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section assignments-page inspection-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Fleet Operations / Assignments</span>
          <h1>Assignments</h1>
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
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
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

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Current Assignments</span>
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
                placeholder="Fleet, driver, route, notes..."
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

        {loading ? (
          <div className="empty-state">
            <strong>Loading assignments</strong>
            <span>Retrieving current vehicle and driver assignments.</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="empty-state">
            <strong>No active assignments found</strong>
            <span>Adjust the search or create a new assignment.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <div className="table-main-text">
                        {assignment.vehicle?.fleet_number || "Unknown"}
                      </div>

                      <div className="table-secondary">
                        {assignment.vehicle
                          ? `${assignment.vehicle.year || ""} ${assignment.vehicle.make || ""} ${assignment.vehicle.model || ""}`.trim()
                          : "Vehicle unavailable"}
                      </div>
                    </td>

                    <td>
                      <div className="table-main-text">
                        {assignment.driver?.name || "Unknown Driver"}
                      </div>

                      <div className="table-secondary">
                        {assignment.driver?.employee_number || "No employee number"}
                      </div>
                    </td>

                    <td>
                      <div className="table-main-text">
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

                    <td className="table-actions">
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
                    </td>
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
            <span className="eyebrow">Assignment History</span>
            <h3>Completed Assignments</h3>
          </div>

          <span className="panel-count">
            {historyAssignments.length}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Loading assignment history</strong>
            <span>Retrieving completed assignment records.</span>
          </div>
        ) : historyAssignments.length === 0 ? (
          <div className="empty-state">
            <strong>No completed assignments</strong>
            <span>Completed assignments will appear here.</span>
          </div>
        ) : (
          <div className="table-container">
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
                {historyAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <div className="table-main-text">
                        {assignment.vehicle?.fleet_number || "Unknown"}
                      </div>

                      <div className="table-secondary">
                        {assignment.vehicle?.garage || "Unknown garage"}
                      </div>
                    </td>

                    <td>
                      <div className="table-main-text">
                        {assignment.driver?.name || "Unknown Driver"}
                      </div>

                      <div className="table-secondary">
                        {assignment.driver?.employee_number || "No employee number"}
                      </div>
                    </td>

                    <td>
                      <div className="table-main-text">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Routes({ canEdit }) {
  const [routeView, setRouteView] = useState("list");
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [routePointCounts, setRoutePointCounts] = useState({});
  const [routeUsage, setRouteUsage] = useState({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formRouteCode, setFormRouteCode] = useState("");
  const [formRouteName, setFormRouteName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [editingRoute, setEditingRoute] = useState(null);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [allRoutesOpen, setAllRoutesOpen] = useState(false);

  function resetForm() {
    setSelectedRouteId(null);
    setFormRouteCode("");
    setFormRouteName("");
    setFormDescription("");
  }

  function openNewRoute() {
    if (!canEdit) {
      return;
    }

    resetForm();
    setError("");
    setMessage("");
    setRouteView("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditRoute(route) {
    if (!canEdit) {
      return;
    }

    setSelectedRouteId(route.id);
    setFormRouteCode(route.route_code || "");
    setFormRouteName(route.name || "");
    setFormDescription(route.description || "");
    setError("");
    setMessage("");
    setRouteView("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToRouteList() {
    if (saving || deletingRouteId) {
      return;
    }

    resetForm();
    setError("");
    setMessage("");
    setRouteView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadData(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data: routeData, error: routeError } = await supabase.from("routes").select(`
      id,
      route_code,
      name,
      description,
      status,
      created_at,
      updated_at
    `).order("route_code", { ascending: true });

    if (routeError) {
      setError(routeError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const { data: pointData, error: pointError } = await supabase.from("route_points").select(`
      route_id,
      sequence
    `).order("sequence", { ascending: true });

    if (pointError) {
      setError(pointError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const { data: assignmentData, error: assignmentError } = await supabase.from("assignments").select(`
      route_number,
      status
    `);

    if (assignmentError) {
      setError(assignmentError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const pointCounts = {};

    (pointData || []).forEach((point) => {
      pointCounts[point.route_id] = (pointCounts[point.route_id] || 0) + 1;
    });

    const usageCounts = {};

    (assignmentData || []).forEach((assignment) => {
      const routeNumber = String(assignment.route_number || "").trim();

      if (!routeNumber) {
        return;
      }

      if (!usageCounts[routeNumber]) {
        usageCounts[routeNumber] = {
          total: 0,
          active: 0,
        };
      }

      usageCounts[routeNumber].total += 1;

      if (String(assignment.status || "").toUpperCase() === "ACTIVE") {
        usageCounts[routeNumber].active += 1;
      }
    });

    setRoutes(routeData || []);
    setRoutePointCounts(pointCounts);
    setRouteUsage(usageCounts);
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

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [message]);

  async function saveRoute() {
    if (!canEdit || saving) {
      return;
    }

    setError("");
    setMessage("");

    if (!formRouteCode.trim() || !formRouteName.trim()) {
      setError("Route code and route name are required.");
      return;
    }

    setSaving(true);

    if (routeView === "edit") {
      const existingRoute = routes.find((route) => route.id === selectedRouteId);

      if (!existingRoute) {
        setError("The selected route could not be found.");
        setSaving(false);
        return;
      }

      const { error: routeError } = await supabase.from("routes").update({
        route_code: formRouteCode.trim(),
        name: formRouteName.trim(),
        description: formDescription.trim() || null,
      }).eq("id", existingRoute.id);

      if (routeError) {
        setError(routeError.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setMessage(`${formRouteCode.trim()} was updated successfully.`);
      await loadData(false);
      returnToRouteList();
      return;
    }

    const { data: createdRoute, error: routeError } = await supabase.from("routes").insert({
      route_code: formRouteCode.trim(),
      name: formRouteName.trim(),
      description: formDescription.trim() || null,
      status: "ACTIVE",
    }).select("id").single();

    if (routeError) {
      setError(routeError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setMessage(`${formRouteCode.trim()} was created successfully.`);
    await loadData(false);

    if (createdRoute?.id) {
      setSelectedRouteId(createdRoute.id);
    }

    returnToRouteList();
  }

  async function duplicateRoute(route) {
    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const baseCode = String(route.route_code || "ROUTE").trim();
    let duplicateCode = `${baseCode}-COPY`;
    let suffix = 2;

    while (routes.some((currentRoute) => String(currentRoute.route_code || "").toUpperCase() === duplicateCode.toUpperCase())) {
      duplicateCode = `${baseCode}-COPY-${suffix}`;
      suffix += 1;
    }

    const { data: duplicatedRoute, error: routeError } = await supabase.from("routes").insert({
      route_code: duplicateCode,
      name: `${route.name || "Route"} Copy`,
      description: route.description || null,
      status: route.status || "ACTIVE",
    }).select("id").single();

    if (routeError) {
      setError(routeError.message);
      setSaving(false);
      return;
    }

    const { data: sourcePoints, error: pointError } = await supabase.from("route_points").select(`
      sequence,
      x,
      y,
      z,
      point_type
    `).eq("route_id", route.id).order("sequence", { ascending: true });

    if (pointError) {
      setError(pointError.message);
      setSaving(false);
      return;
    }

    if (duplicatedRoute?.id && sourcePoints?.length) {
      const copiedPoints = sourcePoints.map((point, index) => ({
        route_id: duplicatedRoute.id,
        sequence: index + 1,
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
        z: Number(point.z) || 0,
        point_type: point.point_type || "STRAIGHT",
      }));

      const { error: insertPointError } = await supabase.from("route_points").insert(copiedPoints);

      if (insertPointError) {
        setError(insertPointError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setMessage(`${duplicateCode} was created as a duplicate.`);
    await loadData(false);
  }

  async function deleteRoute(route) {
    if (!canEdit || deletingRouteId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete route ${route.route_code || route.name || "Unknown"}?\n\nThis will permanently remove the route record and all of its route points.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingRouteId(route.id);
    setError("");
    setMessage("");

    const { error: pointError } = await supabase.from("route_points").delete().eq("route_id", route.id);

    if (pointError) {
      setError(pointError.message);
      setDeletingRouteId(null);
      return;
    }

    const { error: routeError } = await supabase.from("routes").delete().eq("id", route.id);

    if (routeError) {
      setError(routeError.message);
      setDeletingRouteId(null);
      return;
    }

    setMessage(`${route.route_code || route.name || "Route"} was deleted.`);
    setDeletingRouteId(null);
    await loadData(false);
  }

  function openRouteEditor(route) {
    setEditingRoute(route);
  }

  function openRoutePreview(route) {
    setPreviewRoute(route);
  }

  function handleRouteSaved() {
    setEditingRoute(null);
    setMessage("Route geometry saved successfully.");
    loadData(false);
  }

  const filteredRoutes = routes.filter((route) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || [
      route.route_code,
      route.name,
      route.description,
      route.status,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const normalizedStatus = String(route.status || "").toUpperCase();

    const matchesStatus = statusFilter === "ALL" || normalizedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeRoutes = routes.filter((route) => {
    return String(route.status || "").toUpperCase() === "ACTIVE";
  });

  const inactiveRoutes = routes.filter((route) => {
    return String(route.status || "").toUpperCase() !== "ACTIVE";
  });

  const routesWithGeometry = routes.filter((route) => {
    return Number(routePointCounts[route.id] || 0) > 0;
  });

  const routesInUse = routes.filter((route) => {
    const code = String(route.route_code || "").trim();

    if (!code) {
      return false;
    }

    return Number(routeUsage[code]?.active || 0) > 0;
  });

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;

  function getRouteUsage(route) {
    const routeCode = String(route.route_code || "").trim();

    return routeUsage[routeCode] || {
      total: 0,
      active: 0,
    };
  }

  function formatDate(timestamp) {
    if (!timestamp) {
      return "—";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (routeView === "new" || routeView === "edit") {
    const isEditing = routeView === "edit";

    return (
      <section className="page-section inspection-page inspection-form-page routes-page">
        <div className="page-intro">
          <div className="page-intro-copy">
            <button
              type="button"
              className="button button-secondary button-small inspection-back-button"
              onClick={returnToRouteList}
              disabled={saving}
            >
              ← Back to Routes
            </button>

            <span className="eyebrow">
              Route Operations / {isEditing ? "Edit Route" : "New Route"}
            </span>

            <h1>{isEditing ? "Edit Route" : "New Route"}</h1>

            <p>
              {isEditing
                ? "Update the route record and maintain its operational information."
                : "Create a route record before adding or editing route geometry."}
            </p>
          </div>

          <div className="page-intro-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={returnToRouteList}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveRoute}
              disabled={saving || !canEdit}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Route"}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="panel inspection-selection-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Route Setup</span>
              <h3>Route Information</h3>
            </div>
          </div>

          <div className="inspection-setup-grid form-grid form-grid-three">
            <label className="form-field">
              <span>Route Code</span>

              <input
                type="text"
                value={formRouteCode}
                onChange={(event) => setFormRouteCode(event.target.value)}
                placeholder="e.g. 16-A1"
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Route Name</span>

              <input
                type="text"
                value={formRouteName}
                onChange={(event) => setFormRouteName(event.target.value)}
                placeholder="e.g. North Elementary AM"
                disabled={saving}
              />
            </label>

            <div className="form-field">
              <span>Status</span>

              <div className="form-static-value">
                <StatusBadge status={isEditing ? selectedRoute?.status : "ACTIVE"} />
              </div>
            </div>
          </div>

          <div
            className="inspection-notes-content inspection-notes-editor route-information-description"
            style={{ padding: "20px", boxSizing: "border-box", }}
          >
            <label
              className="form-field"
              style={{ width: "100%", margin: 0, }}
            >
              <span>Description</span>

              <textarea
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder="Enter route description or operational notes..."
                rows="6"
                disabled={saving}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>
        </div>

        <div className="inspection-page-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={returnToRouteList}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={saveRoute}
            disabled={saving || !canEdit}
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Route"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section routes-page inspection-page">
      <div className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Route Operations / Routes</span>
          <h1>Routes</h1>
          <p>Manage route records, route geometry, and route utilization.</p>
        </div>

        <div className="page-intro-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setAllRoutesOpen(true)}
            disabled={!routes.length}
          >
            View All Routes
          </button>

          {canEdit && (
            <button
              type="button"
              className="button button-primary"
              onClick={openNewRoute}
            >
              New Route
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
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="dashboard-kpi-grid assignment-stat-grid">
        <DashboardKpi
          label="Total Routes"
          value={routes.length}
          detail="Route records"
          icon="fleet"
        />

        <DashboardKpi
          label="Active Routes"
          value={activeRoutes.length}
          detail="Currently operational"
          icon="active"
        />

        <DashboardKpi
          label="With Geometry"
          value={routesWithGeometry.length}
          detail="Routes with saved points"
          icon="available"
        />

        <DashboardKpi
          label="In Use"
          value={routesInUse.length}
          detail="Currently assigned"
          icon="assigned"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Route Registry</span>
            <h3>Route Directory</h3>
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
                placeholder="Route code, name, description..."
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
                    }[statusFilter] || "All statuses"}
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
            <strong>Loading routes</strong>
            <span>Retrieving route records and geometry information.</span>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="empty-state">
            <strong>No routes found</strong>
            <span>Adjust the search or status filter, or create a new route.</span>

            {canEdit && routes.length === 0 && (
              <button
                type="button"
                className="button button-primary"
                onClick={openNewRoute}
              >
                New Route
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Name</th>
                  <th>Geometry</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredRoutes.map((route) => {
                  const usage = getRouteUsage(route);
                  const pointCount = routePointCounts[route.id] || 0;

                  return (
                    <tr key={route.id}>
                      <td>
                        <div className="table-main-text">
                          {route.route_code || "—"}
                        </div>
                      </td>

                      <td>
                        <div className="table-main-text">
                          {route.name || "Unnamed Route"}
                        </div>

                        {route.description && (
                          <div className="table-secondary">
                            {route.description}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="table-main-text">
                          {pointCount} point{pointCount === 1 ? "" : "s"}
                        </div>

                        <div className="table-secondary">
                          {pointCount > 0 ? "Geometry configured" : "No geometry"}
                        </div>
                      </td>

                      <td>
                        <div className="table-main-text">
                          {usage.active} active
                        </div>

                        <div className="table-secondary">
                          {usage.total} total assignment{usage.total === 1 ? "" : "s"}
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={route.status} />
                      </td>

                      <td>
                        <span className="table-secondary">
                          {formatDate(route.updated_at || route.created_at)}
                        </span>
                      </td>

                      <td className="table-actions">
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => openRoutePreview(route)}
                        >
                          Preview
                        </button>

                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => openRouteEditor(route)}
                            >
                              Edit Route
                            </button>

                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => openEditRoute(route)}
                            >
                              Edit Details
                            </button>

                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => duplicateRoute(route)}
                              disabled={saving}
                            >
                              Duplicate
                            </button>

                            <button
                              type="button"
                              className="button button-danger button-small"
                              onClick={() => deleteRoute(route)}
                              disabled={deletingRouteId === route.id}
                            >
                              {deletingRouteId === route.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRoute && (
        <RouteEditor
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSaved={handleRouteSaved}
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
      description: "Live fleet refresh and vehicle visibility.",
    },
    {
      label: "Dashboard",
      description: "Control dashboard feed sizes and information density.",
    },
    {
      label: "Alerts",
      description: "Control which operational conditions are flagged.",
    },
    {
      label: "Interface",
      description: "Configure layout density and startup behavior.",
    },
    {
      label: "Account",
      description: "Manage authentication and the current session.",
    },
    {
      label: "System",
      description: "Review application state and permissions.",
    },
  ];

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

  function updatePreference(key, value) {
    if (!canEdit) {
      return;
    }

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    setSaveMessage("Saved");

    window.clearTimeout(window.__clinoSettingsMessageTimeout);

    window.__clinoSettingsMessageTimeout = window.setTimeout(() => {
      setSaveMessage("");
    }, 1800);
  }

  function resetPreferences() {
    if (!canEdit) {
      return;
    }

    setPreferences(defaults);
    setSaveMessage("Defaults restored");

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

  const accountEmail = session?.user?.email || "Unknown";
  const accountName = accountEmail.split("@")[0] || "User";
  const roleLabel = role === "admin"
    ? "Administrator"
    : role === "viewer"
      ? "Viewer"
      : role || "Unknown";

  function renderToggle({ label, description, value, preferenceKey }) {
    return (
      <div className="settings-control-row">
        <div className="settings-control-copy">
          <strong>{label}</strong>
          <span>{description}</span>
        </div>

        <button
          type="button"
          className={`settings-toggle ${value ? "active" : ""}`}
          onClick={() => updatePreference(preferenceKey, !value)}
          disabled={!canEdit}
          aria-pressed={value}
        >
          <span />
          <strong>{value ? "On" : "Off"}</strong>
        </button>
      </div>
    );
  }

  function renderOperations() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">LIVE OPERATIONS</span>
          <h2>Fleet behavior</h2>
          <p>
            These settings control how frequently the dashboard and live fleet
            views retrieve fresh information and how vehicles are presented.
          </p>
        </div>

        <div className="settings-card-grid">
          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">DATA REFRESH</span>
                <h3>Fleet data</h3>
                <p>Control application polling intervals.</p>
              </div>
            </div>

            <div className="settings-controls">
              <SettingsSelect
                label="Dashboard refresh interval"
                description="How often the dashboard requests fresh fleet and operational data."
                value={preferences.telemetryInterval}
                options={[
                  ["5", "5 seconds"],
                  ["10", "10 seconds"],
                  ["15", "15 seconds"],
                  ["30", "30 seconds"],
                  ["60", "60 seconds"],
                ]}
                onChange={(value) => updatePreference("telemetryInterval", Number(value))}
                disabled={!canEdit}
              />

              <SettingsSelect
                label="Live fleet refresh interval"
                description="How often the Live Fleet page retrieves updated vehicle telemetry."
                value={preferences.mapRefresh}
                options={[
                  ["5", "5 seconds"],
                  ["10", "10 seconds"],
                  ["15", "15 seconds"],
                  ["30", "30 seconds"],
                  ["60", "60 seconds"],
                ]}
                onChange={(value) => updatePreference("mapRefresh", Number(value))}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">VEHICLE DISPLAY</span>
                <h3>Live fleet visibility</h3>
                <p>Control what appears in live fleet views.</p>
              </div>
            </div>

            <div className="settings-controls">
              {renderToggle({
                label: "Show offline vehicles",
                description: "Keep vehicles with no current live connection in the fleet list.",
                value: Boolean(preferences.showOffline),
                preferenceKey: "showOffline",
              })}

              {renderToggle({
                label: "Show stale telemetry",
                description: "Keep vehicles with delayed telemetry visible in live fleet views.",
                value: Boolean(preferences.showStale),
                preferenceKey: "showStale",
              })}

              {renderToggle({
                label: "Vehicle labels",
                description: "Display fleet numbers directly on vehicle markers.",
                value: Boolean(preferences.vehicleLabels),
                preferenceKey: "vehicleLabels",
              })}

              {renderToggle({
                label: "Automatically follow vehicle",
                description: "Center the map on the selected vehicle whenever the selection changes.",
                value: Boolean(preferences.autoFollowVehicle),
                preferenceKey: "autoFollowVehicle",
              })}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">DASHBOARD</span>
          <h2>Dashboard display</h2>
          <p>
            Control how much recent operational information the dashboard retrieves
            and displays.
          </p>
        </div>

        <div className="settings-card-grid">
          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">RECENT ACTIVITY</span>
                <h3>Activity feed</h3>
                <p>Set the amount of recent activity shown on the dashboard.</p>
              </div>
            </div>

            <div className="settings-controls">
              <SettingsSelect
                label="Activity entries"
                description="Maximum number of recent fleet events retrieved and displayed."
                value={preferences.activityCount}
                options={[
                  ["5", "5 entries"],
                  ["8", "8 entries"],
                  ["10", "10 entries"],
                  ["15", "15 entries"],
                  ["20", "20 entries"],
                ]}
                onChange={(value) => updatePreference("activityCount", Number(value))}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">SERVICE QUEUE</span>
                <h3>Maintenance feed</h3>
                <p>Set the amount of maintenance work shown on the dashboard.</p>
              </div>
            </div>

            <div className="settings-controls">
              <SettingsSelect
                label="Maintenance entries"
                description="Maximum number of maintenance records retrieved and displayed."
                value={preferences.maintenanceCount}
                options={[
                  ["5", "5 entries"],
                  ["8", "8 entries"],
                  ["10", "10 entries"],
                  ["15", "15 entries"],
                  ["20", "20 entries"],
                ]}
                onChange={(value) => updatePreference("maintenanceCount", Number(value))}
                disabled={!canEdit}
              />
            </div>
          </section>
        </div>

        <section className="panel settings-summary-card">
          <div className="settings-card-header">
            <div>
              <span className="panel-kicker">CURRENT PROFILE</span>
              <h3>Dashboard configuration</h3>
            </div>
          </div>

          <div className="settings-summary-grid">
            <div>
              <span>Refresh interval</span>
              <strong>{preferences.telemetryInterval}s</strong>
            </div>

            <div>
              <span>Activity feed</span>
              <strong>{preferences.activityCount} entries</strong>
            </div>

            <div>
              <span>Maintenance feed</span>
              <strong>{preferences.maintenanceCount} entries</strong>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderAlerts() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">ALERTS</span>
          <h2>Operational alerts</h2>
          <p>
            Choose which operational conditions are surfaced in the dashboard's
            Attention Required panel.
          </p>
        </div>

        <section className="panel settings-card">
          <div className="settings-card-header">
            <div>
              <span className="panel-kicker">WARNING VISIBILITY</span>
              <h3>Alert sources</h3>
              <p>Disabled alert types are removed from the dashboard attention queue.</p>
            </div>
          </div>

          <div className="settings-controls">
            {renderToggle({
              label: "Maintenance warnings",
              description: "Flag overdue maintenance records requiring operational attention.",
              value: Boolean(preferences.maintenanceWarnings),
              preferenceKey: "maintenanceWarnings",
            })}

            {renderToggle({
              label: "Inspection warnings",
              description: "Flag failed vehicle inspections requiring review.",
              value: Boolean(preferences.inspectionWarnings),
              preferenceKey: "inspectionWarnings",
            })}

            {renderToggle({
              label: "Offline vehicle warnings",
              description: "Flag vehicles that are currently not reporting telemetry.",
              value: Boolean(preferences.offlineWarnings),
              preferenceKey: "offlineWarnings",
            })}
          </div>
        </section>
      </div>
    );
  }

  function renderInterface() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">INTERFACE</span>
          <h2>Interface behavior</h2>
          <p>
            Control the amount of information shown and the section used as your
            startup destination.
          </p>
        </div>

        <div className="settings-card-grid">
          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">LAYOUT</span>
                <h3>Content density</h3>
                <p>Change spacing throughout the application.</p>
              </div>
            </div>

            <div className="settings-controls">
              <SettingsSelect
                label="Density"
                description="Comfortable provides more spacing. Compact reduces spacing in tables and operational panels."
                value={preferences.density}
                options={[
                  ["comfortable", "Comfortable"],
                  ["compact", "Compact"],
                ]}
                onChange={(value) => updatePreference("density", value)}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">STARTUP</span>
                <h3>Default section</h3>
                <p>Choose the section opened when the application starts.</p>
              </div>
            </div>

            <div className="settings-controls">
              <SettingsSelect
                label="Startup destination"
                description="This preference is used the next time the application is loaded."
                value={preferences.defaultSection}
                options={[
                  ["Dashboard", "Dashboard"],
                  ["Live Fleet", "Live Fleet"],
                  ["Vehicles", "Vehicles"],
                  ["Drivers", "Drivers"],
                  ["Assignments", "Assignments"],
                  ["Routes", "Routes"],
                  ["Maintenance", "Maintenance"],
                  ["Inspections", "Inspections"],
                  ["Audits", "Audits"],
                  ["Settings", "Settings"],
                ]}
                onChange={(value) => updatePreference("defaultSection", value)}
                disabled={!canEdit}
              />

              <div className="settings-inline-action">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setPage(preferences.defaultSection)}
                >
                  Open {preferences.defaultSection}
                </button>
              </div>
            </div>
          </section>
        </div>

        {canEdit && (
          <section className="panel settings-reset-card">
            <div>
              <span className="panel-kicker">LOCAL PREFERENCES</span>
              <h3>Reset settings</h3>
              <p>
                Restore all application preferences to their original defaults.
                Fleet records and database information are not affected.
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={resetPreferences}
            >
              Reset to defaults
            </button>
          </section>
        )}
      </div>
    );
  }

  function renderAccount() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">ACCOUNT</span>
          <h2>Account security</h2>
          <p>
            Review the signed-in account and manage its authentication settings.
          </p>
        </div>

        <div className="settings-card-grid">
          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">IDENTITY</span>
                <h3>Current account</h3>
              </div>
            </div>

            <div className="settings-account">
              <div className="account-avatar large">
                {accountEmail.charAt(0).toUpperCase()}
              </div>

              <div className="settings-account-copy">
                <strong>{accountName}</strong>
                <span>{accountEmail}</span>
                <small>{roleLabel}</small>
              </div>
            </div>

            <div className="settings-summary-grid">
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

          <section className="panel settings-card">
            <div className="settings-card-header">
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
                  onChange={(event) => setPasswordForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))}
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
                  onChange={(event) => setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  disabled={!canEdit || passwordBusy}
                />
              </label>

              {passwordError && (
                <div className="form-alert form-alert-error">
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordMessage && (
                <div className="form-alert form-alert-success">
                  <span>{passwordMessage}</span>
                </div>
              )}

              {canEdit && (
                <div className="settings-form-actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={passwordBusy}
                  >
                    {passwordBusy ? "Updating..." : "Update password"}
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>

        <section className="panel settings-danger-card">
          <div>
            <span className="panel-kicker">SESSION</span>
            <h3>Sign out</h3>
            <p>End the current authentication session on this device.</p>
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={signOut}
          >
            Sign out
          </button>
        </section>
      </div>
    );
  }

  function renderSystem() {
    return (
      <div className="settings-section-content">
        <div className="settings-section-intro">
          <span className="eyebrow">SYSTEM</span>
          <h2>System status</h2>
          <p>
            Review the application environment, active preferences, and current
            account permissions.
          </p>
        </div>

        <div className="settings-card-grid">
          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">APPLICATION</span>
                <h3>Clino Fleet Tracker</h3>
              </div>

              <span className="status-badge status-active">
                Operational
              </span>
            </div>

            <div className="settings-summary-grid settings-system-grid">
              <div>
                <span>Environment</span>
                <strong>Private Operations</strong>
              </div>

              <div>
                <span>Dashboard refresh</span>
                <strong>{preferences.telemetryInterval}s</strong>
              </div>

              <div>
                <span>Live fleet refresh</span>
                <strong>{preferences.mapRefresh}s</strong>
              </div>

              <div>
                <span>Density</span>
                <strong>
                  {preferences.density === "compact" ? "Compact" : "Comfortable"}
                </strong>
              </div>

              <div>
                <span>Default section</span>
                <strong>{preferences.defaultSection}</strong>
              </div>

              <div>
                <span>Account</span>
                <strong>{roleLabel}</strong>
              </div>
            </div>
          </section>

          <section className="panel settings-card">
            <div className="settings-card-header">
              <div>
                <span className="panel-kicker">ACCESS</span>
                <h3>Permissions</h3>
              </div>
            </div>

            <div className="settings-permission-list">
              <div className="settings-permission-row">
                <div>
                  <strong>View fleet data</strong>
                  <span>Fleet, drivers, routes, assignments, service, and telemetry.</span>
                </div>

                <span className="status-badge status-active">Allowed</span>
              </div>

              <div className="settings-permission-row">
                <div>
                  <strong>Modify fleet records</strong>
                  <span>Create and update records according to your assigned role.</span>
                </div>

                <span className={`status-badge ${canEdit ? "status-active" : "status-neutral"}`}>
                  {canEdit ? "Allowed" : "Read only"}
                </span>
              </div>

              <div className="settings-permission-row">
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
    <section className="page-section settings-page">
      <div className="page-intro settings-page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">SYSTEM CONFIGURATION</span>
          <h1>Settings</h1>
          <p>
            Configure live fleet behavior, dashboard display, alerts, interface
            preferences, and account security.
          </p>
        </div>

        <div className="page-intro-actions">
          {saveMessage && (
            <span className="save-indicator">
              {saveMessage}
            </span>
          )}

          <span className={`status-badge ${canEdit ? "status-active" : "status-neutral"}`}>
            {canEdit ? "Editing enabled" : "Read only"}
          </span>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="panel settings-sidebar">
          <div className="settings-sidebar-heading">
            <span className="panel-kicker">SETTINGS</span>
            <strong>Configuration</strong>
          </div>

          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                type="button"
                key={section.label}
                className={`settings-nav-button ${activeSection === section.label ? "active" : ""}`}
                onClick={() => setActiveSection(section.label)}
              >
                <span>{section.label}</span>
                <small>{section.description}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content">
          {activeSection === "Operations" && renderOperations()}
          {activeSection === "Dashboard" && renderDashboard()}
          {activeSection === "Alerts" && renderAlerts()}
          {activeSection === "Interface" && renderInterface()}
          {activeSection === "Account" && renderAccount()}
          {activeSection === "System" && renderSystem()}
        </main>
      </div>
    </section>
  );
}

function SettingsSelect({ label, description, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(
    ([optionValue]) => String(optionValue) === String(value)
  );

  const selectedLabel = selectedOption?.[1] || String(value);

  return (
    <div className="settings-control-row">
      <div className="settings-control-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <div className="settings-control-input">
        <div className={`custom-select ${open ? "open" : ""}`}>
          <button
            type="button"
            className="custom-select-trigger"
            onClick={() => {
              if (!disabled) {
                setOpen((current) => !current);
              }
            }}
            disabled={disabled}
            aria-expanded={open}
          >
            <span>{selectedLabel}</span>

            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="custom-select-menu">
              {options.map(([optionValue, optionLabel]) => (
                <button
                  key={optionValue}
                  type="button"
                  className={`custom-select-option ${String(value) === String(optionValue) ? "selected" : ""}`}
                  onClick={() => {
                    onChange(optionValue);
                    setOpen(false);
                  }}
                >
                  {optionLabel}
                </button>
              ))}
            </div>
          )}
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

export default App;