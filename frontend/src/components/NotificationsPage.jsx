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
                return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300';
            case 'WARNING':
                return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300';
            case 'INFO':
                return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300';
            default:
                return 'bg-gray-50 dark:bg-neutral-gray-800 border-neutral-gray-200 dark:border-neutral-gray-700 text-neutral-gray-800 dark:text-neutral-gray-300';
        }
    };

    const getSeverityIconColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'text-red-600 dark:text-red-400';
            case 'WARNING':
                return 'text-orange-600 dark:text-orange-400';
            case 'INFO':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-neutral-gray-600 dark:text-neutral-gray-400';
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
            <div className="flex h-screen bg-white dark:bg-neutral-gray-800 overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-neutral-gray-500 dark:text-neutral-gray-400">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900 overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-2 flex items-center gap-3">
                                    <Bell className="text-primary-blue dark:text-blue-400" size={32} />
                                    Notifications
                                </h1>
                                <p className="text-neutral-gray-600 dark:text-neutral-gray-400">
                                    Stay updated on conflicts, health changes, and items needing review
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
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
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                        : 'bg-gray-50 dark:bg-neutral-gray-800 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-gray-700'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filter === 'unread'
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                        : 'bg-gray-50 dark:bg-neutral-gray-800 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-gray-700'
                                }`}
                            >
                                Unread {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                            </button>
                            <button
                                onClick={() => setFilter('critical')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filter === 'critical'
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                        : 'bg-gray-50 dark:bg-neutral-gray-800 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-gray-700'
                                }`}
                            >
                                Critical
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="bg-white dark:bg-neutral-gray-800 p-12 rounded-2xl border border-neutral-gray-200 dark:border-neutral-gray-700 text-center">
                                <Bell size={48} className="mx-auto text-neutral-gray-300 dark:text-neutral-gray-600 mb-4" />
                                <p className="text-neutral-gray-500 dark:text-neutral-gray-400 font-medium mb-2">No notifications</p>
                                <p className="text-sm text-neutral-gray-400 dark:text-neutral-gray-500">
                                    You're all caught up! We'll notify you when something needs your attention.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`border rounded-xl p-5 transition-all ${
                                        notification.is_read
                                            ? 'bg-white dark:bg-neutral-gray-800 border-neutral-gray-200 dark:border-neutral-gray-700 opacity-75'
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
                                                    <h3 className="font-semibold text-neutral-black dark:text-white mb-1">
                                                        {notification.title}
                                                    </h3>
                                                    <p className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-neutral-gray-500 dark:text-neutral-gray-400 ml-4">
                                                    {formatTimestamp(notification.created_at)}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-3">
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => handleMarkRead(notification.id)}
                                                        className="text-xs px-3 py-1 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 text-neutral-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-gray-650 transition-colors flex items-center gap-1"
                                                    >
                                                        <Check size={14} />
                                                        Mark Read
                                                    </button>
                                                )}
                                                {isLead && notification.type === 'NEEDS_REVIEW' && notification.decision_id && (
                                                    <button
                                                        onClick={() => handleMarkReviewed(notification.decision_id, notification.id)}
                                                        className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCheck size={14} />
                                                        Mark as Reviewed
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDismiss(notification.id)}
                                                    className="text-xs px-3 py-1 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 text-neutral-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-gray-650 transition-colors flex items-center gap-1"
                                                >
                                                    <X size={14} />
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(notification.id)}
                                                    className="text-xs px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
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
                    toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                    {toast.type === 'success' ? <CheckCheck size={18} /> : <X size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
