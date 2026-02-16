import React, { useState, useEffect } from 'react';
import {
    Bell,
    AlertCircle,
    AlertTriangle,
    Info,
    Check,
    X,
    Trash2,
    CheckCheck,
    Clock,
    TrendingDown,
    GitBranch,
    Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const NotificationsPage = ({ onNotificationAction }) => {
    const { isLead } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, critical
    const [toast, setToast] = useState({ show: false, type: '', message: '' });

    useEffect(() => {
        fetchNotifications();
    }, [filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filter === 'unread') filters.unreadOnly = true;
            if (filter === 'critical') filters.severity = 'CRITICAL';

            const data = await api.getNotifications(filters);
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await api.markNotificationRead(id);
            fetchNotifications();
            onNotificationAction?.(); // Trigger immediate refresh of unread count
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            fetchNotifications();
            onNotificationAction?.(); // Trigger immediate refresh of unread count
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDismiss = async (id) => {
        try {
            await api.dismissNotification(id);
            fetchNotifications();
            onNotificationAction?.(); // Trigger immediate refresh of unread count
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteNotification(id);
            fetchNotifications();
            onNotificationAction?.(); // Trigger immediate refresh of unread count
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleMarkReviewed = async (decisionId, notificationId) => {
        try {
            await api.markDecisionReviewed(decisionId);
            await fetchNotifications();
            onNotificationAction?.(); // Trigger immediate refresh of unread count
            showToast('success', 'Decision marked as reviewed');
        } catch (error) {
            console.error('Failed to mark decision as reviewed:', error);
            showToast('error', 'Failed to mark as reviewed. Please try again.');
        }
    };

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
    };

    const getNotificationIcon = (type) => {
        const iconProps = { size: 20 };
        switch (type) {
            case 'ASSUMPTION_CONFLICT':
            case 'DECISION_CONFLICT':
                return <GitBranch {...iconProps} />;
            case 'HEALTH_DEGRADED':
                return <TrendingDown {...iconProps} />;
            case 'LIFECYCLE_CHANGED':
                return <AlertCircle {...iconProps} />;
            case 'NEEDS_REVIEW':
                return <Clock {...iconProps} />;
            case 'ASSUMPTION_BROKEN':
            case 'DEPENDENCY_BROKEN':
                return <AlertTriangle {...iconProps} />;
            default:
                return <Bell {...iconProps} />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'WARNING':
                return 'bg-orange-50 border-orange-200 text-orange-800';
            case 'INFO':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            default:
                return 'bg-neutral-gray-50 border-neutral-gray-200 text-neutral-gray-800';
        }
    };

    const getSeverityIconColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'text-red-600';
            case 'WARNING':
                return 'text-orange-600';
            case 'INFO':
                return 'text-blue-600';
            default:
                return 'text-neutral-gray-600';
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.is_read && !n.is_dismissed).length;

    if (loading) {
        return (
            <div className="flex h-screen bg-neutral-white overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-neutral-gray-500">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-neutral-black mb-2 flex items-center gap-3">
                                    <Bell className="text-primary-blue" size={32} />
                                    Notifications
                                </h1>
                                <p className="text-neutral-gray-600">
                                    Stay updated on conflicts, health changes, and items needing review
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <CheckCheck size={18} />
                                    Mark All Read
                                </button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filter === 'all'
                                        ? 'bg-primary-blue text-white'
                                        : 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filter === 'unread'
                                        ? 'bg-primary-blue text-white'
                                        : 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200'
                                }`}
                            >
                                Unread {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                            </button>
                            <button
                                onClick={() => setFilter('critical')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filter === 'critical'
                                        ? 'bg-primary-blue text-white'
                                        : 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200'
                                }`}
                            >
                                Critical
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-neutral-gray-200 text-center">
                                <Bell size={48} className="mx-auto text-neutral-gray-300 mb-4" />
                                <p className="text-neutral-gray-500 font-medium mb-2">No notifications</p>
                                <p className="text-sm text-neutral-gray-400">
                                    You're all caught up! We'll notify you when something needs your attention.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`border rounded-xl p-5 transition-all ${
                                        notification.is_read
                                            ? 'bg-white border-neutral-gray-200 opacity-75'
                                            : getSeverityColor(notification.severity)
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg ${getSeverityIconColor(notification.severity)}`}>
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-neutral-black mb-1">
                                                        {notification.title}
                                                    </h3>
                                                    <p className="text-sm text-neutral-gray-700">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-neutral-gray-500 ml-4">
                                                    {formatTimestamp(notification.created_at)}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-3">
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => handleMarkRead(notification.id)}
                                                        className="text-xs px-3 py-1 bg-white border border-neutral-gray-300 rounded-lg hover:bg-neutral-gray-50 transition-colors flex items-center gap-1"
                                                    >
                                                        <Check size={14} />
                                                        Mark Read
                                                    </button>
                                                )}
                                                {isLead && notification.type === 'NEEDS_REVIEW' && notification.decision_id && (
                                                    <button
                                                        onClick={() => handleMarkReviewed(notification.decision_id, notification.id)}
                                                        className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCheck size={14} />
                                                        Mark as Reviewed
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDismiss(notification.id)}
                                                    className="text-xs px-3 py-1 bg-white border border-neutral-gray-300 rounded-lg hover:bg-neutral-gray-50 transition-colors flex items-center gap-1"
                                                >
                                                    <X size={14} />
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(notification.id)}
                                                    className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
                    toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCheck size={18} /> : <X size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
