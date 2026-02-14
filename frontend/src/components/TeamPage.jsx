import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, User, Crown, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const TeamPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const data = await api.getOrganizationUsers();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setError('Failed to load team members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'lead') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-primary-blue text-white">
          <Crown size={14} />
          Organization Lead
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-gray-200 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300">
        <User size={14} />
        Team Member
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-2">Your Team</h1>
                <p className="text-neutral-gray-600 dark:text-neutral-gray-400">
                  Manage your organization members
                </p>
              </div>
              <button
                onClick={fetchTeamMembers}
                className="px-4 py-2 text-sm text-primary-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Organization Code Card (Only for leads) */}
          {currentUser?.role === 'lead' && currentUser?.orgCode && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-2">
                    Invite Team Members
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-400 mb-3">
                    Share this code with your team members so they can join your organization:
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="bg-white dark:bg-neutral-gray-800 border-2 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg font-mono text-lg font-bold">
                      {currentUser.orgCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.orgCode);
                        alert('Organization code copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Members Card */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-primary-blue" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">
                Team Members ({users.length})
              </h2>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue"></div>
                <p className="mt-4 text-neutral-gray-600 dark:text-neutral-gray-400">Loading team members...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto text-neutral-gray-400" size={48} />
                <p className="mt-4 text-neutral-gray-600 dark:text-neutral-gray-400">No team members yet</p>
              </div>
            )}

            {!loading && !error && users.length > 0 && (
              <div className="space-y-3">
                {users.map((member) => (
                  <div
                    key={member.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      member.id === currentUser?.id
                        ? 'border-primary-blue bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-gray-200 dark:border-neutral-gray-700 hover:border-neutral-gray-300 dark:hover:border-neutral-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-blue to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {member.fullName?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-neutral-black dark:text-white">
                              {member.fullName || 'Unnamed User'}
                            </h3>
                            {member.id === currentUser?.id && (
                              <span className="text-xs px-2 py-0.5 bg-primary-blue text-white rounded font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
                            <Mail size={14} />
                            <span>{member.email}</span>
                          </div>
                          <p className="text-xs text-neutral-gray-500 dark:text-neutral-gray-500 mt-1">
                            Joined {formatDate(member.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats Card */}
          {!loading && users.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Users className="text-primary-blue" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-black dark:text-white">{users.length}</p>
                    <p className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400">Total Members</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Crown className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-black dark:text-white">
                      {users.filter((u) => u.role === 'lead').length}
                    </p>
                    <p className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400">Org Leads</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <User className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-black dark:text-white">
                      {users.filter((u) => u.role === 'member').length}
                    </p>
                    <p className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400">Team Members</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
