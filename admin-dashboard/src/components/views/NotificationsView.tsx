import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, ShieldAlert, Filter, Wifi, RefreshCw, Sparkles, MapPin } from 'lucide-react';
import { SystemAlert } from '../../types';
import { fetchNotificationsFromSupabase } from '../../services/supabaseService';
import { BACKEND_URL } from '../../lib/config';

export const DEFAULT_NOTIFICATIONS: SystemAlert[] = [
  {
    id: 'alt-1',
    title: 'High Footfall Spike Detected',
    description: 'Central Atrium occupancy crossed 85% capacity threshold (1,480 visitors). Security alerted.',
    timestamp: '10 mins ago',
    severity: 'warning',
    category: 'Footfall',
    read: false,
    location: 'Central Atrium Ground Floor'
  },
  {
    id: 'alt-2',
    title: 'WiFi Gateway AP-South-02 Packet Loss',
    description: 'Access Point AP-South-02 in South Wing reported temporary packet loss. Failover to AP-South-03 active.',
    timestamp: '25 mins ago',
    severity: 'critical',
    category: 'Network',
    read: false,
    location: 'South Wing 1st Floor'
  },
  {
    id: 'alt-3',
    title: 'Low Coupon Stock Alert',
    description: 'STARBUCKSBOGO coupon claims reached 85% limit. Consider extending campaign quota.',
    timestamp: '1 hour ago',
    severity: 'info',
    category: 'Campaign',
    read: true,
    location: 'Starbucks Reserve'
  },
  {
    id: 'alt-4',
    title: 'Store Inventory POS Sync Notice',
    description: 'Zara inventory POS catalog synchronization completed with 24 item stock updates.',
    timestamp: '2 hours ago',
    severity: 'info',
    category: 'Inventory',
    read: true,
    location: 'Zara 1st Floor'
  },
  {
    id: 'alt-5',
    title: 'VIP Lounge Entry Authorized',
    description: 'Guest Vikram Malhotra (Platinum Member) accessed VIP Lounge Central with digital pass.',
    timestamp: '3 hours ago',
    severity: 'info',
    category: 'Security',
    read: false,
    location: 'VIP Concierge Suite'
  },
  {
    id: 'alt-6',
    title: 'POS Terminal Delay Flagged',
    description: 'H&M 2nd Floor checkout terminal #4 latency exceeded 1,200ms. Diagnostics run automatically.',
    timestamp: '4 hours ago',
    severity: 'warning',
    category: 'Network',
    read: true,
    location: 'H&M 2nd Floor'
  },
  {
    id: 'alt-7',
    title: 'Atrium Air Quality & HVAC Nominal',
    description: 'HVAC Zone 3 temperature stabilized at 22.4°C with standard airflow rate.',
    timestamp: '5 hours ago',
    severity: 'info',
    category: 'Footfall',
    read: true,
    location: 'Main Atrium Level 2'
  }
];

export const NotificationsView: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>(DEFAULT_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    let isMounted = true;
    fetchNotificationsFromSupabase().then(res => {
      if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Merge Supabase alerts with defaults
        const map = new Map<string, SystemAlert>();
        DEFAULT_NOTIFICATIONS.forEach(a => map.set(a.id, a));
        res.data.forEach(a => map.set(a.id, a));
        setAlerts(Array.from(map.values()));
      }
    }).catch(() => {});

    // SSE Realtime connection for live alerts
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${BACKEND_URL}/api/realtime/stream`);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'NEW_ALERT' || data.type === 'RESTOCK_REQUEST') {
            const incoming = data.data || data;
            setAlerts(prev => [{
              id: incoming.id || `alt-${Date.now()}`,
              title: incoming.title || 'Live System Notification',
              description: incoming.description || incoming.message || 'Realtime event detected',
              timestamp: 'Just now',
              severity: incoming.severity || 'info',
              category: incoming.category || 'Security',
              read: false,
              location: incoming.location || 'Mall Central Atrium'
            }, ...prev]);
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => { 
      isMounted = false; 
      eventSource?.close();
    };
  }, []);

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  const markAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, read: true })));
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              AXIONIX System Notifications & Security Feed
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated alerts for high atrium footfall spikes, access point packet loss, and tenant inventory feeds.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Mark All As Read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        {(['all', 'critical', 'warning', 'info'] as const).map(f => {
          const count = f === 'all' ? alerts.length : alerts.filter(a => a.severity === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{f === 'all' ? 'All Alerts' : f}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                      alert.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity} • {alert.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{alert.timestamp}</span>
                    {!alert.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mt-1">{alert.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.description}</p>
                  {alert.location && (
                    <div className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Location: {alert.location}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No {filter !== 'all' ? filter : ''} alerts found</h3>
            <p className="text-xs text-slate-500 mt-1">All telemetry sensors and systems are running normally.</p>
          </div>
        )}
      </div>

    </div>
  );
};
