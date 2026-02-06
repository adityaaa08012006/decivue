import React from 'react';
import { Bell, X } from 'lucide-react';

const OrganisationOverview = ({ isOpen, onClose }) => {
  const assumptions = [
    {
      id: 1,
      title: 'Budget',
      description: 'Annual IT budget cannot exceed $2.5M',
      time: '15:56',
      hasAvatar: true,
      avatarColor: 'bg-neutral-black',
    },
    {
      id: 2,
      title: 'Compliance',
      description: 'All vendor contracts require security audit',
      time: 'Wed',
      hasAvatar: true,
      avatarColor: 'bg-neutral-black',
    },
    {
      id: 3,
      title: 'James Grey',
      description: 'You should follow the instructions on the ear drops label, but usuall...',
      time: 'Tue',
      hasAvatar: true,
      avatarColor: 'bg-neutral-gray-600',
      hasNotification: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-neutral-white border-l border-neutral-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h2 className="text-lg font-bold text-neutral-black">Organisation Overview</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors">
                <Bell size={20} className="text-neutral-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-neutral-gray-600" />
              </button>
            </div>
          </div>

          {/* Assumptions Section */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-neutral-gray-600 mb-4">
              Assumptions which need to be reviewed :
            </p>

            <div className="space-y-4">
              {assumptions.map((assumption) => (
                <div
                  key={assumption.id}
                  className="flex gap-3 p-3 hover:bg-neutral-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 ${assumption.avatarColor} rounded-lg flex items-center justify-center`}>
                      <span className="text-white text-sm font-semibold">
                        {assumption.title.charAt(0)}
                      </span>
                    </div>
                    {assumption.hasNotification && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-red rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-neutral-black">
                        {assumption.title}
                      </h3>
                      <span className="text-xs text-neutral-gray-500 flex-shrink-0 ml-2">
                        {assumption.time}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-gray-600 line-clamp-2">
                      {assumption.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrganisationOverview;
