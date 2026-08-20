import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, ShieldAlert, Filter, RefreshCw, Zap, PlusCircle } from 'lucide-react';
import { MOCK_ALERTS } from '../../data/mockData';
import { SystemAlert } from '../../types';
import { fetchNotificationsFromSupabase } from '../../services/supabaseService';
import { BACKEND_URL } from '../../lib/config';

interface NotificationsViewProps {
  alerts?: SystemAlert[];
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ alerts: propAlerts }) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => {
    if (propAlerts && propAlerts.length > 0) return propAlerts;
    return MOCK_ALERTS;
  });
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsFromSupabase();
      if (res.data && res.data.length > 0) {
        // Merge Supabase alerts with MOCK_ALERTS to guarantee rich system telemetry is never empty
        const alertMap = new Map<string, SystemAlert>();
        MOCK_ALERTS.forEach(a => alertMap.set(a.id, a));
        res.data.forEach(a => alertMap.set(a.id, a));
        setAlerts(Array.from(alertMap.values()));
      } else {
        setAlerts(MOCK_ALERTS);
      }
    } catch (e) {
      setAlerts(MOCK_ALERTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propAlerts && propAlerts.length > 0) {
      const alertMap = new Map<string, SystemAlert>();
      MOCK_ALERTS.forEach(a => alertMap.set(a.id, a));
      propAlerts.forEach(a => alertMap.set(a.id, a));
      setAlerts(Array.from(alertMap.values()));
    } else {
      loadNotifications();
    }
  }, [propAlerts]);

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  const markAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, read: true })));
  };

  const handleCreateSampleAlert = () => {
    const categories: Array<'Footfall' | 'Network' | 'Inventory' | 'Campaign' | 'Security'> = ['Footfall', 'Network', 'Inventory', 'Campaign', 'Security'];
    const severities: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const randomSev = severities[Math.floor(Math.random() * severities.length)];

    const newAlert: SystemAlert = {
      id: `live-alt-${Date.now()}`,
      title: `${randomCat} Dynamic Telemetry Update`,
      description: `Automated IoT sensor event reported in Atrium Zone: nominal flow rate active.`,
      timestamp: 'Just now',
      severity: randomSev,
      category: randomCat,
      read: false,
      location: 'Central Atrium Ground Floor'
    };

    setAlerts(prev => [newAlert, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            AXIONIX System Notifications & Security Feed
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated alerts for high atrium footfall spikes, access point packet loss, and tenant inventory feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateSampleAlert}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Simulate Alert
          </button>
          <button
            onClick={markAllRead}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Mark All As Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          {(['all', 'critical', 'warning', 'info'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? `All Alerts (${alerts.length})` : `${f} (${alerts.filter(a => a.severity === f).length})`}
            </button>
          ))}
        </div>

        <button
          onClick={loadNotifications}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                alert.severity === 'critical' ? 'bg-rose-50/40 border-rose-200' :
                alert.severity === 'warning' ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl text-white shrink-0 font-bold ${
                  alert.severity === 'critical' ? 'bg-rose-600' :
                  alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-600'
                }`}>
                  {alert.severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> :
                   alert.severity === 'warning' ? <ShieldAlert className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                      alert.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity} • {alert.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{alert.timestamp}</span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mt-1">{alert.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.description}</p>
                  {alert.location && (
                    <div className="text-[11px] font-semibold text-slate-500 mt-2">
                      Location: {alert.location}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No {filter !== 'all' ? filter : ''} Alerts Right Now</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All IoT sensor gateways, captive portals, and mall tenant POS nodes are operating with 100% nominal telemetry.
          </p>
          <button
            onClick={() => setAlerts(MOCK_ALERTS)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Restore Default Telemetry Alerts
          </button>
        </div>
      )}

    </div>
  );
};
