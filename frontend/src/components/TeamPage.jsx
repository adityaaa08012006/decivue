import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Crown, User, RotateCcw, FileText, MoreVertical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import TeamMemberReportModal from './TeamMemberReportModal';

const TeamPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserForReport, setSelectedUserForReport] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20">
          <Crown size={12} />
          Lead
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-gray-100 dark:bg-neutral-gray-700 text-neutral-gray-600 dark:text-neutral-gray-400">
        <User size={12} />
        Member
      </span>
    );
  };

  const handleGenerateReport = (member) => {
    setSelectedUserForReport(member);
    setOpenMenuId(null);
  };

  const handleCloseReportModal = () => {
    setSelectedUserForReport(null);
  };

  const toggleMenu = (memberId) => {
    setOpenMenuId(openMenuId === memberId ? null : memberId);
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
        <div className="max-w-5xl mx-auto w-full p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-black dark:text-white">Team</h1>
              <button
                onClick={fetchTeamMembers}
                className="p-2 text-neutral-gray-500 hover:text-primary-blue hover:bg-neutral-gray-100 dark:hover:bg-neutral-gray-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
              {users.length} {users.length === 1 ? 'member' : 'members'} in your organization
            </p>
          </div>

          {/* Organization Code Card (Only for leads) */}
          {currentUser?.role === 'lead' && currentUser?.orgCode && (
            <div className="bg-white dark:bg-neutral-gray-800 border border-neutral-gray-200 dark:border-neutral-gray-700 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserPlus className="text-green-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-black dark:text-white mb-1">
                    Invite Code
                  </h3>
                  <p className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400 mb-3">
                    Share this code with team members to join your organization
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-neutral-gray-50 dark:bg-neutral-gray-900 border border-neutral-gray-200 dark:border-neutral-gray-700 text-neutral-black dark:text-white px-3 py-1.5 rounded-lg font-mono text-sm font-medium">
                      {currentUser.orgCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.orgCode);
                        alert('Code copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Members List */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 shadow-sm">
            {loading && (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                <p className="mt-3 text-sm text-neutral-gray-600 dark:text-neutral-gray-400">Loading...</p>
              </div>
            )}

            {error && (
              <div className="m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="text-center py-16">
                <Users className="mx-auto text-neutral-gray-300 dark:text-neutral-gray-700" size={48} />
                <p className="mt-3 text-sm text-neutral-gray-600 dark:text-neutral-gray-400">No team members yet</p>
              </div>
            )}

            {!loading && !error && users.length > 0 && (
              <div className="divide-y divide-neutral-gray-200 dark:divide-neutral-gray-700">
                {users.map((member, index) => (
                  <div
                    key={member.id}
                    className={`p-4 transition-colors relative ${
                      member.id === currentUser?.id
                        ? 'bg-blue-50/50 dark:bg-blue-900/10'
                        : 'hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 bg-gradient-to-br from-primary-blue to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {member.fullName?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-neutral-black dark:text-white truncate">
                            {member.fullName || 'Unnamed User'}
                          </h3>
                          {member.id === currentUser?.id && (
                            <span className="text-xs px-2 py-0.5 bg-neutral-gray-800 dark:bg-neutral-gray-700 text-white rounded-full font-medium flex-shrink-0">
                              You
                            </span>
                          )}
                          {getRoleBadge(member.role)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-gray-500 dark:text-neutral-gray-400">
                          <Mail size={12} />
                          <span className="truncate">{member.email}</span>
                        </div>
                        <p className="text-xs text-neutral-gray-400 dark:text-neutral-gray-500 mt-1">
                          Joined {formatDate(member.createdAt)}
                        </p>
                      </div>

                      {/* Actions Menu (only for leads) */}
                      {currentUser?.role === 'lead' && (
                        <div className="relative">
                          <button
                            onClick={() => toggleMenu(member.id)}
                            className="p-2 text-neutral-gray-400 hover:text-neutral-black dark:hover:text-white hover:bg-neutral-gray-100 dark:hover:bg-neutral-gray-700 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenuId === member.id && (
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              ></div>

                              {/* Menu */}
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-gray-800 border border-neutral-gray-200 dark:border-neutral-gray-700 rounded-lg shadow-lg z-20 py-1">
                                <button
                                  onClick={() => handleGenerateReport(member)}
                                  className="w-full px-4 py-2 text-left text-sm text-neutral-black dark:text-white hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-700 flex items-center gap-2 transition-colors"
                                >
                                  <FileText size={16} className="text-primary-blue" />
                                  <span>View Performance Report</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {selectedUserForReport && (
        <TeamMemberReportModal
          user={selectedUserForReport}
          onClose={handleCloseReportModal}
        />
      )}
    </div>
  );
};

export default TeamPage;
