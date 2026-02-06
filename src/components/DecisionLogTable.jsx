import React from 'react';
import { RotateCcw } from 'lucide-react';

const DecisionLogTable = () => {
  const decisions = [
    {
      id: 1,
      decision: 'UX Flow',
      status: 'Approved',
      description: 'The modal should be replaced by a popup',
      owner: 'David Jones',
    },
    {
      id: 2,
      decision: 'Message change',
      status: 'Pending',
      description: '"Successfully saved"',
      owner: 'Mike Smith',
    },
    {
      id: 3,
      decision: 'Accessibility',
      status: 'Declined',
      description: 'Add aria-live: "assertive"',
      owner: 'Jill Diase',
    },
    {
      id: 4,
      decision: 'Accessibility',
      status: 'Disregarded',
      description: 'Change color to blue-M900',
      owner: 'Frankie Thomas',
    },
  ];

  const getStatusBadge = (status) => {
    const statusStyles = {
      Approved: 'bg-status-green text-white',
      Pending: 'bg-status-gray text-white',
      Declined: 'bg-primary-red text-white',
      Disregarded: 'bg-primary-blue text-white',
    };

    return (
      <span className={`px-3 py-1 rounded text-xs font-semibold ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray-200 p-6">
      <h2 className="text-2xl font-bold text-neutral-black mb-6">Decision log</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-gray-300">
              <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                Decision
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                Status
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                Description
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                Owner
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr
                key={decision.id}
                className="border-b border-neutral-gray-200 last:border-b-0 hover:bg-neutral-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <span className="text-sm text-neutral-black bg-blue-50 px-3 py-1.5 rounded">
                    {decision.decision}
                  </span>
                </td>
                <td className="py-4 px-4">{getStatusBadge(decision.status)}</td>
                <td className="py-4 px-4">
                  <span className="text-sm text-neutral-gray-700">{decision.description}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-neutral-black">{decision.owner}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 bg-status-green text-white text-sm font-semibold rounded-md hover:bg-green-600 transition-colors">
                      Acknowledge
                    </button>
                    <button className="px-4 py-1.5 bg-status-orange text-white text-sm font-semibold rounded-md hover:bg-orange-600 transition-colors flex items-center gap-1">
                      Review
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DecisionLogTable;
