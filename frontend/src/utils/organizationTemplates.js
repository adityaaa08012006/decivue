import { Building2, Heart, Users, Briefcase } from 'lucide-react';

export const organizationTypes = [
  {
    id: 'business',
    name: 'Business/Startup',
    icon: Building2,
    description: 'Product companies, SaaS, tech startups',
    color: '#1d4ed8',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    id: 'ngo',
    name: 'NGO/Non-Profit',
    icon: Heart,
    description: 'Charitable organizations, foundations',
    color: '#059669',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  {
    id: 'government',
    name: 'Government/Public',
    icon: Users,
    description: 'Public agencies, municipalities',
    color: '#7c3aed',
    gradient: 'from-violet-500 to-violet-600'
  },
  {
    id: 'consulting',
    name: 'Consulting/Agency',
    icon: Briefcase,
    description: 'Consulting firms, service agencies',
    color: '#ea580c',
    gradient: 'from-orange-500 to-orange-600'
  }
];

export const decisionTemplates = {
  business: [
    {
      id: 1,
      title: 'Cloud Provider Strategy',
      description: 'Multi-cloud approach for infrastructure scaling',
      assumptions: [
        { text: 'API reliability > 99.9%', status: 'valid' },
        { text: 'Cost scales linearly with usage', status: 'valid' },
        { text: 'Team has AWS expertise', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 90,
      createdDays: 15
    },
    {
      id: 2,
      title: 'Product Launch Timeline',
      description: 'Q2 release targeting enterprise customers',
      assumptions: [
        { text: 'Q2 market demand remains high', status: 'aging' },
        { text: 'Development on track', status: 'valid' },
        { text: 'Sales team ready by launch', status: 'valid' }
      ],
      health: 'at-risk',
      expiryDays: 45,
      createdDays: 30
    },
    {
      id: 3,
      title: 'Pricing Model Change',
      description: 'Shift from flat rate to value-based pricing',
      assumptions: [
        { text: 'Customers accept value-based pricing', status: 'valid' },
        { text: 'Churn stays below 5%', status: 'invalid' },
        { text: 'Revenue increases 20%', status: 'valid' }
      ],
      health: 'critical',
      expiryDays: 30,
      createdDays: 45
    },
    {
      id: 4,
      title: 'Remote Work Policy',
      description: 'Hybrid model with flexible office days',
      assumptions: [
        { text: 'Productivity maintained', status: 'valid' },
        { text: 'Team satisfaction remains high', status: 'valid' },
        { text: 'Office costs reduced 40%', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 180,
      createdDays: 20
    }
  ],
  ngo: [
    {
      id: 1,
      title: 'Fundraising Campaign Strategy',
      description: 'Annual digital fundraising initiative',
      assumptions: [
        { text: 'Donor base grows 15%', status: 'valid' },
        { text: 'Digital channels effective', status: 'valid' },
        { text: 'Operating costs < 20%', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 120,
      createdDays: 25
    },
    {
      id: 2,
      title: 'Program Expansion to New Region',
      description: 'Extending services to underserved communities',
      assumptions: [
        { text: 'Local partnerships secured', status: 'valid' },
        { text: 'Regulatory approval granted', status: 'valid' },
        { text: 'Volunteer base adequate', status: 'aging' }
      ],
      health: 'at-risk',
      expiryDays: 60,
      createdDays: 40
    },
    {
      id: 3,
      title: 'Grant Application Priorities',
      description: 'Focus on education and health grants',
      assumptions: [
        { text: 'Foundation priorities align', status: 'valid' },
        { text: 'Proposal is competitive', status: 'valid' },
        { text: 'Match funding available', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 90,
      createdDays: 10
    },
    {
      id: 4,
      title: 'Volunteer Management System',
      description: 'New platform for volunteer coordination',
      assumptions: [
        { text: 'System adoption > 80%', status: 'invalid' },
        { text: 'Time savings 25%', status: 'valid' },
        { text: 'Volunteer satisfaction improves', status: 'valid' }
      ],
      health: 'critical',
      expiryDays: 30,
      createdDays: 35
    }
  ],
  government: [
    {
      id: 1,
      title: 'Public Infrastructure Upgrade',
      description: 'Road and bridge maintenance program',
      assumptions: [
        { text: 'Budget approved by council', status: 'valid' },
        { text: 'Contractor bids competitive', status: 'valid' },
        { text: 'Community support strong', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 180,
      createdDays: 30
    },
    {
      id: 2,
      title: 'Digital Services Platform',
      description: 'Online portal for citizen services',
      assumptions: [
        { text: 'Citizen adoption > 40%', status: 'aging' },
        { text: 'Security standards met', status: 'valid' },
        { text: 'Costs within budget', status: 'valid' }
      ],
      health: 'at-risk',
      expiryDays: 90,
      createdDays: 50
    },
    {
      id: 3,
      title: 'Emergency Response Protocol',
      description: 'Updated disaster response procedures',
      assumptions: [
        { text: 'Staff training completed', status: 'valid' },
        { text: 'Equipment functional', status: 'valid' },
        { text: 'Response time < 10min', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 365,
      createdDays: 60
    },
    {
      id: 4,
      title: 'Community Engagement Initiative',
      description: 'Public feedback and participation program',
      assumptions: [
        { text: 'Participation increases 30%', status: 'valid' },
        { text: 'Feedback is actionable', status: 'valid' },
        { text: 'Program is sustainable', status: 'aging' }
      ],
      health: 'at-risk',
      expiryDays: 120,
      createdDays: 45
    }
  ],
  consulting: [
    {
      id: 1,
      title: 'Client Delivery Model',
      description: 'Remote-first consulting approach',
      assumptions: [
        { text: 'Remote work effective', status: 'valid' },
        { text: 'Client satisfaction > 4.5/5', status: 'valid' },
        { text: 'Team utilization 75%', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 90,
      createdDays: 20
    },
    {
      id: 2,
      title: 'Specialization Strategy',
      description: 'Focus on fintech and healthcare verticals',
      assumptions: [
        { text: 'Market demand for niche', status: 'valid' },
        { text: 'Competition limited', status: 'aging' },
        { text: 'Team can upskill quickly', status: 'valid' }
      ],
      health: 'at-risk',
      expiryDays: 60,
      createdDays: 35
    },
    {
      id: 3,
      title: 'Pricing Structure Change',
      description: 'Value-based vs hourly billing model',
      assumptions: [
        { text: 'Value-based pricing accepted', status: 'valid' },
        { text: 'Revenue per project up 25%', status: 'valid' },
        { text: 'Sales cycle remains same', status: 'invalid' }
      ],
      health: 'critical',
      expiryDays: 45,
      createdDays: 40
    },
    {
      id: 4,
      title: 'Strategic Partnership',
      description: 'Alliance with complementary firm',
      assumptions: [
        { text: 'Partner capabilities complement', status: 'valid' },
        { text: 'Revenue share is fair', status: 'valid' },
        { text: 'Client base expands', status: 'valid' }
      ],
      health: 'stable',
      expiryDays: 180,
      createdDays: 15
    }
  ]
};

export const getHealthConfig = (health) => {
  const configs = {
    stable: {
      label: 'Stable',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
      dotColor: 'bg-emerald-500'
    },
    'at-risk': {
      label: 'At Risk',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/40',
      dotColor: 'bg-yellow-500'
    },
    critical: {
      label: 'Critical',
      color: 'text-red-700',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      dotColor: 'bg-red-500'
    },
    expired: {
      label: 'Expired',
      color: 'text-gray-700',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/40',
      dotColor: 'bg-gray-500'
    }
  };
  return configs[health] || configs.stable;
};

export const getAssumptionConfig = (status) => {
  const configs = {
    valid: {
      label: 'Valid',
      color: 'text-emerald-700',
      icon: '✓'
    },
    aging: {
      label: 'Needs Review',
      color: 'text-yellow-700',
      icon: '⚠'
    },
    invalid: {
      label: 'Invalid',
      color: 'text-red-700',
      icon: '✕'
    }
  };
  return configs[status] || configs.valid;
};
