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
    try {
      const saved = localStorage.getItem("clino-preferences");

      return saved
        ? {
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
          ...JSON.parse(saved),
        }
        : {
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
    } catch {
      return {
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
    }
  });

  const canEdit = role !== "viewer";

  async function loadUserRole(currentSession) {
    if (!currentSession?.user?.id) {
      setRole(null);
      return;
    }

    const {
      data,
      error,
    } = await supabase.from("user_roles").select("role").eq("user_id", currentSession.user.id).single();

    if (error) {
      console.error("Failed to load user role:", error);
      setRole(null);
      return;
    }

    setRole(data?.role || null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);

      if (data.session) {
        await loadUserRole(data.session);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) {
        return;
      }

      setSession(newSession);

      if (newSession) {
        await loadUserRole(newSession);
      } else {
        setRole(null);
      }

      setLoading(false);
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

  function navigate(nextPage) {
    setPage(nextPage);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-brand">
          <div className="brand-mark">72</div>
          <div>
            <strong>CLINO</strong>
            <span>TRANSPORTATION</span>
          </div>
        </div>
        <div className="loading-indicator" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!role) {
    return (
      <div className="loading-screen">
        <div className="panel loading-error">
          <strong>Unable to load account permissions.</strong>
          <span>Contact an administrator if this continues.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
      <Sidebar
        page={page}
        setPage={navigate}
        role={role}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />

      {mobileNavOpen && <button className="mobile-nav-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <span />
              <span />
              <span />
            </button>

            <div className="page-heading">
              <div className="eyebrow">CLINO TRANSPORTATION / FLEET OPERATIONS</div>
              <h1>{page}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="connection-indicator">
              <span className="connection-dot" />
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

            <button className="secondary-button topbar-signout" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <div className="content">
          {page === "Dashboard" && <Dashboard preferences={preferences} setPage={navigate} />}
          {page === "Live Fleet" && <LiveFleet canEdit={canEdit} preferences={preferences} />}
          {page === "Vehicles" && <Vehicles canEdit={canEdit} />}
          {page === "Drivers" && <Drivers canEdit={canEdit} />}
          {page === "Assignments" && <Assignments canEdit={canEdit} />}
          {page === "Routes" && <Routes canEdit={canEdit} />}
          {page === "Maintenance" && <Maintenance canEdit={canEdit} />}
          {page === "Audits" && <Audits />}
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

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const {
      data: UserData,
      error: UserError,
    } = await supabase.rpc("get_login_email", {
      p_username: username.trim(),
    });

    if (UserError || !UserData) {
      setError("Invalid username or password.");
      setBusy(false);
      return;
    }

    const { error: AuthError } = await supabase.auth.signInWithPassword({
      email: UserData,
      password,
    });

    if (AuthError) {
      setError("Invalid username or password.");
    }

    setBusy(false);
  }

  return (
    <div className="login-screen">
      <div className="login-visual">
        <div className="login-visual-grid" />
        <div className="login-brand">
          <div className="brand-mark large">72</div>
          <div>
            <strong>CLINO</strong>
            <span>TRANSPORTATION</span>
          </div>
        </div>

        <div className="login-visual-copy">
          <div className="eyebrow">FLEET OPERATIONS</div>
          <h2>Transportation operations, centralized.</h2>
          <p>Monitor vehicles, drivers, assignments, routes, service, inspections, and live fleet activity from one private system.</p>
        </div>

        <div className="login-visual-footer">
          <span>PRIVATE OPERATIONS SYSTEM</span>
          <span>CLINO TRANSPORTATION</span>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={signIn}>
          <div className="login-mobile-brand">
            <div className="brand-mark">72</div>
            <div>
              <strong>CLINO</strong>
              <span>TRANSPORTATION</span>
            </div>
          </div>

          <div className="eyebrow">PRIVATE SYSTEM</div>
          <h1>Sign in</h1>
          <p className="login-subtitle">Enter your fleet operations credentials to continue.</p>

          <div className="form-stack">
            <label>
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter username"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                required
              />
            </label>
          </div>

          {error && <div className="error login-error">{error}</div>}

          <button type="submit" className="primary-button login-submit" disabled={busy}>
            {busy ? "Authenticating..." : "Sign in"}
            {!busy && <span>→</span>}
          </button>

          <div className="login-security-note">
            <span className="security-lock">⌑</span>
            <div>
              <strong>Authorized personnel only</strong>
              <span>This system contains private fleet operations data.</span>
            </div>
          </div>
        </form>
      </div>
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

  return (
    <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-mark">72</div>
          <div className="brand-wordmark">
            <strong>CLINO</strong>
            <span>TRANSPORTATION</span>
          </div>
        </div>

        <button className="sidebar-close-button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
          ×
        </button>
      </div>

      <div className="sidebar-system">
        <span className="sidebar-system-dot" />
        <div>
          <strong>Fleet Operations</strong>
          <span>Private system</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div className="nav-section" key={section.label}>
            <div className="nav-section-label">{section.label}</div>

            {section.items.map((item) => (
              <button
                key={item}
                className={`nav-button ${page === item ? "active" : ""}`}
                onClick={() => setPage(item)}
              >
                <NavIcon name={item} />
                <span>{item}</span>
              </button>
            ))}
          </div>
        ))}

        <div className="nav-divider" />

        <div className="nav-section">
          <div className="nav-section-label">System</div>

          <button className={`nav-button ${page === "Settings" ? "active" : ""}`} onClick={() => setPage("Settings")}>
            <NavIcon name="Settings" />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="account-avatar small">
            {(role || "U").charAt(0).toUpperCase()}
          </div>
          <div>
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
    Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

    const [
      vehiclesResult,
      driversResult,
      fleetResult,
      maintenanceResult,
      eventsResult,
    ] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("fleet_live").select("*"),
      supabase.from("maintenance_records").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.maintenanceCount || 8),
      supabase.from("vehicle_events").select("*, vehicles(fleet_number)").order("created_at", { ascending: false }).limit(preferences?.activityCount || 8),
    ]);

    const results = [
      vehiclesResult,
      driversResult,
      fleetResult,
      maintenanceResult,
      eventsResult,
    ];

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

  if (preferences?.inspectionWarnings && maintenanceVehicles > 0) {
    attentionItems.push({
      type: "danger",
      title: "Vehicles requiring service",
      description: `${maintenanceVehicles} vehicle${maintenanceVehicles === 1 ? "" : "s"} currently require service attention.`,
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

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-intro dashboard-intro">
          <div>
            <div className="eyebrow">OPERATIONS OVERVIEW</div>
            <h2>Fleet at a glance</h2>
            <p>Loading current fleet operations data...</p>
          </div>
        </div>

        <div className="dashboard-loading">
          <div className="loading-indicator" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-intro dashboard-intro">
        <div>
          <div className="eyebrow">OPERATIONS OVERVIEW</div>
          <h2>Fleet at a glance</h2>
          <p>Current operating condition, service workload, drivers, routes, and telemetry.</p>
        </div>

        <div className="dashboard-intro-actions">
          <div className="dashboard-updated">
            <span className="connection-dot" />
            <div>
              <strong>Live telemetry</strong>
              <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Updating"}</span>
            </div>
          </div>

          <button className="secondary-button" onClick={() => loadDashboard(true)} disabled={refreshing}>
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error dashboard-error">
          Unable to load dashboard data: {error}
        </div>
      )}

      <div className="dashboard-kpi-grid">
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
      </div>

      <div className="dashboard-secondary-stats">
        <DashboardMetric label="Drivers" value={activeDrivers} detail={`${drivers.length} total`} />
        <DashboardMetric label="Active Routes" value={activeRoutes} detail="Currently assigned" />
        <DashboardMetric label="Stale" value={staleVehicles} detail="Telemetry delayed" alert={staleVehicles > 0} />
        <DashboardMetric label="Offline" value={offlineVehicles} detail="Not reporting" alert={offlineVehicles > 0} />
      </div>

      <div className="dashboard-main-grid">
        <section className="panel dashboard-status-panel">
          <PanelTitle
            title="Fleet Operating Status"
            action={
              <button className="panel-action-button" onClick={() => setPage("Vehicles")}>
                View fleet
                <span>→</span>
              </button>
            }
          />

          <div className="fleet-status-overview">
            <div className="fleet-status-total">
              <strong>{totalVehicles}</strong>
              <span>Total vehicles</span>
            </div>

            <div className="fleet-status-bar">
              {fleetStatus.map((item) => {
                const percentage = totalVehicles > 0 ? (item.count / totalVehicles) * 100 : 0;

                return (
                  <div
                    key={item.status}
                    className={`fleet-status-segment fleet-status-${item.status.toLowerCase()}`}
                    style={{ width: `${percentage}%` }}
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
        </section>

        <section className="panel dashboard-health-panel">
          <PanelTitle
            title="Operations Health"
            action={
              <button className="panel-action-button" onClick={() => setPage("Live Fleet")}>
                Live fleet
                <span>→</span>
              </button>
            }
          />

          <div className="health-list">
            <HealthRow
              label="Driver activity"
              value={activeDrivers}
              detail={`${drivers.length} registered drivers`}
              state={activeDrivers > 0 ? "healthy" : "warning"}
            />

            <HealthRow
              label="Route operations"
              value={activeRoutes}
              detail="Routes currently active"
              state={activeRoutes > 0 ? "healthy" : "neutral"}
            />

            <HealthRow
              label="Telemetry"
              value={fleetLive.length - offlineVehicles}
              detail={`${offlineVehicles} offline · ${staleVehicles} stale`}
              state={offlineVehicles === 0 && staleVehicles === 0 ? "healthy" : "warning"}
            />

            <HealthRow
              label="Service workload"
              value={openMaintenance.length}
              detail={`${overdueMaintenance} overdue`}
              state={overdueMaintenance > 0 ? "danger" : "healthy"}
            />
          </div>
        </section>
      </div>

      <div className="dashboard-secondary-grid">
        <section className="panel dashboard-maintenance-panel">
          <PanelTitle
            title="Maintenance Work Queue"
            action={
              <button className="panel-action-button" onClick={() => setPage("Maintenance")}>
                View maintenance
                <span>→</span>
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
        </section>

        <section className="panel dashboard-alert-panel">
          <PanelTitle
            title="Attention Required"
            action={attentionItems.length > 0 ? <span className="attention-count">{attentionItems.length}</span> : null}
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
                <button className={`attention-row attention-${item.type}`} key={`${item.title}-${index}`} onClick={() => setPage(item.action)}>
                  <span className="attention-icon">!</span>

                  <span className="attention-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>

                  <span className="attention-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel dashboard-activity-panel">
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
                    <span>{event.vehicles?.fleet_number ? `Fleet ${event.vehicles.fleet_number}` : "Fleet operation"}</span>
                  </div>

                  <time>{formatRelativeTime(event.created_at)}</time>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel dashboard-telemetry-panel">
          <PanelTitle title="Live Telemetry" />

          <div className="telemetry-summary">
            <div className="telemetry-number">
              <strong>{fleetLive.length - offlineVehicles}</strong>
              <span>Reporting vehicles</span>
            </div>

            <div className="telemetry-health">
              <span className={`health-indicator ${offlineVehicles === 0 && staleVehicles === 0 ? "healthy" : "warning"}`} />

              <div>
                <strong>{offlineVehicles === 0 ? "Fleet connected" : "Fleet attention required"}</strong>
                <span>{staleVehicles} stale · {offlineVehicles} offline</span>
              </div>
            </div>
          </div>

          <div className="telemetry-footer">
            <span>Refresh interval</span>
            <strong>{preferences?.telemetryInterval || 15}s</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardKpi({ label, value, detail, icon, alert }) {
  return (
    <div className={`dashboard-kpi ${alert ? "has-alert" : ""}`}>
      <div className={`dashboard-kpi-icon dashboard-kpi-icon-${icon}`}>
        <DashboardIcon name={icon} />
      </div>

      <div className="dashboard-kpi-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function DashboardMetric({ label, value, detail, alert }) {
  return (
    <div className={`dashboard-metric ${alert ? "has-alert" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <small>{detail}</small>
    </div>
  );
}

function HealthRow({ label, value, detail, state }) {
  return (
    <div className="health-row">
      <div className={`health-indicator ${state}`} />

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
          className: "fleet-bus-icon",
          html: `
            <div class="fleet-bus-marker">
              <div class="fleet-bus-arrow"></div>
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

      const busMarker = element.querySelector(".fleet-bus-marker");
      const arrow = element.querySelector(".fleet-bus-arrow");
      const label = element.querySelector("span");

      const heading = Number(bus.heading || 0);

      if (busMarker) {
        busMarker.classList.toggle("selected", fleetNumber === String(selectedFleetNumber));
        busMarker.classList.toggle("stale", Boolean(bus.is_stale));
        busMarker.classList.toggle("maintenance", status === "MAINTENANCE");
        busMarker.classList.toggle("assigned", status === "ASSIGNED");
        busMarker.classList.toggle("in-service", status === "IN_SERVICE");
        busMarker.classList.toggle("available", status === "AVAILABLE");
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

    const position = marker.getLatLng();

    map.panTo(position, {
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

      return (
        Number.parseInt(String(a.fleet_number).replace(/\D/g, ""), 10) || 0
      ) - (
        Number.parseInt(String(b.fleet_number).replace(/\D/g, ""), 10) || 0
      );
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
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());

    const status = String(bus.effective_status || bus.status || "UNKNOWN").toUpperCase();

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

  function getStatus(status) {
    return String(status || "UNKNOWN").toUpperCase();
  }

  function getDriver(bus) {
    return bus.driver_name || bus.driver || "Unassigned";
  }

  function getRoute(bus) {
    return (
      bus.route_number ||
      bus.route_code ||
      bus.route_name ||
      bus.route ||
      "No route"
    );
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

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">OPERATIONS</div>
            <h2>Live Fleet</h2>
            <p>Real-time visibility across the active transportation fleet.</p>
          </div>
        </div>

        <div className="panel">
          <div className="empty">Loading live fleet telemetry...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="eyebrow">OPERATIONS / LIVE TELEMETRY</div>
          <h2>Live Fleet</h2>
          <p>Monitor active vehicles, operators, routes, and telemetry health.</p>
        </div>

        <div className="page-header-actions">
          <div className="live-indicator">
            <span className="live-indicator-dot"></span>
            <span>Live</span>
          </div>

          <button
            className="secondary-button"
            onClick={() => loadFleet(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="dashboard-secondary-stats live-fleet-stats">
        <Stat title="Fleet" value={totalCount} />
        <Stat title="Online" value={onlineCount} />
        <Stat title="In Service" value={inServiceCount} />
        <Stat title="Stale" value={staleCount} />
        <Stat title="Offline" value={offlineCount} />
      </div>

      <div className="fleet-toolbar panel">
        <div className="fleet-toolbar-left">
          <div className="status-filter">
            {[
              ["ALL", "All"],
              ["IN_SERVICE", "In Service"],
              ["AVAILABLE", "Available"],
              ["ASSIGNED", "Assigned"],
              ["MAINTENANCE", "Maintenance"],
              ["STALE", "Stale"],
              ["OFFLINE", "Offline"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-button ${statusFilter === value ? "active" : ""}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="fleet-toolbar-right">
          <input
            className="search-input"
            type="search"
            placeholder="Search fleet, driver, or route..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {lastRefresh && (
            <span className="toolbar-meta">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="live-fleet-layout">
        <div className="panel live-fleet-map-panel">
          <div className="panel-header">
            <div>
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
              <h3>Fleet Activity</h3>
              <p>
                Showing {filteredFleet.length} of {fleet.length} vehicles
              </p>
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

      <div className="live-fleet-detail">
        {selectedBus ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">SELECTED VEHICLE</div>
                <h3>Fleet {selectedBus.fleet_number}</h3>
                <p>
                  {selectedBus.year || "—"} {selectedBus.make || ""}{" "}
                  {selectedBus.model || ""}
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
                value={
                  selectedBus.server_id ||
                  selectedBus.roblox_job_id ||
                  "—"
                }
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

            <div className="live-fleet-detail-footer">
              <div>
                <span className="detail-label">Last Ping</span>
                <strong>
                  {getLastPing(selectedBus)
                    ? formatDate(getLastPing(selectedBus))
                    : "—"}
                </strong>
              </div>

              <div>
                <span className="detail-label">Fleet Number</span>
                <strong>{selectedBus.fleet_number}</strong>
              </div>

              <div>
                <span className="detail-label">Role Access</span>
                <strong>{canEdit ? "Operator" : "Viewer"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel">
            <Empty />
          </div>
        )}
      </div>
    </section>
  );
}

function Vehicles({ canEdit }) {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [garageFilter, setGarageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadVehicles(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*");

    if (vehiclesError) {
      setError(vehiclesError.message);
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

      return (
        Number.parseInt(String(a.fleet_number).replace(/\D/g, ""), 10) || 0
      ) - (
        Number.parseInt(String(b.fleet_number).replace(/\D/g, ""), 10) || 0
      );
    });

    setVehicles(sorted);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadVehicles(true);
  }, []);

  const garages = [...new Set(
    vehicles
      .map((vehicle) => vehicle.garage)
      .filter(Boolean)
      .map((garage) => String(garage).toUpperCase())
  )].sort();

  const statuses = [...new Set(
    vehicles
      .map((vehicle) => vehicle.status)
      .filter(Boolean)
      .map((status) => String(status).toUpperCase())
  )].sort();

  const filteredVehicles = vehicles.filter((vehicle) => {
    const fleetNumber = String(vehicle.fleet_number || "");
    const make = String(vehicle.make || "");
    const model = String(vehicle.model || "");
    const engine = String(vehicle.engine || "");
    const garage = String(vehicle.garage || "").toUpperCase();
    const status = String(vehicle.status || "UNKNOWN").toUpperCase();

    const haystack = `${fleetNumber} ${make} ${model} ${engine} ${garage}`.toLowerCase();

    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesGarage = garageFilter === "ALL" || garage === garageFilter;
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;

    return matchesSearch && matchesGarage && matchesStatus;
  });

  const totalCount = vehicles.length;
  const availableCount = vehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length;
  const assignedCount = vehicles.filter((vehicle) => vehicle.status === "ASSIGNED").length;
  const serviceCount = vehicles.filter((vehicle) => vehicle.status === "IN_SERVICE").length;
  const maintenanceCount = vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE").length;
  const outOfServiceCount = vehicles.filter((vehicle) => vehicle.status === "OUT_OF_SERVICE").length;

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">FLEET</div>
            <h2>Vehicles</h2>
            <p>Manage the transportation fleet and vehicle records.</p>
          </div>
        </div>

        <div className="panel">
          <div className="empty">Loading vehicle records...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="eyebrow">FLEET / VEHICLE REGISTRY</div>
          <h2>Vehicles</h2>
          <p>Vehicle inventory, operating status, specifications, and fleet records.</p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={() => loadVehicles(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="dashboard-secondary-stats">
        <Stat title="Total Fleet" value={totalCount} />
        <Stat title="Available" value={availableCount} />
        <Stat title="Assigned" value={assignedCount} />
        <Stat title="In Service" value={serviceCount} />
        <Stat title="Maintenance" value={maintenanceCount} />
        <Stat title="Out of Service" value={outOfServiceCount} />
      </div>

      <div className="panel vehicles-toolbar">
        <div className="toolbar-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search fleet, make, model, engine, or garage..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="select-input"
            value={garageFilter}
            onChange={(event) => setGarageFilter(event.target.value)}
          >
            <option value="ALL">All Garages</option>
            {garages.map((garage) => (
              <option key={garage} value={garage}>
                {garage}
              </option>
            ))}
          </select>

          <select
            className="select-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Vehicle Registry</h3>
            <p>
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </p>
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
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
                  {canEdit && <th></th>}
                </tr>
              </thead>

              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="clickable-row"
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <td>
                      <strong>{vehicle.fleet_number}</strong>
                    </td>

                    <td>{vehicle.year || "—"}</td>

                    <td>{vehicle.make || "—"}</td>

                    <td>{vehicle.model || "—"}</td>

                    <td>{vehicle.engine || "—"}</td>

                    <td>
                      {vehicle.mileage === null || vehicle.mileage === undefined
                        ? "—"
                        : Number(vehicle.mileage).toLocaleString()}
                    </td>

                    <td>
                      <StatusBadge status={vehicle.status} />
                    </td>

                    <td>{vehicle.garage || "—"}</td>

                    {canEdit && (
                      <td>
                        <button
                          className="table-action-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedVehicle(vehicle);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVehicle && (
        <VehicleDetails
          vehicle={selectedVehicle}
          canEdit={canEdit}
          onClose={() => setSelectedVehicle(null)}
          onSaved={async () => {
            await loadVehicles(false);
            setSelectedVehicle(null);
          }}
        />
      )}
    </section>
  );
}

function VehicleDetails({ vehicle, canEdit, onClose, onSaved }) {
  const [fleetLive, setFleetLive] = useState(null);
  const [year, setYear] = useState(vehicle.year ?? "");
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [engine, setEngine] = useState(vehicle.engine ?? "");
  const [mileage, setMileage] = useState(vehicle.mileage ?? "");
  const [status, setStatus] = useState(vehicle.status ?? "AVAILABLE");
  const [garage, setGarage] = useState(vehicle.garage ?? "");
  const [notes, setNotes] = useState(vehicle.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [loadingLive, setLoadingLive] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadLiveData() {
    setLoadingLive(true);

    const { data, error: liveError } = await supabase
      .from("fleet_live")
      .select("*")
      .eq("fleet_number", vehicle.fleet_number)
      .maybeSingle();

    if (liveError) {
      console.error("Failed to load live vehicle state:", liveError);
      setFleetLive(null);
    } else {
      setFleetLive(data || null);
    }

    setLoadingLive(false);
  }

  useEffect(() => {
    loadLiveData();

    const interval = setInterval(() => {
      loadLiveData();
    }, 15000);

    return () => clearInterval(interval);
  }, [vehicle.fleet_number]);

  async function saveVehicle(event) {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (!fleetNumberIsValid(vehicle.fleet_number)) {
      setError("Invalid fleet number.");
      setSaving(false);
      return;
    }

    const parsedMileage = mileage === "" ? 0 : Number(mileage);
    const parsedYear = year === "" ? null : Number(year);

    if (parsedMileage < 0 || !Number.isFinite(parsedMileage)) {
      setError("Mileage must be a valid non-negative number.");
      setSaving(false);
      return;
    }

    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100)) {
      setError("Year must be a valid year.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.rpc("update_vehicle", {
      p_vehicle_id: vehicle.id,
      p_year: parsedYear,
      p_make: make.trim(),
      p_model: model.trim(),
      p_engine: engine.trim(),
      p_mileage: parsedMileage,
      p_status: status,
      p_garage: garage.trim(),
      p_notes: notes.trim() || null,
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage("Vehicle updated successfully.");

    await onSaved();

    setSaving(false);
  }

  function fleetNumberIsValid(value) {
    return String(value || "").trim().length > 0;
  }

  function getLiveStatus() {
    if (!fleetLive) {
      return "OFFLINE";
    }

    return String(
      fleetLive.effective_status ||
      fleetLive.status ||
      "UNKNOWN"
    ).toUpperCase();
  }

  function getLiveDriver() {
    if (!fleetLive) {
      return "No active driver";
    }

    return fleetLive.driver_name || fleetLive.driver || "Unassigned";
  }

  function getLiveRoute() {
    if (!fleetLive) {
      return "No active route";
    }

    return (
      fleetLive.route_number ||
      fleetLive.route_code ||
      fleetLive.route_name ||
      fleetLive.route ||
      "No route"
    );
  }

  function getNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal large-modal vehicle-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">VEHICLE RECORD</div>
            <h3>Fleet {vehicle.fleet_number}</h3>
            <p>
              {vehicle.year || "—"} {vehicle.make || ""} {vehicle.model || ""}
            </p>
          </div>

          <div className="modal-header-actions">
            <StatusBadge status={vehicle.status} />

            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        <div className="vehicle-details-content">
          <div className="panel vehicle-live-panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">CURRENT OPERATION</div>
                <h3>Live Vehicle State</h3>
              </div>

              {loadingLive ? (
                <span className="muted">Updating...</span>
              ) : (
                <StatusBadge status={getLiveStatus()} />
              )}
            </div>

            <div className="detail-grid">
              <Detail
                label="Driver"
                value={getLiveDriver()}
              />

              <Detail
                label="Route"
                value={getLiveRoute()}
              />

              <Detail
                label="Speed"
                value={fleetLive ? `${getNumber(fleetLive.speed, 1)} MPH` : "—"}
              />

              <Detail
                label="RPM"
                value={fleetLive ? getNumber(fleetLive.rpm) : "—"}
              />

              <Detail
                label="Heading"
                value={fleetLive ? `${getNumber(fleetLive.heading)}°` : "—"}
              />

              <Detail
                label="Coolant"
                value={fleetLive ? `${getNumber(fleetLive.coolant_temp, 1)} °F` : "—"}
              />

              <Detail
                label="Oil"
                value={fleetLive ? `${getNumber(fleetLive.oil_temp, 1)} °F` : "—"}
              />

              <Detail
                label="Server"
                value={
                  fleetLive
                    ? fleetLive.server_id || fleetLive.roblox_job_id || "—"
                    : "—"
                }
              />
            </div>
          </div>

          {canEdit ? (
            <form onSubmit={saveVehicle} className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">FLEET RECORD</div>
                  <h3>Vehicle Information</h3>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  <span>Fleet Number</span>
                  <input
                    className="text-input"
                    value={vehicle.fleet_number}
                    disabled
                  />
                </label>

                <label>
                  <span>Year</span>
                  <input
                    className="text-input"
                    type="number"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                  />
                </label>

                <label>
                  <span>Make</span>
                  <input
                    className="text-input"
                    value={make}
                    onChange={(event) => setMake(event.target.value)}
                  />
                </label>

                <label>
                  <span>Model</span>
                  <input
                    className="text-input"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  />
                </label>

                <label>
                  <span>Engine</span>
                  <input
                    className="text-input"
                    value={engine}
                    onChange={(event) => setEngine(event.target.value)}
                  />
                </label>

                <label>
                  <span>Mileage</span>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    step="1"
                    value={mileage}
                    onChange={(event) => setMileage(event.target.value)}
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    className="select-input"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_SERVICE">In Service</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </select>
                </label>

                <label>
                  <span>Garage</span>
                  <input
                    className="text-input"
                    value={garage}
                    onChange={(event) => setGarage(event.target.value)}
                  />
                </label>

                <label className="form-span-full">
                  <span>Notes</span>
                  <textarea
                    className="textarea-input"
                    rows="5"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Vehicle notes..."
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Vehicle"}
                </button>
              </div>
            </form>
          ) : (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">FLEET RECORD</div>
                  <h3>Vehicle Information</h3>
                </div>

                <span className="muted">View only</span>
              </div>

              <div className="detail-grid">
                <Detail label="Fleet Number" value={vehicle.fleet_number} />
                <Detail label="Year" value={vehicle.year || "—"} />
                <Detail label="Make" value={vehicle.make || "—"} />
                <Detail label="Model" value={vehicle.model || "—"} />
                <Detail label="Engine" value={vehicle.engine || "—"} />
                <Detail label="Mileage" value={vehicle.mileage?.toLocaleString() || "—"} />
                <Detail label="Status" value={vehicle.status || "—"} />
                <Detail label="Garage" value={vehicle.garage || "—"} />
              </div>

              {vehicle.notes && (
                <div className="detail-notes">
                  <span className="detail-label">Notes</span>
                  <p>{vehicle.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Drivers({ canEdit }) {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [name, setName] = useState("");
  const [robloxUserId, setRobloxUserId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDrivers(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const { data, error: driversError } = await supabase
      .from("drivers")
      .select(`
        *,
        vehicles:current_vehicle_id(fleet_number),
        routes:current_route_id(name)
      `)
      .order("name");

    if (driversError) {
      setError(driversError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    setDrivers(data || []);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers(true);

    const interval = setInterval(() => {
      loadDrivers(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  function openNewDriver() {
    if (!canEdit) {
      return;
    }

    setEditingDriver(null);
    setName("");
    setRobloxUserId("");
    setEmployeeNumber("");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditDriver(driver) {
    if (!canEdit) {
      return;
    }

    setEditingDriver(driver);
    setName(driver.name || "");
    setRobloxUserId(
      driver.roblox_user_id === null || driver.roblox_user_id === undefined
        ? ""
        : String(driver.roblox_user_id)
    );
    setEmployeeNumber(driver.employee_number || "");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingDriver(null);
    setName("");
    setRobloxUserId("");
    setEmployeeNumber("");
    setError("");
  }

  async function saveDriver(event) {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    setError("");
    setMessage("");

    const trimmedName = name.trim();
    const trimmedUserId = robloxUserId.trim();
    const trimmedEmployeeNumber = employeeNumber.trim();

    if (!trimmedName) {
      setError("Username is required.");
      return;
    }

    if (!trimmedUserId) {
      setError("Roblox User ID is required.");
      return;
    }

    if (!/^\d+$/.test(trimmedUserId)) {
      setError("Roblox User ID must contain digits only.");
      return;
    }

    const parsedUserId = Number(trimmedUserId);

    if (!Number.isSafeInteger(parsedUserId) || parsedUserId < 0) {
      setError("Roblox User ID must be a valid integer.");
      return;
    }

    setSaving(true);

    if (editingDriver) {
      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          name: trimmedName,
          roblox_user_id: parsedUserId,
          employee_number: trimmedEmployeeNumber || null,
        })
        .eq("id", editingDriver.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setMessage("Driver updated successfully.");
    } else {
      const { error: insertError } = await supabase
        .from("drivers")
        .insert({
          name: trimmedName,
          roblox_user_id: parsedUserId,
          employee_number: trimmedEmployeeNumber || null,
          status: "OFFLINE",
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setMessage("Driver added successfully.");
    }

    await loadDrivers(false);

    setSaving(false);
    setShowForm(false);
    setEditingDriver(null);
    setName("");
    setRobloxUserId("");
    setEmployeeNumber("");
  }

  const filteredDrivers = drivers.filter((driver) => {
    const driverName = String(driver.name || "");
    const userId = String(driver.roblox_user_id || "");
    const employee = String(driver.employee_number || "");
    const status = String(driver.status || "UNKNOWN").toUpperCase();

    const haystack = `${driverName} ${userId} ${employee}`.toLowerCase();

    const matchesSearch =
      !search.trim() ||
      haystack.includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = drivers.filter((driver) => {
    const status = String(driver.status || "").toUpperCase();
    return status === "ACTIVE" || status === "ONLINE";
  }).length;

  const onlineCount = drivers.filter((driver) => {
    return String(driver.status || "").toUpperCase() === "ONLINE";
  }).length;

  const offlineCount = drivers.filter((driver) => {
    return String(driver.status || "").toUpperCase() === "OFFLINE";
  }).length;

  const assignedCount = drivers.filter((driver) => {
    return Boolean(driver.current_vehicle_id);
  }).length;

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">FLEET / OPERATORS</div>
            <h2>Drivers</h2>
            <p>Driver records, operating status, and current assignments.</p>
          </div>
        </div>

        <div className="panel">
          <div className="empty">Loading driver records...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="eyebrow">FLEET / OPERATORS</div>
          <h2>Drivers</h2>
          <p>Monitor operators and their current fleet assignments.</p>
        </div>

        <div className="page-header-actions">
          {canEdit && (
            <button
              className="primary-button"
              onClick={openNewDriver}
            >
              + Add Driver
            </button>
          )}

          <button
            className="secondary-button"
            onClick={() => loadDrivers(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {message && !showForm && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      <div className="dashboard-secondary-stats">
        <Stat title="Total Drivers" value={drivers.length} />
        <Stat title="Active" value={activeCount} />
        <Stat title="Online" value={onlineCount} />
        <Stat title="Assigned" value={assignedCount} />
        <Stat title="Offline" value={offlineCount} />
      </div>

      <div className="panel">
        <div className="toolbar-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search driver, Roblox User ID, or employee number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="status-filter">
            {[
              ["ALL", "All"],
              ["ACTIVE", "Active"],
              ["ONLINE", "Online"],
              ["OFFLINE", "Offline"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-button ${statusFilter === value ? "active" : ""}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Driver Registry</h3>
            <p>
              Showing {filteredDrivers.length} of {drivers.length} drivers
            </p>
          </div>
        </div>

        {filteredDrivers.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Current Vehicle</th>
                  <th>Current Route</th>
                  <th>Employee #</th>
                  <th>Roblox User ID</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="clickable-row"
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <td>
                      <strong>{driver.name || "Unnamed Driver"}</strong>
                    </td>

                    <td>
                      <StatusBadge status={driver.status} />
                    </td>

                    <td>
                      {driver.vehicles?.fleet_number || "Unassigned"}
                    </td>

                    <td>
                      {driver.routes?.name || "No route"}
                    </td>

                    <td>
                      {driver.employee_number || "—"}
                    </td>

                    <td>
                      {driver.roblox_user_id || "—"}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDriver(driver);
                          }}
                        >
                          View
                        </button>

                        {canEdit && (
                          <button
                            className="table-action-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDriver(driver);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={closeForm}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">
                  {editingDriver ? "DRIVER RECORD" : "NEW DRIVER"}
                </div>
                <h3>
                  {editingDriver ? "Edit Driver" : "Add Driver"}
                </h3>
                <p>
                  {editingDriver
                    ? "Update the driver's registry information."
                    : "Create a new driver account record."}
                </p>
              </div>

              <button
                className="icon-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={saveDriver}>
              <div className="form-grid">
                <label className="form-span-full">
                  <span>Username</span>
                  <input
                    className="text-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Roblox username"
                    autoFocus
                  />
                </label>

                <label>
                  <span>Roblox User ID</span>
                  <input
                    className="text-input"
                    inputMode="numeric"
                    value={robloxUserId}
                    onChange={(event) => {
                      setRobloxUserId(
                        event.target.value.replace(/\D/g, "")
                      );
                    }}
                    placeholder="Roblox User ID"
                  />
                </label>

                <label>
                  <span>Employee Number</span>
                  <input
                    className="text-input"
                    value={employeeNumber}
                    onChange={(event) => setEmployeeNumber(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingDriver
                      ? "Save Driver"
                      : "Add Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDriver && (
        <DriverDetails
          driver={selectedDriver}
          canEdit={canEdit}
          onEdit={() => {
            setSelectedDriver(null);
            openEditDriver(selectedDriver);
          }}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </section>
  );
}

function DriverDetails({ driver, canEdit, onEdit, onClose }) {
  const [fleetLive, setFleetLive] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadLiveData() {
    const { data, error } = await supabase
      .from("fleet_live")
      .select("*")
      .eq("driver_id", driver.id);

    if (error) {
      console.error("Failed to load driver's live fleet state:", error);
      setFleetLive([]);
      setLoading(false);
      return;
    }

    setFleetLive(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLiveData();

    const interval = setInterval(() => {
      loadLiveData();
    }, 15000);

    return () => clearInterval(interval);
  }, [driver.id]);

  const currentBus = fleetLive[0] || null;

  const driverStatus = String(driver.status || "OFFLINE").toUpperCase();

  function getRoute(bus) {
    if (!bus) {
      return "No active route";
    }

    return (
      bus.route_number ||
      bus.route_code ||
      bus.route_name ||
      bus.route ||
      "No route"
    );
  }

  function getNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal large-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">DRIVER PROFILE</div>
            <h3>{driver.name || "Unnamed Driver"}</h3>
            <p>
              {driver.employee_number
                ? `Employee ${driver.employee_number}`
                : "No employee number"}
            </p>
          </div>

          <div className="modal-header-actions">
            <StatusBadge status={driverStatus} />

            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <Detail
            label="Username"
            value={driver.name || "—"}
          />

          <Detail
            label="Roblox User ID"
            value={driver.roblox_user_id || "—"}
          />

          <Detail
            label="Employee Number"
            value={driver.employee_number || "—"}
          />

          <Detail
            label="Current Vehicle"
            value={driver.vehicles?.fleet_number || "Unassigned"}
          />

          <Detail
            label="Current Route"
            value={driver.routes?.name || "No route"}
          />

          <Detail
            label="Status"
            value={driverStatus}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">CURRENT OPERATION</div>
              <h3>Live Assignment</h3>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading live assignment...</div>
          ) : currentBus ? (
            <div className="detail-grid">
              <Detail
                label="Vehicle"
                value={currentBus.fleet_number || "—"}
              />

              <Detail
                label="Route"
                value={getRoute(currentBus)}
              />

              <Detail
                label="Status"
                value={currentBus.effective_status || currentBus.status || "UNKNOWN"}
              />

              <Detail
                label="Speed"
                value={`${getNumber(currentBus.speed, 1)} MPH`}
              />

              <Detail
                label="Server"
                value={
                  currentBus.server_id ||
                  currentBus.roblox_job_id ||
                  "—"
                }
              />

              <Detail
                label="Last Ping"
                value={
                  currentBus.last_ping
                    ? formatDate(currentBus.last_ping)
                    : "—"
                }
              />
            </div>
          ) : (
            <div className="empty">
              {driverStatus === "OFFLINE"
                ? "Driver is currently offline."
                : driverStatus === "ONLINE" || driverStatus === "ACTIVE"
                  ? "Driver is online but has no vehicle telemetry."
                  : "No active vehicle assignment."}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="modal-footer">
            <button
              className="primary-button"
              onClick={onEdit}
            >
              Edit Driver
            </button>

            <button
              className="secondary-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Assignments({ canEdit }) {
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routeAssignments, setRouteAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [vehicleId, setVehicleId] = useState("");
  const [routeNumber, setRouteNumber] = useState("");
  const [driverId, setDriverId] = useState("");

  async function loadData(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const [
      assignmentsResult,
      vehiclesResult,
      driversResult,
      routeAssignmentsResult,
    ] = await Promise.all([
      supabase
        .from("assignments")
        .select(`
          *,
          vehicles:vehicle_id(fleet_number,year,garage,status),
          drivers:driver_id(name)
        `)
        .eq("status", "ACTIVE")
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
        .from("route_assignments")
        .select(`
          *,
          routes:route_id(route_code,name)
        `)
        .in("status", ["AWAITING", "ACTIVE"]),
    ]);

    const firstError =
      assignmentsResult.error ||
      vehiclesResult.error ||
      driversResult.error ||
      routeAssignmentsResult.error;

    if (firstError) {
      setError(firstError.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    setAssignments(assignmentsResult.data || []);
    setVehicles(vehiclesResult.data || []);
    setDrivers(driversResult.data || []);
    setRouteAssignments(routeAssignmentsResult.data || []);

    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadData(true);

    const interval = setInterval(() => {
      loadData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const activeRouteMap = new Map();

  routeAssignments.forEach((assignment) => {
    if (!assignment.vehicle_id) {
      return;
    }

    activeRouteMap.set(String(assignment.vehicle_id), assignment);
  });

  const sortedVehicles = [...vehicles].sort((a, b) => {
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

    return (
      (Number.parseInt(String(a.fleet_number).replace(/\D/g, ""), 10) || 0) -
      (Number.parseInt(String(b.fleet_number).replace(/\D/g, ""), 10) || 0)
    );
  });

  const activeVehicleIds = new Set(
    assignments
      .map((assignment) => assignment.vehicle_id)
      .filter(Boolean)
      .map(String)
  );

  function getActiveRouteLabel(vehicle) {
    const routeAssignment = activeRouteMap.get(String(vehicle.id));

    if (routeAssignment) {
      return (
        routeAssignment.routes?.route_code ||
        routeAssignment.route_number ||
        routeAssignment.routes?.name ||
        "Assigned"
      );
    }

    if (vehicle.status === "OUT_OF_SERVICE") {
      return "Inactive";
    }

    return "None";
  }

  function openNewAssignment() {
    if (!canEdit) {
      return;
    }

    setEditingAssignment(null);
    setVehicleId("");
    setRouteNumber("");
    setDriverId("");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditAssignment(assignment) {
    if (!canEdit) {
      return;
    }

    setEditingAssignment(assignment);
    setVehicleId(assignment.vehicle_id || "");
    setRouteNumber(assignment.route_number || "");
    setDriverId(assignment.driver_id || "");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingAssignment(null);
    setVehicleId("");
    setRouteNumber("");
    setDriverId("");
    setError("");
  }

  async function createAssignment(event) {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    setError("");
    setMessage("");

    if (!vehicleId) {
      setError("Vehicle is required.");
      return;
    }

    if (!routeNumber.trim()) {
      setError("Route number is required.");
      return;
    }

    if (!driverId) {
      setError("Driver is required.");
      return;
    }

    const selectedVehicle = vehicles.find(
      (vehicle) => String(vehicle.id) === String(vehicleId)
    );

    if (!selectedVehicle) {
      setError("Selected vehicle could not be found.");
      return;
    }

    if (
      selectedVehicle.status === "MAINTENANCE" ||
      selectedVehicle.status === "OUT_OF_SERVICE"
    ) {
      setError("This vehicle cannot be assigned while it is unavailable.");
      return;
    }

    setSaving(true);

    if (editingAssignment) {
      await updateAssignment(event, selectedVehicle);
      return;
    }

    const alreadyAssigned = assignments.some(
      (assignment) =>
        String(assignment.vehicle_id) === String(selectedVehicle.id)
    );

    if (alreadyAssigned) {
      setError("This vehicle already has an active assignment.");
      setSaving(false);
      return;
    }

    const { error: assignError } = await supabase.rpc("assign_vehicle", {
      p_fleet_number: selectedVehicle.fleet_number,
      p_driver_id: driverId,
      p_route_number: routeNumber.trim(),
    });

    if (assignError) {
      setError(assignError.message);
      setSaving(false);
      return;
    }

    setMessage(`Fleet ${selectedVehicle.fleet_number} assigned successfully.`);

    setShowForm(false);
    setEditingAssignment(null);
    setVehicleId("");
    setRouteNumber("");
    setDriverId("");

    await loadData(false);

    setSaving(false);
  }

  async function updateAssignment(event, selectedVehicle) {
    event.preventDefault();

    if (!editingAssignment) {
      setSaving(false);
      return;
    }

    const previousVehicleId = editingAssignment.vehicle_id;
    const previousDriverId = editingAssignment.driver_id;
    const previousRouteId = editingAssignment.route_id;

    if (
      selectedVehicle.status === "MAINTENANCE" ||
      selectedVehicle.status === "OUT_OF_SERVICE"
    ) {
      setError("This vehicle cannot be assigned while it is unavailable.");
      setSaving(false);
      return;
    }

    const vehicleAlreadyAssigned = assignments.some(
      (assignment) =>
        assignment.id !== editingAssignment.id &&
        String(assignment.vehicle_id) === String(selectedVehicle.id)
    );

    if (vehicleAlreadyAssigned) {
      setError("This vehicle already has another active assignment.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        vehicle_id: selectedVehicle.id,
        driver_id: driverId,
        route_number: routeNumber.trim(),
      })
      .eq("id", editingAssignment.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (
      previousDriverId &&
      String(previousDriverId) !== String(driverId)
    ) {
      await supabase
        .from("drivers")
        .update({
          current_vehicle_id: null,
          current_route_id: null,
        })
        .eq("id", previousDriverId);
    }

    if (
      previousVehicleId &&
      String(previousVehicleId) !== String(selectedVehicle.id)
    ) {
      await supabase
        .from("vehicles")
        .update({
          current_driver_id: null,
          current_route_id: null,
        })
        .eq("id", previousVehicleId);
    }

    await supabase
      .from("vehicles")
      .update({
        current_driver_id: driverId,
        current_route_id: previousRouteId || null,
      })
      .eq("id", selectedVehicle.id);

    await supabase
      .from("drivers")
      .update({
        current_vehicle_id: selectedVehicle.id,
        current_route_id: previousRouteId || null,
      })
      .eq("id", driverId);

    setMessage(`Fleet ${selectedVehicle.fleet_number} assignment updated.`);

    setShowForm(false);
    setEditingAssignment(null);
    setVehicleId("");
    setRouteNumber("");
    setDriverId("");

    await loadData(false);

    setSaving(false);
  }

  async function endAssignment(assignment) {
    if (!canEdit) {
      return;
    }

    const fleetNumber =
      assignment.vehicles?.fleet_number ||
      vehicles.find((vehicle) => vehicle.id === assignment.vehicle_id)?.fleet_number;

    if (!fleetNumber) {
      setError("Unable to determine the fleet number for this assignment.");
      return;
    }

    const confirmed = window.confirm(
      `End the active assignment for fleet ${fleetNumber}?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: endError } = await supabase.rpc("end_vehicle_assignment", {
      p_fleet_number: fleetNumber,
    });

    if (endError) {
      setError(endError.message);
      return;
    }

    setMessage(`Assignment for fleet ${fleetNumber} ended.`);

    await loadData(false);
  }

  const availableDrivers = [...drivers].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  const assignableVehicles = sortedVehicles.filter((vehicle) => {
    const isCurrentVehicle =
      editingAssignment &&
      String(editingAssignment.vehicle_id) === String(vehicle.id);

    const alreadyAssigned =
      activeVehicleIds.has(String(vehicle.id)) && !isCurrentVehicle;

    const unavailable =
      vehicle.status === "MAINTENANCE" ||
      vehicle.status === "OUT_OF_SERVICE";

    return !alreadyAssigned && !unavailable;
  });

  const sortedAssignments = [...assignments].sort((a, b) => {
    const vehicleA = vehicles.find(
      (vehicle) => String(vehicle.id) === String(a.vehicle_id)
    );

    const vehicleB = vehicles.find(
      (vehicle) => String(vehicle.id) === String(b.vehicle_id)
    );

    const garageA = String(vehicleA?.garage || "").toUpperCase();
    const garageB = String(vehicleB?.garage || "").toUpperCase();

    const garageRankA = garageA === "CLIO" ? 0 : garageA === "MAPLECREST" ? 1 : 2;
    const garageRankB = garageB === "CLIO" ? 0 : garageB === "MAPLECREST" ? 1 : 2;

    if (garageRankA !== garageRankB) {
      return garageRankA - garageRankB;
    }

    const yearA = Number(vehicleA?.year) || 9999;
    const yearB = Number(vehicleB?.year) || 9999;

    if (yearA !== yearB) {
      return yearA - yearB;
    }

    return (
      (Number.parseInt(String(vehicleA?.fleet_number).replace(/\D/g, ""), 10) || 0) -
      (Number.parseInt(String(vehicleB?.fleet_number).replace(/\D/g, ""), 10) || 0)
    );
  });

  const activeCount = assignments.length;

  const assignedVehicleCount = new Set(
    assignments.map((assignment) => assignment.vehicle_id).filter(Boolean)
  ).size;

  const unassignedVehicleCount = vehicles.filter((vehicle) => {
    return (
      !activeVehicleIds.has(String(vehicle.id)) &&
      vehicle.status !== "MAINTENANCE" &&
      vehicle.status !== "OUT_OF_SERVICE"
    );
  }).length;

  const activeDriverCount = new Set(
    assignments.map((assignment) => assignment.driver_id).filter(Boolean)
  ).size;

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">FLEET / OPERATIONS</div>
            <h2>Assignments</h2>
            <p>Manage active vehicle, driver, and route assignments.</p>
          </div>
        </div>

        <div className="panel">
          <div className="empty">Loading assignments...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="eyebrow">FLEET / OPERATIONS</div>
          <h2>Assignments</h2>
          <p>Manage active vehicle operators and route assignments.</p>
        </div>

        <div className="page-header-actions">
          {canEdit && (
            <button
              className="primary-button"
              onClick={openNewAssignment}
            >
              + New Assignment
            </button>
          )}

          <button
            className="secondary-button"
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {message && !showForm && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      <div className="dashboard-secondary-stats">
        <Stat title="Active Assignments" value={activeCount} />
        <Stat title="Assigned Vehicles" value={assignedVehicleCount} />
        <Stat title="Assigned Drivers" value={activeDriverCount} />
        <Stat title="Available Vehicles" value={unassignedVehicleCount} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">CURRENT OPERATIONS</div>
            <h3>Active Assignments</h3>
            <p>Vehicles currently assigned to drivers and routes.</p>
          </div>
        </div>

        {sortedAssignments.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route #</th>
                  <th>Driver</th>
                  <th>Active Route</th>
                  <th>Started</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>

              <tbody>
                {sortedAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <strong>
                        {assignment.vehicles?.fleet_number || "—"}
                      </strong>
                    </td>

                    <td>
                      {assignment.route_number || "—"}
                    </td>

                    <td>
                      {assignment.drivers?.name || "Unassigned"}
                    </td>

                    <td>
                      <span
                        className={
                          getActiveRouteLabel(
                            vehicles.find(
                              (vehicle) =>
                                String(vehicle.id) ===
                                String(assignment.vehicle_id)
                            ) || {}
                          ) === "None"
                            ? "muted"
                            : ""
                        }
                      >
                        {getActiveRouteLabel(
                          vehicles.find(
                            (vehicle) =>
                              String(vehicle.id) ===
                              String(assignment.vehicle_id)
                          ) || {}
                        )}
                      </span>
                    </td>

                    <td>
                      {formatDate(assignment.started_at)}
                    </td>

                    {canEdit && (
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action-button"
                            onClick={() => openEditAssignment(assignment)}
                          >
                            Edit
                          </button>

                          <button
                            className="table-action-button danger"
                            onClick={() => endAssignment(assignment)}
                          >
                            End
                          </button>
                        </div>
                      </td>
                    )}
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
            <div className="eyebrow">VEHICLE AVAILABILITY</div>
            <h3>Assignment Availability</h3>
            <p>Vehicles currently eligible for a new assignment.</p>
          </div>
        </div>

        <div className="assignment-availability-grid">
          {sortedVehicles.map((vehicle) => {
            const isAssigned = activeVehicleIds.has(String(vehicle.id));
            const isMaintenance = vehicle.status === "MAINTENANCE";
            const isOutOfService = vehicle.status === "OUT_OF_SERVICE";

            return (
              <div
                key={vehicle.id}
                className={`assignment-vehicle-card ${
                  isAssigned
                    ? "assigned"
                    : isMaintenance
                      ? "maintenance"
                      : isOutOfService
                        ? "out-of-service"
                        : "available"
                }`}
              >
                <div className="assignment-vehicle-header">
                  <strong>{vehicle.fleet_number}</strong>
                  <StatusBadge status={vehicle.status} />
                </div>

                <div className="assignment-vehicle-info">
                  <span>
                    {vehicle.year || "—"} {vehicle.make || ""} {vehicle.model || ""}
                  </span>

                  <span>
                    {vehicle.garage || "No garage"}
                  </span>
                </div>

                <div className="assignment-vehicle-footer">
                  {isAssigned ? (
                    <span>Currently assigned</span>
                  ) : isMaintenance ? (
                    <span>Maintenance hold</span>
                  ) : isOutOfService ? (
                    <span>Out of service</span>
                  ) : (
                    <span>Ready for assignment</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={closeForm}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">
                  {editingAssignment
                    ? "ASSIGNMENT RECORD"
                    : "NEW ASSIGNMENT"}
                </div>

                <h3>
                  {editingAssignment
                    ? "Edit Assignment"
                    : "Create Assignment"}
                </h3>

                <p>
                  Assign a vehicle to a driver and route.
                </p>
              </div>

              <button
                className="icon-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={createAssignment}>
              <div className="form-grid">
                <label className="form-span-full">
                  <span>Vehicle</span>

                  <select
                    className="select-input"
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    disabled={Boolean(editingAssignment)}
                  >
                    <option value="">Select vehicle...</option>

                    {assignableVehicles.map((vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.fleet_number} — {vehicle.year || "—"} {vehicle.make || ""} {vehicle.model || ""} ({vehicle.garage || "No Garage"})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Route Number</span>

                  <input
                    className="text-input"
                    value={routeNumber}
                    onChange={(event) => setRouteNumber(event.target.value)}
                    placeholder="e.g. 12"
                  />
                </label>

                <label>
                  <span>Driver</span>

                  <select
                    className="select-input"
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                  >
                    <option value="">Select driver...</option>

                    {availableDrivers.map((driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                      >
                        {driver.name}
                        {driver.employee_number
                          ? ` — ${driver.employee_number}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="assignment-form-note">
                <span>Assignment behavior</span>
                <p>
                  Assigning a vehicle updates the active assignment and
                  associated vehicle/driver records. Ending the assignment
                  returns the vehicle to its normal unassigned state.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingAssignment
                      ? "Save Assignment"
                      : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Routes({ canEdit }) {
  const [routes, setRoutes] = useState([]);
  const [routePointCounts, setRoutePointCounts] = useState({});
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

  async function loadRoutes(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    const [routesResult, pointsResult] = await Promise.all([
      supabase
        .from("routes")
        .select("*")
        .order("name"),

      supabase
        .from("route_points")
        .select("route_id"),
    ]);

    if (routesResult.error) {
      setError(routesResult.error.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    if (pointsResult.error) {
      setError(pointsResult.error.message);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    const counts = {};

    (pointsResult.data || []).forEach((point) => {
      const routeId = String(point.route_id);

      counts[routeId] = (counts[routeId] || 0) + 1;
    });

    setRoutes(routesResult.data || []);
    setRoutePointCounts(counts);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => {
    loadRoutes(true);
  }, []);

  function openNewRoute() {
    if (!canEdit) {
      return;
    }

    setRouteCode("");
    setName("");
    setDescription("");
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeNewRoute() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setRouteCode("");
    setName("");
    setDescription("");
    setError("");
  }

  async function createRoute(event) {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    const trimmedCode = routeCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedCode) {
      setError("Route code is required.");
      return;
    }

    if (!trimmedName) {
      setError("Route name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: insertError } = await supabase
      .from("routes")
      .insert({
        route_code: trimmedCode,
        name: trimmedName,
        description: trimmedDescription || null,
        status: "ACTIVE",
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setMessage(`Route ${trimmedCode} created successfully.`);

    closeNewRoute();
    await loadRoutes(false);

    setSaving(false);
  }

  function openEditDetails(route) {
    if (!canEdit) {
      return;
    }

    setEditingDetails(route);
    setEditRouteCode(route.route_code || "");
    setName(route.name || "");
    setDescription(route.description || "");
    setError("");
    setMessage("");
  }

  function closeEditDetails() {
    if (saving) {
      return;
    }

    setEditingDetails(null);
    setEditRouteCode("");
    setName("");
    setDescription("");
    setError("");
  }

  async function saveRouteDetails(event) {
    event.preventDefault();

    if (!canEdit || saving || !editingDetails) {
      return;
    }

    const trimmedCode = editRouteCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedCode) {
      setError("Route code is required.");
      return;
    }

    if (!trimmedName) {
      setError("Route name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { data, error: updateError } = await supabase
      .from("routes")
      .update({
        route_code: trimmedCode,
        name: trimmedName,
        description: trimmedDescription || null,
      })
      .eq("id", editingDetails.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setRoutes((current) =>
      current.map((route) =>
        route.id === editingDetails.id
          ? data
          : route
      )
    );

    setMessage(`Route ${trimmedCode} updated successfully.`);

    closeEditDetails();

    setSaving(false);
  }

  async function duplicateRoute(route) {
    if (!canEdit) {
      return;
    }

    const sourceCode = route.route_code || "ROUTE";
    const duplicateCode = `${sourceCode}-COPY`;
    const duplicateName = `${route.name} Copy`;

    const confirmed = window.confirm(
      `Duplicate ${sourceCode} as ${duplicateCode}?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { data: newRoute, error: routeError } = await supabase
      .from("routes")
      .insert({
        route_code: duplicateCode,
        name: duplicateName,
        description: route.description || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (routeError) {
      setError(routeError.message);
      return;
    }

    const { data: sourcePoints, error: pointsError } = await supabase
      .from("route_points")
      .select("*")
      .eq("route_id", route.id)
      .order("sequence");

    if (pointsError) {
      await supabase
        .from("routes")
        .delete()
        .eq("id", newRoute.id);

      setError(pointsError.message);
      return;
    }

    if ((sourcePoints || []).length > 0) {
      const copiedPoints = sourcePoints.map((point, index) => ({
        route_id: newRoute.id,
        sequence: index + 1,
        x: Number(point.x),
        y: Number(point.y),
        z: Number(point.z),
        point_type: point.point_type || "STRAIGHT",
      }));

      const { error: insertPointsError } = await supabase
        .from("route_points")
        .insert(copiedPoints);

      if (insertPointsError) {
        await supabase
          .from("route_points")
          .delete()
          .eq("route_id", newRoute.id);

        await supabase
          .from("routes")
          .delete()
          .eq("id", newRoute.id);

        setError(insertPointsError.message);
        return;
      }
    }

    setMessage(`Route ${duplicateCode} created from ${sourceCode}.`);

    await loadRoutes(false);
  }

  async function deleteRoute(route) {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete route ${route.route_code || route.name}? This will also delete all route points.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: pointsError } = await supabase
      .from("route_points")
      .delete()
      .eq("route_id", route.id);

    if (pointsError) {
      setError(pointsError.message);
      return;
    }

    const { error: routeError } = await supabase
      .from("routes")
      .delete()
      .eq("id", route.id);

    if (routeError) {
      setError(routeError.message);
      return;
    }

    if (editingRoute?.id === route.id) {
      setEditingRoute(null);
    }

    if (previewRoute?.id === route.id) {
      setPreviewRoute(null);
    }

    setMessage(`Route ${route.route_code || route.name} deleted.`);

    await loadRoutes(false);
  }

  const filteredRoutes = routes.filter((route) => {
    const code = String(route.route_code || "");
    const routeName = String(route.name || "");
    const descriptionText = String(route.description || "");
    const status = String(route.status || "UNKNOWN").toUpperCase();

    const haystack = `${code} ${routeName} ${descriptionText}`.toLowerCase();

    const matchesSearch =
      !search.trim() ||
      haystack.includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = routes.filter(
    (route) => String(route.status).toUpperCase() === "ACTIVE"
  ).length;

  const inactiveCount = routes.filter(
    (route) => String(route.status).toUpperCase() === "INACTIVE"
  ).length;

  const archivedCount = routes.filter(
    (route) => String(route.status).toUpperCase() === "ARCHIVED"
  ).length;

  const totalPoints = Object.values(routePointCounts).reduce(
    (total, count) => total + count,
    0
  );

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">OPERATIONS / ROUTING</div>
            <h2>Routes</h2>
            <p>Manage transportation routes and route geometry.</p>
          </div>
        </div>

        <div className="panel">
          <div className="empty">Loading routes...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="eyebrow">OPERATIONS / ROUTING</div>
          <h2>Routes</h2>
          <p>Build, maintain, preview, and manage fleet route definitions.</p>
        </div>

        <div className="page-header-actions">
          {canEdit && (
            <button
              className="primary-button"
              onClick={openNewRoute}
            >
              + New Route
            </button>
          )}

          <button
            className="secondary-button"
            onClick={() => loadRoutes(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            className="secondary-button"
            onClick={() => setAllRoutesOpen(true)}
          >
            View All Routes
          </button>
        </div>
      </div>

      {error && !showForm && !editingDetails && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {message && !showForm && !editingDetails && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      <div className="dashboard-secondary-stats">
        <Stat title="Total Routes" value={routes.length} />
        <Stat title="Active" value={activeCount} />
        <Stat title="Inactive" value={inactiveCount} />
        <Stat title="Archived" value={archivedCount} />
        <Stat title="Route Points" value={totalPoints} />
      </div>

      <div className="panel">
        <div className="toolbar-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search route code, name, or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="status-filter">
            {[
              ["ALL", "All"],
              ["ACTIVE", "Active"],
              ["INACTIVE", "Inactive"],
              ["ARCHIVED", "Archived"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-button ${statusFilter === value ? "active" : ""}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">ROUTE REGISTRY</div>
            <h3>Transportation Routes</h3>
            <p>
              Showing {filteredRoutes.length} of {routes.length} routes
            </p>
          </div>
        </div>

        {filteredRoutes.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Route</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Points</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.id}>
                    <td>
                      <strong>{route.route_code || "—"}</strong>
                    </td>

                    <td>
                      <strong>{route.name}</strong>
                    </td>

                    <td className="table-description">
                      {route.description || "No description"}
                    </td>

                    <td>
                      <StatusBadge status={route.status} />
                    </td>

                    <td>
                      {routePointCounts[String(route.id)] || 0}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action-button"
                          onClick={() => setPreviewRoute(route)}
                        >
                          Preview
                        </button>

                        {canEdit && (
                          <>
                            <button
                              className="table-action-button"
                              onClick={() => setEditingRoute(route)}
                            >
                              Edit Route
                            </button>

                            <button
                              className="table-action-button"
                              onClick={() => openEditDetails(route)}
                            >
                              Edit Details
                            </button>

                            <button
                              className="table-action-button"
                              onClick={() => duplicateRoute(route)}
                            >
                              Duplicate
                            </button>

                            <button
                              className="table-action-button danger"
                              onClick={() => deleteRoute(route)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={closeNewRoute}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">ROUTE REGISTRY</div>
                <h3>New Route</h3>
                <p>Create the route definition before adding route geometry.</p>
              </div>

              <button
                className="icon-button"
                onClick={closeNewRoute}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={createRoute}>
              <div className="form-grid">
                <label>
                  <span>Route Code</span>
                  <input
                    className="text-input"
                    value={routeCode}
                    onChange={(event) => setRouteCode(event.target.value)}
                    placeholder="e.g. R-101"
                    autoFocus
                  />
                </label>

                <label>
                  <span>Route Name</span>
                  <input
                    className="text-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. North Elementary"
                  />
                </label>

                <label className="form-span-full">
                  <span>Description</span>
                  <textarea
                    className="textarea-input"
                    rows="4"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the route..."
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeNewRoute}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
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
        <div className="modal-backdrop" onMouseDown={closeEditDetails}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">ROUTE RECORD</div>
                <h3>Edit Route Details</h3>
                <p>Update the route's registry information.</p>
              </div>

              <button
                className="icon-button"
                onClick={closeEditDetails}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={saveRouteDetails}>
              <div className="form-grid">
                <label>
                  <span>Route Code</span>
                  <input
                    className="text-input"
                    value={editRouteCode}
                    onChange={(event) => setEditRouteCode(event.target.value)}
                  />
                </label>

                <label>
                  <span>Route Name</span>
                  <input
                    className="text-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <label className="form-span-full">
                  <span>Description</span>
                  <textarea
                    className="textarea-input"
                    rows="5"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeEditDetails}
                  disabled={saving}
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
          </div>
        </div>
      )}

      {editingRoute && (
        <RoutePointEditor
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSaved={async () => {
            setEditingRoute(null);
            await loadRoutes(false);
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

function RoutePointEditor({ route, onClose, onSaved }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const PIXELS_PER_STUD = IMAGE_SIZE / 6144;

  function robloxToMap(x, z) {
    const imageX = (ROBLOX_HALF_SIZE - Number(x)) * PIXELS_PER_STUD;
    const imageY = (ROBLOX_HALF_SIZE + Number(z)) * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  function mapToRoblox(lat, lng) {
    const imageY = Number(lat);
    const imageX = Number(lng);

    return {
      x: ROBLOX_HALF_SIZE - imageX / PIXELS_PER_STUD,
      z: imageY / PIXELS_PER_STUD - ROBLOX_HALF_SIZE,
    };
  }

  async function loadPoints() {
    setLoading(true);
    setError("");

    const { data, error: pointsError } = await supabase
      .from("route_points")
      .select("*")
      .eq("route_id", route.id)
      .order("sequence");

    if (pointsError) {
      setError(pointsError.message);
      setLoading(false);
      return;
    }

    setPoints(
      (data || []).map((point, index) => ({
        ...point,
        sequence: index + 1,
        x: Number(point.x),
        y: Number(point.y),
        z: Number(point.z),
        point_type: point.point_type || "STRAIGHT",
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    loadPoints();
  }, [route.id]);

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

    L.imageOverlay(
      `${import.meta.env.BASE_URL}map.png`,
      bounds
    ).addTo(map);

    map.fitBounds(bounds);

    map.setMaxBounds([
      [-IMAGE_SIZE * 0.15, -IMAGE_SIZE * 0.15],
      [IMAGE_SIZE * 1.15, IMAGE_SIZE * 1.15],
    ]);

    map.on("click", (event) => {
      const roblox = mapToRoblox(
        event.latlng.lat,
        event.latlng.lng
      );

      setPoints((current) => [
        ...current,
        {
          id: `new-${Date.now()}-${Math.random()}`,
          route_id: route.id,
          sequence: current.length + 1,
          x: roblox.x,
          y: 0,
          z: roblox.z,
          point_type: "STRAIGHT",
          isNew: true,
        },
      ]);
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapInstanceRef.current = null;
    };
  }, [route.id]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!points.length) {
      return;
    }

    const latLngs = points.map((point) =>
      robloxToMap(point.x, point.z)
    );

    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const position = robloxToMap(point.x, point.z);

      const marker = L.marker(position, {
        draggable: true,
        icon: L.divIcon({
          className: "route-point-icon",
          html: `<div class="route-point-marker">${index + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map);

      marker.on("dragend", () => {
        const nextPosition = marker.getLatLng();
        const roblox = mapToRoblox(
          nextPosition.lat,
          nextPosition.lng
        );

        setPoints((current) =>
          current.map((currentPoint, currentIndex) =>
            currentIndex === index
              ? {
                  ...currentPoint,
                  x: roblox.x,
                  z: roblox.z,
                }
              : currentPoint
          )
        );
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [points]);

  function updatePoint(index, field, value) {
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              [field]: value,
            }
          : point
      )
    );
  }

  function deletePoint(index) {
    setPoints((current) =>
      current
        .filter((_, pointIndex) => pointIndex !== index)
        .map((point, pointIndex) => ({
          ...point,
          sequence: pointIndex + 1,
        }))
    );
  }

  function movePoint(index, direction) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= points.length) {
      return;
    }

    setPoints((current) => {
      const next = [...current];
      const temporary = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = temporary;

      return next.map((point, pointIndex) => ({
        ...point,
        sequence: pointIndex + 1,
      }));
    });
  }

  async function savePoints() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const existingPoints = points.filter((point) => !point.isNew);
    const currentIds = new Set(
      existingPoints.map((point) => String(point.id))
    );

    const { data: databasePoints, error: databaseError } = await supabase
      .from("route_points")
      .select("id")
      .eq("route_id", route.id);

    if (databaseError) {
      setError(databaseError.message);
      setSaving(false);
      return;
    }

    const removedIds = (databasePoints || [])
      .map((point) => point.id)
      .filter((id) => !currentIds.has(String(id)));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("route_points")
        .delete()
        .in("id", removedIds);

      if (deleteError) {
        setError(deleteError.message);
        setSaving(false);
        return;
      }
    }

    for (const point of points) {
      if (point.isNew) {
        const { error: insertError } = await supabase
          .from("route_points")
          .insert({
            route_id: route.id,
            sequence: point.sequence,
            x: Number(point.x),
            y: Number(point.y),
            z: Number(point.z),
            point_type: point.point_type || "STRAIGHT",
          });

        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }
      } else {
        const { error: updateError } = await supabase
          .from("route_points")
          .update({
            sequence: point.sequence,
            x: Number(point.x),
            y: Number(point.y),
            z: Number(point.z),
            point_type: point.point_type || "STRAIGHT",
          })
          .eq("id", point.id);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      }
    }

    setMessage("Route geometry saved.");

    await loadPoints();

    setSaving(false);

    if (onSaved) {
      await onSaved();
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal route-editor-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">ROUTE GEOMETRY</div>
            <h3>
              {route.route_code || route.name}
            </h3>
            <p>
              Click the map to add points. Drag existing points to reposition them.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {loading ? (
          <div className="empty">
            Loading route geometry...
          </div>
        ) : (
          <div className="route-editor-layout">
            <div className="route-editor-map">
              <div ref={mapRef} className="route-map-canvas" />
            </div>

            <div className="route-points-panel">
              <div className="panel-header">
                <div>
                  <h3>Route Points</h3>
                  <p>{points.length} points</p>
                </div>
              </div>

              {points.length === 0 ? (
                <div className="empty">
                  No route points. Click the map to create the first point.
                </div>
              ) : (
                <div className="route-points-list">
                  {points.map((point, index) => (
                    <div
                      className="route-point-row"
                      key={point.id}
                    >
                      <div className="route-point-number">
                        {index + 1}
                      </div>

                      <div className="route-point-fields">
                        <div className="route-point-coordinates">
                          <label>
                            <span>X</span>
                            <input
                              className="text-input"
                              type="number"
                              step="0.01"
                              value={point.x}
                              onChange={(event) =>
                                updatePoint(
                                  index,
                                  "x",
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>

                          <label>
                            <span>Y</span>
                            <input
                              className="text-input"
                              type="number"
                              step="0.01"
                              value={point.y}
                              onChange={(event) =>
                                updatePoint(
                                  index,
                                  "y",
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>

                          <label>
                            <span>Z</span>
                            <input
                              className="text-input"
                              type="number"
                              step="0.01"
                              value={point.z}
                              onChange={(event) =>
                                updatePoint(
                                  index,
                                  "z",
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>
                        </div>

                        <label>
                          <span>Point Type</span>
                          <select
                            className="select-input"
                            value={point.point_type || "STRAIGHT"}
                            onChange={(event) =>
                              updatePoint(
                                index,
                                "point_type",
                                event.target.value
                              )
                            }
                          >
                            <option value="STRAIGHT">Straight</option>
                            <option value="STOP">Stop</option>
                            <option value="TURN">Turn</option>
                            <option value="WAYPOINT">Waypoint</option>
                            <option value="DEPOT">Depot</option>
                            <option value="SCHOOL">School</option>
                          </select>
                        </label>
                      </div>

                      <div className="route-point-actions">
                        <button
                          className="table-action-button"
                          onClick={() => movePoint(index, -1)}
                          disabled={index === 0}
                        >
                          ↑
                        </button>

                        <button
                          className="table-action-button"
                          onClick={() => movePoint(index, 1)}
                          disabled={index === points.length - 1}
                        >
                          ↓
                        </button>

                        <button
                          className="table-action-button danger"
                          onClick={() => deletePoint(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button
            className="secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>

          <button
            className="primary-button"
            onClick={savePoints}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Route"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutePreview({ route, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const PIXELS_PER_STUD = IMAGE_SIZE / 6144;

  function robloxToMap(x, z) {
    const imageX = (ROBLOX_HALF_SIZE - Number(x)) * PIXELS_PER_STUD;
    const imageY = (ROBLOX_HALF_SIZE + Number(z)) * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  async function loadPoints() {
    setLoading(true);
    setError("");

    const { data, error: pointsError } = await supabase
      .from("route_points")
      .select("*")
      .eq("route_id", route.id)
      .order("sequence");

    if (pointsError) {
      setError(pointsError.message);
      setLoading(false);
      return;
    }

    setPoints(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPoints();
  }, [route.id]);

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

    L.imageOverlay(
      `${import.meta.env.BASE_URL}map.png`,
      bounds
    ).addTo(map);

    map.fitBounds(bounds);

    map.setMaxBounds([
      [-IMAGE_SIZE * 0.15, -IMAGE_SIZE * 0.15],
      [IMAGE_SIZE * 1.15, IMAGE_SIZE * 1.15],
    ]);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !points.length) {
      return;
    }

    const latLngs = points.map((point) =>
      robloxToMap(point.x, point.z)
    );

    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        weight: 6,
        opacity: 0.95,
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const marker = L.marker(
        robloxToMap(point.x, point.z),
        {
          icon: L.divIcon({
            className: "route-point-icon",
            html: `<div class="route-point-marker">${index + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }
      ).addTo(map);

      marker.bindTooltip(
        `Point ${index + 1} · ${point.point_type || "STRAIGHT"}`,
        {
          direction: "top",
        }
      );
    });
  }, [points]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal route-preview-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">ROUTE PREVIEW</div>
            <h3>
              {route.route_code || route.name}
            </h3>
            <p>{route.name}</p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="route-preview-layout">
          <div className="route-preview-map">
            <div ref={mapRef} className="route-map-canvas" />

            {loading && (
              <div className="route-map-loading">
                Loading route...
              </div>
            )}
          </div>

          <div className="route-preview-info">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">ROUTE INFORMATION</div>
                  <h3>Overview</h3>
                </div>
              </div>

              <div className="detail-grid">
                <Detail
                  label="Route Code"
                  value={route.route_code || "—"}
                />

                <Detail
                  label="Name"
                  value={route.name || "—"}
                />

                <Detail
                  label="Status"
                  value={route.status || "—"}
                />

                <Detail
                  label="Points"
                  value={points.length}
                />
              </div>

              {route.description && (
                <div className="detail-notes">
                  <span className="detail-label">Description</span>
                  <p>{route.description}</p>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">GEOMETRY</div>
                  <h3>Route Points</h3>
                </div>
              </div>

              {points.length === 0 ? (
                <Empty />
              ) : (
                <div className="route-preview-points">
                  {points.map((point, index) => (
                    <div
                      className="route-preview-point"
                      key={point.id}
                    >
                      <strong>{index + 1}</strong>

                      <div>
                        <span>
                          {point.point_type || "STRAIGHT"}
                        </span>

                        <small>
                          X {Number(point.x).toFixed(1)} ·
                          Y {Number(point.y).toFixed(1)} ·
                          Z {Number(point.z).toFixed(1)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="secondary-button"
            onClick={onClose}
          >
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
  const [routePoints, setRoutePoints] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleRoutes, setVisibleRoutes] = useState(
    new Set(routes.map((route) => String(route.id)))
  );

  const IMAGE_SIZE = 1055;
  const ROBLOX_HALF_SIZE = 3072;
  const PIXELS_PER_STUD = IMAGE_SIZE / 6144;

  const routeLineTypes = [
    "solid",
    "dashed",
    "dotted",
  ];

  function robloxToMap(x, z) {
    const imageX = (ROBLOX_HALF_SIZE - Number(x)) * PIXELS_PER_STUD;
    const imageY = (ROBLOX_HALF_SIZE + Number(z)) * PIXELS_PER_STUD;

    return [imageY, imageX];
  }

  async function loadPoints() {
    setLoading(true);
    setError("");

    const { data, error: pointsError } = await supabase
      .from("route_points")
      .select("*")
      .in(
        "route_id",
        routes.map((route) => route.id)
      )
      .order("sequence");

    if (pointsError) {
      setError(pointsError.message);
      setLoading(false);
      return;
    }

    const grouped = {};

    (data || []).forEach((point) => {
      const routeId = String(point.route_id);

      if (!grouped[routeId]) {
        grouped[routeId] = [];
      }

      grouped[routeId].push(point);
    });

    setRoutePoints(grouped);
    setLoading(false);
  }

  useEffect(() => {
    loadPoints();
  }, []);

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

    L.imageOverlay(
      `${import.meta.env.BASE_URL}map.png`,
      bounds
    ).addTo(map);

    map.fitBounds(bounds);

    map.setMaxBounds([
      [-IMAGE_SIZE * 0.15, -IMAGE_SIZE * 0.15],
      [IMAGE_SIZE * 1.15, IMAGE_SIZE * 1.15],
    ]);

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

    const layers = [];

    routes.forEach((route, routeIndex) => {
      if (!visibleRoutes.has(String(route.id))) {
        return;
      }

      const points = routePoints[String(route.id)] || [];

      if (points.length < 2) {
        return;
      }

      const latLngs = points.map((point) =>
        robloxToMap(point.x, point.z)
      );

      const dashArray =
        routeLineTypes[routeIndex % routeLineTypes.length] === "dashed"
          ? "10 8"
          : routeLineTypes[routeIndex % routeLineTypes.length] === "dotted"
            ? "2 8"
            : undefined;

      const line = L.polyline(latLngs, {
        weight: 4,
        opacity: 0.8,
        dashArray,
      }).addTo(map);

      line.bindTooltip(
        route.route_code
          ? `${route.route_code} — ${route.name}`
          : route.name,
        {
          sticky: true,
        }
      );

      layers.push(line);
    });

    return () => {
      layers.forEach((layer) => layer.remove());
    };
  }, [routes, routePoints, visibleRoutes]);

  function toggleRoute(routeId) {
    setVisibleRoutes((current) => {
      const next = new Set(current);

      if (next.has(String(routeId))) {
        next.delete(String(routeId));
      } else {
        next.add(String(routeId));
      }

      return next;
    });
  }

  function showAll() {
    setVisibleRoutes(
      new Set(routes.map((route) => String(route.id)))
    );
  }

  function hideAll() {
    setVisibleRoutes(new Set());
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal route-all-preview-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">ROUTE NETWORK</div>
            <h3>All Routes</h3>
            <p>
              Visual overview of the configured transportation network.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="all-routes-layout">
          <div className="all-routes-map">
            <div ref={mapRef} className="route-map-canvas" />

            {loading && (
              <div className="route-map-loading">
                Loading routes...
              </div>
            )}
          </div>

          <div className="all-routes-sidebar">
            <div className="all-routes-sidebar-header">
              <div>
                <span className="detail-label">VISIBLE ROUTES</span>
                <strong>
                  {visibleRoutes.size} / {routes.length}
                </strong>
              </div>

              <div className="table-actions">
                <button
                  className="table-action-button"
                  onClick={showAll}
                >
                  All
                </button>

                <button
                  className="table-action-button"
                  onClick={hideAll}
                >
                  None
                </button>
              </div>
            </div>

            <div className="all-routes-list">
              {routes.map((route) => {
                const active =
                  visibleRoutes.has(String(route.id));

                const pointCount =
                  routePoints[String(route.id)]?.length || 0;

                return (
                  <button
                    key={route.id}
                    className={`all-route-item ${active ? "active" : ""}`}
                    onClick={() => toggleRoute(route.id)}
                  >
                    <div>
                      <strong>
                        {route.route_code || route.name}
                      </strong>

                      <span>
                        {route.name}
                      </span>
                    </div>

                    <div className="all-route-item-meta">
                      <span>{pointCount} pts</span>
                      <StatusBadge status={route.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="secondary-button"
            onClick={onClose}
          >
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingRepairId, setCompletingRepairId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    vehicle_id: "",
    maintenance_type: "PREVENTIVE",
    description: "",
    mileage: "",
    performed_by: "",
    cost: "",
    status: "SCHEDULED",
    performed_at: "",
    due_at: "",
    due_mileage: "",
    recurrence_days: "",
    recurrence_miles: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [maintenanceResult, vehicleResult] = await Promise.all([
      supabase
        .from("maintenance_records")
        .select(`
          *,
          vehicles (
            id,
            fleet_number,
            year,
            make,
            model,
            garage,
            mileage,
            status
          )
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicles")
        .select("id,fleet_number,year,make,model,garage,mileage,status")
        .order("fleet_number"),
    ]);

    if (maintenanceResult.error) {
      setError(maintenanceResult.error.message);
    } else {
      setRecords(maintenanceResult.data || []);
    }

    if (vehicleResult.error) {
      setError(vehicleResult.error.message);
    } else {
      setVehicles(vehicleResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRecords = records.filter((record) => {
    const vehicle = record.vehicles;

    const matchesSearch =
      !normalizedSearch ||
      String(vehicle?.fleet_number || "").toLowerCase().includes(normalizedSearch) ||
      String(record.maintenance_type || "").toLowerCase().includes(normalizedSearch) ||
      String(record.description || "").toLowerCase().includes(normalizedSearch) ||
      String(record.performed_by || "").toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === "ALL" || record.status === statusFilter;

    const matchesType = typeFilter === "ALL" || record.maintenance_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const openRecords = records.filter((record) => ["SCHEDULED", "IN_PROGRESS", "OVERDUE"].includes(record.status));
  const scheduledRecords = records.filter((record) => record.status === "SCHEDULED");
  const inProgressRecords = records.filter((record) => record.status === "IN_PROGRESS");
  const overdueRecords = records.filter((record) => record.status === "OVERDUE");
  const completedRecords = records.filter((record) => record.status === "COMPLETED");

  const maintenanceVehicles = vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE");

  const maintenanceTypes = [...new Set(records.map((record) => record.maintenance_type).filter(Boolean))];

  function resetForm() {
    setForm({
      vehicle_id: "",
      maintenance_type: "PREVENTIVE",
      description: "",
      mileage: "",
      performed_by: "",
      cost: "",
      status: "SCHEDULED",
      performed_at: "",
      due_at: "",
      due_mileage: "",
      recurrence_days: "",
      recurrence_miles: "",
    });
  }

  async function createMaintenanceRecord(event) {
    event.preventDefault();

    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      vehicle_id: form.vehicle_id,
      maintenance_type: form.maintenance_type,
      description: form.description.trim() || null,
      mileage: form.mileage === "" ? null : Number(form.mileage),
      performed_by: form.performed_by.trim() || null,
      cost: form.cost === "" ? 0 : Number(form.cost),
      status: form.status,
      performed_at: form.performed_at || null,
      due_at: form.due_at || null,
      due_mileage: form.due_mileage === "" ? null : Number(form.due_mileage),
      recurrence_days: form.recurrence_days === "" ? null : Number(form.recurrence_days),
      recurrence_miles: form.recurrence_miles === "" ? null : Number(form.recurrence_miles),
    };

    const { error: insertError } = await supabase.from("maintenance_records").insert(payload);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setMessage("Maintenance record created.");
    setShowCreate(false);
    resetForm();
    await loadData();
    setSaving(false);
  }

  async function updateStatus(record, status) {
    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const update = {
      status,
      performed_at: status === "COMPLETED" ? new Date().toISOString() : record.performed_at,
    };

    const { error: updateError } = await supabase
      .from("maintenance_records")
      .update(update)
      .eq("id", record.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage(`Service order marked ${status.toLowerCase().replace("_", " ")}.`);
    setSelectedRecord(null);
    await loadData();
    setSaving(false);
  }

  async function startDefectRepair(record) {
    if (!canEdit || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc("start_vehicle_repair", {
      p_maintenance_id: record.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setMessage("Repair started.");
    await loadData();
    setSaving(false);
  }

  async function completeDefectRepair(record) {
    if (!canEdit || completingRepairId) {
      return;
    }

    setCompletingRepairId(record.id);
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc("complete_vehicle_repair", {
      p_maintenance_id: record.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCompletingRepairId("");
      return;
    }

    setMessage("Repair completed. Defect marked as repaired.");
    setSelectedRecord(null);

    await loadData();

    setCompletingRepairId("");
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
    });
  }

  function statusClass(status) {
    if (status === "COMPLETED") {
      return "status-badge status-online";
    }

    if (status === "IN_PROGRESS") {
      return "status-badge status-info";
    }

    if (status === "OVERDUE") {
      return "status-badge status-danger";
    }

    if (status === "CANCELLED") {
      return "status-badge status-offline";
    }

    return "status-badge status-warning";
  }

  return (
    <>
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">SERVICE OPERATIONS</div>
            <h1>Maintenance</h1>
            <p>Manage vehicle service orders, repairs, scheduling, and maintenance history.</p>
          </div>

          <div className="page-header-actions">
            <button className="button button-secondary" onClick={loadData} disabled={loading}>
              Refresh
            </button>

            {canEdit && (
              <button className="button button-primary" onClick={() => setShowCreate(true)}>
                New Service Order
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Open Service Orders</span>
            <strong>{openRecords.length}</strong>
            <span className="stat-meta">Requires action</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Scheduled</span>
            <strong>{scheduledRecords.length}</strong>
            <span className="stat-meta">Upcoming service</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">In Progress</span>
            <strong>{inProgressRecords.length}</strong>
            <span className="stat-meta">Currently being serviced</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Overdue</span>
            <strong>{overdueRecords.length}</strong>
            <span className="stat-meta">Past scheduled deadline</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Fleet in Maintenance</span>
            <strong>{maintenanceVehicles.length}</strong>
            <span className="stat-meta">Vehicles unavailable</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Completed</span>
            <strong>{completedRecords.length}</strong>
            <span className="stat-meta">Service records</span>
          </div>
        </div>

        <div className="content-grid-2">
          <section className="panel">
            <PanelTitle title="Service Queue" />

            <div className="toolbar">
              <div className="search-box">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fleet, service type, description..."
                />
              </div>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="OVERDUE">Overdue</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="ALL">All service types</option>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="empty-state">Loading maintenance records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state">No maintenance records match the current filters.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Service</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th>Technician</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map((record) => {
                      const vehicle = record.vehicles;

                      return (
                        <tr key={record.id}>
                          <td>
                            <div className="table-primary">{vehicle?.fleet_number || "—"}</div>
                            <div className="table-secondary">
                              {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle unavailable"}
                            </div>
                          </td>

                          <td>
                            <span className="table-primary">{record.maintenance_type?.replaceAll("_", " ") || "Service"}</span>
                          </td>

                          <td>
                            <div className="table-description">{record.description || "No description provided"}</div>
                          </td>

                          <td>
                            <span className={statusClass(record.status)}>
                              {record.status?.replaceAll("_", " ") || "UNKNOWN"}
                            </span>
                          </td>

                          <td>
                            <div className="table-primary">{formatDate(record.due_at)}</div>
                            {record.due_mileage && (
                              <div className="table-secondary">{Number(record.due_mileage).toLocaleString()} mi</div>
                            )}
                          </td>

                          <td>{record.performed_by || "—"}</td>

                          <td>
                            <button className="button button-small button-secondary" onClick={() => setSelectedRecord(record)}>
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
          </section>

          <section className="panel">
            <PanelTitle title="Vehicles Requiring Service" />

            {maintenanceVehicles.length === 0 ? (
              <div className="empty-state">No vehicles are currently marked for maintenance.</div>
            ) : (
              <div className="dashboard-list">
                {maintenanceVehicles.map((vehicle) => {
                  const vehicleOrders = records.filter((record) => record.vehicle_id === vehicle.id && record.status !== "COMPLETED");

                  return (
                    <div className="dashboard-list-item" key={vehicle.id}>
                      <div>
                        <strong>{vehicle.fleet_number}</strong>
                        <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
                      </div>

                      <div className="dashboard-list-item-right">
                        <span>{vehicle.garage || "—"}</span>
                        <span className="status-badge status-danger">
                          {vehicleOrders.length} open
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={() => !saving && setShowCreate(false)}>
          <div className="modal modal-large" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">SERVICE OPERATIONS</div>
                <h2>New Service Order</h2>
              </div>

              <button className="icon-button" onClick={() => !saving && setShowCreate(false)}>×</button>
            </div>

            <form onSubmit={createMaintenanceRecord}>
              <div className="form-grid">
                <label>
                  <span>Vehicle</span>
                  <select required value={form.vehicle_id} onChange={(event) => setForm({ ...form, vehicle_id: event.target.value })}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.fleet_number} — {vehicle.year} {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Maintenance Type</span>
                  <input
                    value={form.maintenance_type}
                    onChange={(event) => setForm({ ...form, maintenance_type: event.target.value })}
                    placeholder="PREVENTIVE"
                  />
                </label>

                <label className="form-span-2">
                  <span>Description</span>
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the service required..."
                  />
                </label>

                <label>
                  <span>Current Mileage</span>
                  <input type="number" min="0" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: event.target.value })} />
                </label>

                <label>
                  <span>Cost</span>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
                </label>

                <label>
                  <span>Technician / Performed By</span>
                  <input value={form.performed_by} onChange={(event) => setForm({ ...form, performed_by: event.target.value })} />
                </label>

                <label>
                  <span>Status</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>

                <label>
                  <span>Due Date</span>
                  <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
                </label>

                <label>
                  <span>Due Mileage</span>
                  <input type="number" min="0" value={form.due_mileage} onChange={(event) => setForm({ ...form, due_mileage: event.target.value })} />
                </label>

                <label>
                  <span>Recurrence Days</span>
                  <input type="number" min="0" value={form.recurrence_days} onChange={(event) => setForm({ ...form, recurrence_days: event.target.value })} />
                </label>

                <label>
                  <span>Recurrence Miles</span>
                  <input type="number" min="0" value={form.recurrence_miles} onChange={(event) => setForm({ ...form, recurrence_miles: event.target.value })} />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowCreate(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Service Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedRecord(null)}>
          <div className="modal modal-large" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">SERVICE ORDER</div>
                <h2>
                  Fleet {selectedRecord.vehicles?.fleet_number || "—"}
                </h2>
              </div>

              <button className="icon-button" onClick={() => setSelectedRecord(null)}>×</button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Vehicle</span>
                <strong>{selectedRecord.vehicles ? `${selectedRecord.vehicles.year} ${selectedRecord.vehicles.make} ${selectedRecord.vehicles.model}` : "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Garage</span>
                <strong>{selectedRecord.vehicles?.garage || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Maintenance Type</span>
                <strong>{selectedRecord.maintenance_type?.replaceAll("_", " ") || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Status</span>
                <strong>
                  <span className={statusClass(selectedRecord.status)}>
                    {selectedRecord.status?.replaceAll("_", " ")}
                  </span>
                </strong>
              </div>

              <div className="detail-item">
                <span>Service Mileage</span>
                <strong>{selectedRecord.mileage ? `${Number(selectedRecord.mileage).toLocaleString()} mi` : "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Due Mileage</span>
                <strong>{selectedRecord.due_mileage ? `${Number(selectedRecord.due_mileage).toLocaleString()} mi` : "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Due Date</span>
                <strong>{formatDateTime(selectedRecord.due_at)}</strong>
              </div>

              <div className="detail-item">
                <span>Performed By</span>
                <strong>{selectedRecord.performed_by || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Cost</span>
                <strong>${Number(selectedRecord.cost || 0).toFixed(2)}</strong>
              </div>

              <div className="detail-item">
                <span>Created</span>
                <strong>{formatDateTime(selectedRecord.created_at)}</strong>
              </div>
            </div>

            <div className="detail-section">
              <span className="detail-section-title">Description</span>
              <div className="detail-notes">
                {selectedRecord.description || "No description provided."}
              </div>
            </div>

            <div className="modal-footer">
              {canEdit && selectedRecord.status === "SCHEDULED" && (
                <button className="button button-secondary" onClick={() => updateStatus(selectedRecord, "IN_PROGRESS")} disabled={saving}>
                  Start Service
                </button>
              )}

              {canEdit && selectedRecord.status === "IN_PROGRESS" && selectedRecord.defect_id && (
                <button className="button button-primary" onClick={() => completeDefectRepair(selectedRecord)} disabled={completingRepairId === selectedRecord.id}>
                  {completingRepairId === selectedRecord.id ? "Completing..." : "Complete Repair"}
                </button>
              )}

              {canEdit && selectedRecord.status === "IN_PROGRESS" && !selectedRecord.defect_id && (
                <button className="button button-primary" onClick={() => updateStatus(selectedRecord, "COMPLETED")} disabled={saving}>
                  Complete Service
                </button>
              )}

              {canEdit && !["COMPLETED", "CANCELLED"].includes(selectedRecord.status) && (
                <button className="button button-danger" onClick={() => updateStatus(selectedRecord, "CANCELLED")} disabled={saving}>
                  Cancel
                </button>
              )}

              <button className="button button-secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Audits() {
  const [audits, setAudits] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showInspection, setShowInspection] = useState(false);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [inspection, setInspection] = useState({
    vehicle_id: "",
    audit_type: "DAILY",
    notes: "",
  });

  const [checklist, setChecklist] = useState({
    brakes: { result: "PASS", severity: "MAJOR", notes: "" },
    steering: { result: "PASS", severity: "CRITICAL", notes: "" },
    tires: { result: "PASS", severity: "MAJOR", notes: "" },
    suspension: { result: "PASS", severity: "MAJOR", notes: "" },
    mirrors: { result: "PASS", severity: "MINOR", notes: "" },
    windshield: { result: "PASS", severity: "MINOR", notes: "" },
    wipers: { result: "PASS", severity: "MINOR", notes: "" },
    horn: { result: "PASS", severity: "MINOR", notes: "" },
    seat_belts: { result: "PASS", severity: "MAJOR", notes: "" },
    emergency_exits: { result: "PASS", severity: "CRITICAL", notes: "" },
    stop_arm: { result: "PASS", severity: "CRITICAL", notes: "" },
    crossing_gate: { result: "PASS", severity: "CRITICAL", notes: "" },
    headlights: { result: "PASS", severity: "MAJOR", notes: "" },
    turn_signals: { result: "PASS", severity: "MAJOR", notes: "" },
    brake_lights: { result: "PASS", severity: "MAJOR", notes: "" },
    warning_lights: { result: "PASS", severity: "CRITICAL", notes: "" },
    body_condition: { result: "PASS", severity: "MINOR", notes: "" },
    fluids: { result: "PASS", severity: "MAJOR", notes: "" },
    coolant: { result: "PASS", severity: "MAJOR", notes: "" },
    oil: { result: "PASS", severity: "MAJOR", notes: "" },
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [auditResult, vehicleResult] = await Promise.all([
      supabase
        .from("audits")
        .select(`
          *,
          vehicles (
            id,
            fleet_number,
            year,
            make,
            model,
            garage,
            status
          ),
          drivers (
            id,
            name,
            employee_number
          )
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicles")
        .select("id,fleet_number,year,make,model,garage,status")
        .order("fleet_number"),
    ]);

    if (auditResult.error) {
      setError(auditResult.error.message);
    } else {
      setAudits(auditResult.data || []);
    }

    if (vehicleResult.error) {
      setError(vehicleResult.error.message);
    } else {
      setVehicles(vehicleResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAudits = audits.filter((audit) => {
    const fleetNumber = audit.vehicles?.fleet_number || "";
    const driverName = audit.drivers?.name || "";

    const matchesSearch =
      !normalizedSearch ||
      String(fleetNumber).toLowerCase().includes(normalizedSearch) ||
      String(driverName).toLowerCase().includes(normalizedSearch) ||
      String(audit.audit_type || "").toLowerCase().includes(normalizedSearch);

    const matchesResult = resultFilter === "ALL" || audit.result === resultFilter;
    const matchesType = typeFilter === "ALL" || audit.audit_type === typeFilter;

    return matchesSearch && matchesResult && matchesType;
  });

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const todayAudits = audits.filter((audit) => {
    if (!audit.created_at) {
      return false;
    }

    return new Date(audit.created_at) >= todayStart;
  });

  const passCount = audits.filter((audit) => audit.result === "PASS").length;
  const failCount = audits.filter((audit) => audit.result === "FAIL").length;
  const pendingCount = audits.filter((audit) => audit.result === "PENDING").length;
  const failedVehicles = vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE");

  const auditTypes = [...new Set(audits.map((audit) => audit.audit_type).filter(Boolean))];

  function resetInspection() {
    setInspection({
      vehicle_id: "",
      audit_type: "DAILY",
      notes: "",
    });

    setChecklist((current) => {
      const next = {};

      Object.keys(current).forEach((key) => {
        next[key] = {
          ...current[key],
          result: "PASS",
          notes: "",
        };
      });

      return next;
    });
  }

  function updateChecklistItem(key, field, value) {
    setChecklist((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  }

  async function submitInspection(event) {
    event.preventDefault();

    if (saving || !inspection.vehicle_id) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const criticalCount = Object.values(checklist).filter((item) => item.result === "FAIL" && item.severity === "CRITICAL").length;
    const majorCount = Object.values(checklist).filter((item) => item.result === "FAIL" && item.severity === "MAJOR").length;
    const minorCount = Object.values(checklist).filter((item) => item.result === "FAIL" && item.severity === "MINOR").length;

    const calculatedResult =
      criticalCount >= 1 || majorCount >= 3 || minorCount >= 7
        ? "FAIL"
        : "PASS";

    const checklistPayload = Object.fromEntries(
      Object.entries(checklist).map(([key, item]) => [
        key,
        {
          result: item.result,
          severity: item.severity,
          notes: item.notes || null,
        },
      ]),
    );

    const { error: rpcError } = await supabase.rpc("submit_vehicle_inspection", {
      p_vehicle_id: inspection.vehicle_id,
      p_audit_type: inspection.audit_type,
      p_result: calculatedResult,
      p_checklist: checklistPayload,
      p_notes: inspection.notes.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setMessage(
      calculatedResult === "FAIL"
        ? "Inspection failed. Vehicle has been moved to maintenance."
        : "Inspection completed successfully.",
    );

    setShowInspection(false);
    resetInspection();
    await loadData();
    setSaving(false);
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
    });
  }

  function resultClass(result) {
    if (result === "PASS") {
      return "status-badge status-online";
    }

    if (result === "FAIL") {
      return "status-badge status-danger";
    }

    return "status-badge status-warning";
  }

  function resultLabel(result) {
    if (result === "PASS") {
      return "PASS";
    }

    if (result === "FAIL") {
      return "FAIL";
    }

    return "PENDING";
  }

  const checklistGroups = [
    {
      title: "Vehicle Systems",
      items: [
        ["brakes", "Brakes"],
        ["steering", "Steering"],
        ["tires", "Tires"],
        ["suspension", "Suspension"],
        ["mirrors", "Mirrors"],
        ["windshield", "Windshield"],
        ["wipers", "Wipers"],
        ["horn", "Horn"],
        ["seat_belts", "Seat Belts"],
        ["emergency_exits", "Emergency Exits"],
      ],
    },
    {
      title: "School Bus Equipment",
      items: [
        ["stop_arm", "Stop Arm"],
        ["crossing_gate", "Crossing Gate"],
        ["warning_lights", "Warning Lights"],
      ],
    },
    {
      title: "Lighting",
      items: [
        ["headlights", "Headlights"],
        ["turn_signals", "Turn Signals"],
        ["brake_lights", "Brake Lights"],
      ],
    },
    {
      title: "Engine & Fluids",
      items: [
        ["fluids", "Fluid Levels"],
        ["coolant", "Coolant System"],
        ["oil", "Engine Oil"],
      ],
    },
    {
      title: "Body & General",
      items: [
        ["body_condition", "Body Condition"],
      ],
    },
  ];

  return (
    <>
      <section className="page-section">
        <div className="page-header">
          <div>
            <div className="eyebrow">COMPLIANCE & INSPECTIONS</div>
            <h1>Audits</h1>
            <p>Conduct vehicle inspections and maintain a complete inspection history.</p>
          </div>

          <div className="page-header-actions">
            <button className="button button-secondary" onClick={loadData} disabled={loading}>
              Refresh
            </button>

            <button className="button button-primary" onClick={() => setShowInspection(true)}>
              Start Inspection
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Inspections Today</span>
            <strong>{todayAudits.length}</strong>
            <span className="stat-meta">Completed or pending</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Passed</span>
            <strong>{passCount}</strong>
            <span className="stat-meta">Passing inspections</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Failed</span>
            <strong>{failCount}</strong>
            <span className="stat-meta">Requires service attention</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Pending</span>
            <strong>{pendingCount}</strong>
            <span className="stat-meta">Awaiting completion</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Vehicles in Maintenance</span>
            <strong>{failedVehicles.length}</strong>
            <span className="stat-meta">Unavailable for service</span>
          </div>
        </div>

        <div className="content-grid-2">
          <section className="panel">
            <PanelTitle title="Inspection History" />

            <div className="toolbar">
              <div className="search-box">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fleet or inspector..."
                />
              </div>

              <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
                <option value="ALL">All results</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="PENDING">Pending</option>
              </select>

              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="ALL">All inspection types</option>
                {auditTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="empty-state">Loading inspection history...</div>
            ) : filteredAudits.length === 0 ? (
              <div className="empty-state">No inspections match the current filters.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Inspection</th>
                      <th>Inspector</th>
                      <th>Result</th>
                      <th>Completed</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAudits.map((audit) => (
                      <tr key={audit.id}>
                        <td>
                          <div className="table-primary">{audit.vehicles?.fleet_number || "—"}</div>
                          <div className="table-secondary">
                            {audit.vehicles
                              ? `${audit.vehicles.year} ${audit.vehicles.make} ${audit.vehicles.model}`
                              : "Vehicle unavailable"}
                          </div>
                        </td>

                        <td>{audit.audit_type?.replaceAll("_", " ") || "Inspection"}</td>

                        <td>{audit.drivers?.name || "—"}</td>

                        <td>
                          <span className={resultClass(audit.result)}>
                            {resultLabel(audit.result)}
                          </span>
                        </td>

                        <td>{formatDateTime(audit.completed_at || audit.created_at)}</td>

                        <td>
                          <button className="button button-small button-secondary" onClick={() => setSelectedAudit(audit)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <PanelTitle title="Inspection Attention" />

            <div className="dashboard-list">
              <div className="dashboard-list-item">
                <div>
                  <strong>Failed inspections</strong>
                  <span>Vehicles requiring follow-up service</span>
                </div>
                <span className="status-badge status-danger">{failCount}</span>
              </div>

              <div className="dashboard-list-item">
                <div>
                  <strong>Pending inspections</strong>
                  <span>Inspections not yet finalized</span>
                </div>
                <span className="status-badge status-warning">{pendingCount}</span>
              </div>

              <div className="dashboard-list-item">
                <div>
                  <strong>Fleet unavailable</strong>
                  <span>Vehicles currently in maintenance</span>
                </div>
                <span className="status-badge status-danger">{failedVehicles.length}</span>
              </div>
            </div>
          </section>
        </div>
      </section>

      {showInspection && (
        <div className="modal-backdrop" onMouseDown={() => !saving && setShowInspection(false)}>
          <div className="modal modal-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">VEHICLE INSPECTION</div>
                <h2>Start Inspection</h2>
              </div>

              <button className="icon-button" onClick={() => !saving && setShowInspection(false)}>×</button>
            </div>

            <form onSubmit={submitInspection}>
              <div className="form-grid">
                <label>
                  <span>Vehicle</span>
                  <select required value={inspection.vehicle_id} onChange={(event) => setInspection({ ...inspection, vehicle_id: event.target.value })}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.fleet_number} — {vehicle.year} {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Inspection Type</span>
                  <select value={inspection.audit_type} onChange={(event) => setInspection({ ...inspection, audit_type: event.target.value })}>
                    <option value="DAILY">Daily</option>
                    <option value="PRE_TRIP">Pre-Trip</option>
                    <option value="POST_TRIP">Post-Trip</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="SAFETY">Safety</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
              </div>

              {checklistGroups.map((group) => (
                <div className="inspection-section" key={group.title}>
                  <div className="inspection-section-header">
                    <div>
                      <div className="eyebrow">CHECKLIST</div>
                      <h3>{group.title}</h3>
                    </div>
                  </div>

                  <div className="inspection-grid">
                    {group.items.map(([key, label]) => (
                      <div className="inspection-item" key={key}>
                        <div className="inspection-item-header">
                          <strong>{label}</strong>
                          <span className={`severity severity-${checklist[key].severity.toLowerCase()}`}>
                            {checklist[key].severity}
                          </span>
                        </div>

                        <div className="inspection-result-buttons">
                          {["PASS", "FAIL", "N/A"].map((result) => (
                            <button
                              type="button"
                              key={result}
                              className={checklist[key].result === result ? "inspection-result active" : "inspection-result"}
                              onClick={() => updateChecklistItem(key, "result", result)}
                            >
                              {result}
                            </button>
                          ))}
                        </div>

                        <input
                          value={checklist[key].notes}
                          onChange={(event) => updateChecklistItem(key, "notes", event.target.value)}
                          placeholder="Inspection notes..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <label className="form-span-2">
                <span>Inspection Notes</span>
                <textarea
                  rows="4"
                  value={inspection.notes}
                  onChange={(event) => setInspection({ ...inspection, notes: event.target.value })}
                  placeholder="Additional inspection notes..."
                />
              </label>

              <div className="inspection-threshold-note">
                <strong>Automatic result calculation</strong>
                <span>
                  Any Critical failure, 3 Major failures, or 7 Minor failures results in a failed inspection.
                </span>
              </div>

              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowInspection(false)} disabled={saving}>
                  Cancel
                </button>

                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAudit && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedAudit(null)}>
          <div className="modal modal-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">INSPECTION RECORD</div>
                <h2>Fleet {selectedAudit.vehicles?.fleet_number || "—"}</h2>
              </div>

              <button className="icon-button" onClick={() => setSelectedAudit(null)}>×</button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Vehicle</span>
                <strong>
                  {selectedAudit.vehicles
                    ? `${selectedAudit.vehicles.year} ${selectedAudit.vehicles.make} ${selectedAudit.vehicles.model}`
                    : "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>Garage</span>
                <strong>{selectedAudit.vehicles?.garage || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Inspection Type</span>
                <strong>{selectedAudit.audit_type?.replaceAll("_", " ") || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Result</span>
                <strong>
                  <span className={resultClass(selectedAudit.result)}>
                    {resultLabel(selectedAudit.result)}
                  </span>
                </strong>
              </div>

              <div className="detail-item">
                <span>Inspector</span>
                <strong>{selectedAudit.drivers?.name || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Completed</span>
                <strong>{formatDateTime(selectedAudit.completed_at)}</strong>
              </div>
            </div>

            <div className="detail-section">
              <span className="detail-section-title">Inspection Checklist</span>

              <div className="inspection-review-list">
                {Object.entries(selectedAudit.checklist || {}).map(([key, item]) => (
                  <div className="inspection-review-item" key={key}>
                    <div>
                      <strong>{key.replaceAll("_", " ")}</strong>
                      {item?.notes && <span>{item.notes}</span>}
                    </div>

                    <div className="inspection-review-result">
                      {item?.severity && (
                        <span className={`severity severity-${item.severity.toLowerCase()}`}>
                          {item.severity}
                        </span>
                      )}

                      <span className={resultClass(item?.result)}>
                        {item?.result || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedAudit.notes && (
              <div className="detail-section">
                <span className="detail-section-title">Notes</span>
                <div className="detail-notes">{selectedAudit.notes}</div>
              </div>
            )}

            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setSelectedAudit(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Settings({ canEdit, preferences, setPreferences, session, setPage }) {
  function updatePreference(key, value) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetPreferences() {
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
    localStorage.removeItem("clino-page");
    setPage("Dashboard");
  }

  return (
    <div className="settings-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">SYSTEM CONFIGURATION</div>
          <h2>Settings</h2>
          <p>Configure how the fleet operations dashboard behaves on this device.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section">
            <PanelTitle title="Appearance" />

            <div className="settings-control">
              <div>
                <strong>Interface density</strong>
                <span>Controls spacing throughout the operations interface.</span>
              </div>

              <div className="segmented-control">
                <button className={preferences.density === "compact" ? "active" : ""} onClick={() => updatePreference("density", "compact")}>
                  Compact
                </button>
                <button className={preferences.density === "comfortable" ? "active" : ""} onClick={() => updatePreference("density", "comfortable")}>
                  Comfortable
                </button>
              </div>
            </div>
          </section>

          <section className="panel settings-section">
            <PanelTitle title="Fleet" />

            <SettingsSelect
              label="Default section"
              description="Section opened when the system starts."
              value={preferences.defaultSection}
              options={pages}
              onChange={(value) => {
                updatePreference("defaultSection", value);
                setPage(value);
              }}
            />

            <SettingsToggle
              label="Show offline vehicles"
              description="Keep vehicles without current telemetry visible in fleet interfaces."
              checked={preferences.showOffline}
              onChange={(value) => updatePreference("showOffline", value)}
            />

            <SettingsToggle
              label="Show stale vehicles"
              description="Display vehicles whose telemetry has stopped updating normally."
              checked={preferences.showStale}
              onChange={(value) => updatePreference("showStale", value)}
            />
          </section>

          <section className="panel settings-section">
            <PanelTitle title="Dashboard" />

            <SettingsSelect
              label="Default section"
              description="Section opened when the system starts."
              value={preferences.defaultSection}
              options={pages}
              onChange={(value) => updatePreference("defaultSection", value)}
            />

            <SettingsSelect
              label="Recent activity count"
              description="Number of activity events shown on the dashboard."
              value={preferences.activityCount}
              options={[5, 8, 10, 15, 20]}
              format={(value) => `${value} records`}
              onChange={(value) => updatePreference("activityCount", Number(value))}
            />

            <SettingsSelect
              label="Maintenance queue count"
              description="Number of maintenance records shown in dashboard queues."
              value={preferences.maintenanceCount}
              options={[5, 8, 10, 15, 20]}
              format={(value) => `${value} records`}
              onChange={(value) => updatePreference("maintenanceCount", Number(value))}
            />
          </section>

          <section className="panel settings-section">
            <PanelTitle title="Map" />

            <SettingsToggle
              label="Auto-follow selected vehicle"
              description="Automatically keep the selected vehicle centered while viewing live fleet data."
              checked={preferences.autoFollowVehicle}
              onChange={(value) => updatePreference("autoFollowVehicle", value)}
            />

            <SettingsToggle
              label="Vehicle labels"
              description="Display fleet numbers directly on map markers."
              checked={preferences.vehicleLabels}
              onChange={(value) => updatePreference("vehicleLabels", value)}
            />

            <SettingsSelect
              label="Map refresh interval"
              description="How frequently live map data should be refreshed."
              value={preferences.mapRefresh}
              options={[5, 10, 15, 30, 60]}
              format={(value) => `${value} seconds`}
              onChange={(value) => updatePreference("mapRefresh", Number(value))}
            />
          </section>

          <section className="panel settings-section">
            <PanelTitle title="Notifications" />

            <SettingsToggle
              label="Maintenance warnings"
              description="Show attention indicators for upcoming or overdue maintenance."
              checked={preferences.maintenanceWarnings}
              onChange={(value) => updatePreference("maintenanceWarnings", value)}
            />

            <SettingsToggle
              label="Failed inspection warnings"
              description="Show attention indicators for vehicles with failed inspections."
              checked={preferences.inspectionWarnings}
              onChange={(value) => updatePreference("inspectionWarnings", value)}
            />

            <SettingsToggle
              label="Offline fleet warnings"
              description="Show attention indicators when vehicles leave telemetry coverage."
              checked={preferences.offlineWarnings}
              onChange={(value) => updatePreference("offlineWarnings", value)}
            />
          </section>

          <section className="panel settings-section">
            <PanelTitle title="Account" />

            <div className="settings-account">
              <div className="account-avatar large">
                {(session?.user?.email || "U").charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{session?.user?.email?.split("@")[0] || "Unknown user"}</strong>
                <span>{session?.user?.email || "No email available"}</span>
                <StatusBadge status={role === "admin" ? "ADMIN" : "VIEWER"} />
              </div>
            </div>

            <button className="secondary-button settings-signout" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </section>
        </div>

        <aside className="settings-sidebar">
          <section className="panel">
            <PanelTitle title="System" />

            <div className="system-info-list">
              <Detail label="Version" value="1.0.0" />
              <Detail label="Telemetry source" value="Roblox" />
              <Detail label="Tracking interval" value={`${preferences.telemetryInterval}s`} />
              <Detail label="Map type" value="Custom Roblox map" />
              <Detail label="Access level" value={canEdit ? "Administrator" : "Viewer"} />
              <Detail label="Connection" value="Online" />
            </div>
          </section>

          <section className="panel settings-danger-zone">
            <PanelTitle title="Local Preferences" />

            <p className="muted">Reset this device's dashboard preferences to the default configuration.</p>

            <button className="secondary-button danger-outline" onClick={resetPreferences}>
              Reset preferences
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="settings-control">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <button className={`toggle ${checked ? "active" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
        <span />
      </button>
    </div>
  );
}

function SettingsSelect({ label, description, value, options, format, onChange }) {
  return (
    <div className="settings-control">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
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