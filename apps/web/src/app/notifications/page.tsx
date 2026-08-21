'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { IconBell, IconCheckCircle, IconAlertTriangle, IconClock } from '../../components/Icons';
import { NotificationItem } from '../../lib/types';

export default function NotificationsPage() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.allSettled([
        ApiClient.listNotifications({ limit: 50 }),
        ApiClient.getUnreadCount(),
      ]);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.items || []);
      if (countRes.status === 'fulfilled') setUnreadCount(countRes.value.unread_count);
    } catch {} finally { setLoading(false); }
  }

  const handleMarkRead = async (notifId: string) => {
    try {
      await ApiClient.markNotificationRead(notifId);
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => ApiClient.markNotificationRead(n.notification_id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      addToast('success', 'All Caught Up', 'All notifications marked as read.');
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'rx_verified': return <IconCheckCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'rx_rejected': return <IconAlertTriangle size={16} style={{ color: 'var(--danger)' }} />;
      case 'order_update': return <IconBell size={16} style={{ color: 'var(--primary)' }} />;
      default: return <IconClock size={16} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', maxWidth: '700px', margin: '0 auto' }}>
      <PageHeader
        title="Notifications"
        subtitle={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`}
        action={
          unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
              Mark All Read
            </button>
          )
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
          <div className="empty-state-icon"><IconBell size={28} /></div>
          <h3>No notifications yet</h3>
          <p>Updates about your prescriptions, orders, and account will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {notifications.map((notif) => (
            <div
              key={notif.notification_id}
              className="card"
              style={{
                padding: 'var(--sp-4)',
                cursor: notif.is_read ? 'default' : 'pointer',
                borderLeft: notif.is_read ? '3px solid transparent' : '3px solid var(--primary)',
                backgroundColor: notif.is_read ? 'var(--bg-surface)' : 'var(--primary-light)',
              }}
              onClick={() => !notif.is_read && handleMarkRead(notif.notification_id)}
            >
              <div className="flex items-center gap-3">
                <div style={{ flexShrink: 0 }}>{getIcon(notif.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-1)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{notif.type.replace(/_/g, ' ')}</span>
                    {!notif.is_read && <span className="badge badge-info" style={{ fontSize: '10px' }}>New</span>}
                  </div>
                  <p className="text-caption" style={{ lineHeight: 1.5 }}>{notif.message}</p>
                </div>
                <span className="text-caption" style={{ flexShrink: 0 }}>
                  {new Date(notif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
