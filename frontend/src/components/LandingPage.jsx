import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Flag, TrendingUp, Activity, AlertTriangle, Clock, Users } from 'lucide-react';
import Aurora from './Aurora';

const LandingPage = ({ onGetStarted, onSeeDemo }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="landing-page text-gray-900 overflow-x-hidden relative">
      {/* Aurora Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff]">
        <Aurora
          colorStops={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]}
          amplitude={0.5}
          blend={0.35}
        />
      </div>
      
      {/* Subtle overlay for depth */}
      <div className="fixed inset-0 bg-white/10 pointer-events-none" />
      
      {/* Keep subtle wave overlay for aesthetic */}
      <div className="fixed inset-0 opacity-[0.08] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1440 800" preserveAspectRatio="none">
          <path d="M0,160 Q360,120 720,160 T1440,160 L1440,0 L0,0 Z" fill="url(#wave1)" />
          <path d="M0,320 Q360,280 720,320 T1440,320 L1440,0 L0,0 Z" fill="url(#wave2)" opacity="0.5" />
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8fa7ff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#c7d3ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#eef2ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f6f9ff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Grid Background Overlay */}
      <div className="fixed inset-0 bg-grid-pattern-light opacity-[0.03] pointer-events-none" />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12 overflow-hidden">
        
        <div className="relative z-10 max-w-7xl w-full mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-block">
              <div className="text-[#1d4ed8] font-semibold text-sm tracking-wider uppercase mb-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#1d4ed8]" />
                Decision Intelligence Platform
              </div>
            </div>
            
            <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-gray-900">
              Stronger Decisions.
              <br />
              <span className="text-gray-800">Smarter Organizations.</span>
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              Decivue is the intelligent platform that helps teams make adaptive, data-driven decisions with clarity. Monitor decision health, track assumptions, and adapt before problems escalate.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="group relative px-8 py-4 bg-[#1d4ed8] text-white font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-blue-glow hover:scale-[1.02]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Get Started — It's Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button 
                onClick={onSeeDemo}
                className="px-8 py-4 bg-white backdrop-blur-sm text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-300"
              >
                See How It Works
              </button>
            </div>
            
            <div className="pt-8 text-sm text-gray-500">
              Start making clearer decisions in minutes.<br />
              No credit card required.
            </div>
          </div>
          
          {/* Right - Dashboard Preview */}
          <div className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative">
              {/* Dashboard Mock */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="text-xs text-gray-500 font-mono">10:45 AM · Source: Fleet Report loaded</div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                </div>
                
                {/* Decision Cards */}
                <div className="space-y-3">
                  <DecisionCard 
                    title="Cloud Provider Future"
                    status="Stable"
                    statusColor="green"
                    date="2d ago"
                  />
                  <DecisionCard 
                    title="Partnership Strategy"
                    status="At Risk"
                    statusColor="yellow"
                    date="5d ago"
                  />
                  <DecisionCard 
                    title="International Markets Expansion"
                    status="Critical"
                    statusColor="red"
                    date="8d ago"
                  />
                  <DecisionCard 
                    title="Product Launch Timeline"
                    status="Expired"
                    statusColor="gray"
                    date="12d ago"
                  />
                </div>
              </div>
              
              {/* Floating Health Indicator */}
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 shadow-xl">
                <div className="text-sm text-gray-600 mb-2">Decision Flow</div>
                <div className="flex items-center gap-2">
                  {[38, 45, 52, 48, 55, 50, 58].map((height, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div 
                        className="w-2 bg-gradient-to-t from-[#1d4ed8] to-[#3b82f6] rounded-full transition-all duration-300 hover:scale-110" 
                        style={{ height: `${height}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Social Proof Bar */}
      <section className="relative py-16 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p className="text-center text-gray-500 text-sm mb-8 uppercase tracking-wider">Trusted by forward-thinking teams</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale">
            <Logo name="Dropbox" />
            <Logo name="Notion" />
            <Logo name="Slack" />
            <Logo name="Slack" />
            <Logo name="Stripe" />
            <Logo name="Stripe" />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-gray-900">Keep a Pulse on Your Team's Decisions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              As decisions mature, things change. Track your team's organizational foundational work in real-time.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<CheckCircle className="w-8 h-8" />}
              title="Monitor Decision Health"
              description="Quickly see which decisions in your organization are Stable, At Risk, or Critical."
              link="Learn Decision Monitoring"
            />
            <FeatureCard 
              icon={<Flag className="w-8 h-8" />}
              title="Track Assumptions"
              description="Understand and monitor the key assumptions driving your team's decisions."
              link="Track in Slack"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-8 h-8" />}
              title="Analyze Impact"
              description="Visualize how a change in one decision could ripple through your organization."
              link="View Change Simulator"
            />
          </div>
        </div>
      </section>
      
      {/* Insight Section */}
      <section className="relative py-32 px-6 md:px-12 bg-gradient-to-b from-transparent via-[#eef2ff]/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Copy */}
            <div className="space-y-8">
              <div className="inline-block">
                <div className="text-[#1d4ed8] font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
                  <div className="w-8 h-[1px] bg-[#1d4ed8]" />
                  Real-Time Reporting Tailored for <span className="text-[#1d4ed8]">Change</span>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold leading-tight text-gray-900">
                Spot risks early as conditions shift.
              </h2>
              
              <div className="space-y-6 text-gray-600">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#1d4ed8]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Receive clear, actionable insights</div>
                    <div>Spot risks early on every decision, show your board them in your dashboard.</div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#1d4ed8]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Iterate with your team and get notified</div>
                    <div>When belief changes require decision review.</div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-white" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-white" />
                  </div>
                  <div className="text-gray-600">
                    <div className="flex items-center gap-1 text-yellow-500 font-semibold">
                      ★★★★★ <span className="text-gray-900 ml-1">4.9/5</span>
                    </div>
                    <div className="text-xs">350+ teams • 14M+ decisions tracked • Approved Reports</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right - Risk Overview Dashboard */}
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Risk Overview</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">•••</button>
                </div>
                
                {/* Risk Score Circle */}
                <div className="flex items-center justify-center mb-8">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="40" 
                        fill="none" 
                        stroke="url(#gradient)" 
                        strokeWidth="8" 
                        strokeDasharray="251.2" 
                        strokeDashoffset="62.8"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-bold text-gray-900">64</div>
                      <div className="text-sm text-gray-600 mt-1">Risk Score</div>
                    </div>
                  </div>
                </div>
                
                {/* Risk Breakdown */}
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-3">Impact category · 56</div>
                  <RiskItem label="Stable" percentage="36%" color="green" />
                  <RiskItem label="At Risk" percentage="30%" color="yellow" />
                  <RiskItem label="Critical" percentage="26%" color="red" />
                </div>
                
                {/* Decision Cards */}
                <div className="mt-6 space-y-3">
                  <RiskDecisionCard 
                    icon={<Activity className="w-5 h-5" />}
                    title="Cloud Provider Future"
                    subtitle="Decisions that your team needs revision, more insights, more..."
                    status="Stable"
                    statusColor="green"
                  />
                  <RiskDecisionCard 
                    icon={<Activity className="w-5 h-5" />}
                    title="Marketing Budget Allocation"
                    subtitle="Trouble market execution could become core investment agenda..."
                    status="At Risk"
                    statusColor="yellow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Decision Flow Section */}
      <section className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Decision Flow</h2>
            <p className="text-gray-400">Track each decision lifecycle as conditions evolve</p>
          </div>
          
          <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl p-12 border border-white/10">
            {/* Timeline */}
            <div className="flex items-center justify-between mb-8">
              {['10 Oct', '11 Oct', '11/1PM', '11 / 5PM', '11/10PM', '12/1AM', '13/1AM'].map((date, i) => (
                <div key={i} className="text-xs text-gray-500 font-mono">{date}</div>
              ))}
            </div>
            
            {/* Flow Chart */}
            <div className="relative h-64">
              <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <path 
                  d="M 0 150 Q 150 140, 200 120 T 400 100 T 600 80 T 800 90 T 1000 70" 
                  fill="none" 
                  stroke="url(#lineGradient)" 
                  strokeWidth="3"
                />
                {[0, 200, 400, 600, 800, 1000].map((x, i) => (
                  <circle 
                    key={i}
                    cx={x} 
                    cy={150 - i * 15} 
                    r="6" 
                    fill="#3b82f6" 
                    className="animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="relative py-32 px-6 md:px-12 bg-gradient-to-b from-[#f6f9ff] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900">
              Teams Are Making <span className="text-[#1d4ed8]">Smarter Decisions</span> with Decivue.
            </h2>
            <p className="text-gray-600">
              Sign-up now and transform how you view your team side-effects - one risk today.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              name="Sarah Mendel"
              title="Planning Manager · TechCorp"
              quote="Using Decivue transformed how we HANDLE DECISION HYGIENE. We realized that many risky impacts we left untouched have hidden damage potential."
            />
            <TestimonialCard 
              name="Andrew Clark"
              title="COO as innovation"
              quote="It takes three months for you to invest another initiative and every value and assumptions gets hidden once you delegate. Decivue shows everything centrally and bright."
            />
            <TestimonialCard 
              name="Julie Nguyen"
              title="Reports Manager · Nexel"
              quote="We narrowed a team's leadership insights from what Beliefs are aging, what assumptions become invalid, what expiry needs prioritized decision."
            />
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="relative py-32 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8fa7ff]/25 rounded-full blur-[150px] pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-6xl font-bold leading-tight text-gray-900">
                Ready to Make Better Decisions?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join thousands of teams using Decivue to track, monitor, and optimize their decision-making process.
              </p>
              
              <div className="pt-8">
                <button 
                  onClick={onGetStarted}
                  className="group relative px-12 py-5 bg-[#1d4ed8] text-white text-lg font-semibold rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-blue-glow-lg hover:scale-[1.05] hover:bg-[#1e40af]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Get Started — It's Free
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 pt-4">
                No credit card required · Start in minutes · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative border-t border-gray-200 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold text-gray-900">Decivue</div>
          <div className="flex gap-8 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">Product</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Docs</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>
          <div className="text-sm text-gray-500">
            © 2026 Decivue. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Supporting Components
const DecisionCard = ({ title, status, statusColor, date }) => {
  const colorMap = {
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  
  return (
    <div className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-500">{date}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${colorMap[statusColor]}`}>
          {status}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};

const Logo = ({ name }) => (
  <div className="text-xl font-bold tracking-tight">{name}</div>
);

const FeatureCard = ({ icon, title, description, link }) => (
  <div className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-2">
    {/* Hover Glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary-accent/0 to-primary-accent/0 group-hover:from-primary-accent/5 group-hover:to-primary-accent/0 rounded-3xl transition-all duration-500" />
    
    <div className="relative z-10">
      <div className="w-16 h-16 rounded-2xl bg-primary-accent/10 flex items-center justify-center text-primary-accent mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 mb-6 leading-relaxed">{description}</p>
      
      <a href="#" className="inline-flex items-center gap-2 text-primary-accent font-semibold hover:gap-3 transition-all">
        {link}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  </div>
);

const RiskItem = ({ label, percentage, color }) => {
  const colorMap = {
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${colorMap[color]}`} />
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <span className="text-sm font-semibold">{percentage}</span>
    </div>
  );
};

const RiskDecisionCard = ({ icon, title, subtitle, status, statusColor }) => {
  const colorMap = {
    green: 'text-emerald-400',
    yellow: 'text-yellow-400'
  };
  
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex gap-3">
        <div className="text-primary-accent mt-1">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1">{title}</div>
          <div className="text-xs text-gray-500 line-clamp-2 mb-2">{subtitle}</div>
          <div className={`text-xs font-medium ${colorMap[statusColor]}`}>● {status}</div>
        </div>
      </div>
    </div>
  );
};

const TestimonialCard = ({ name, title, quote }) => (
  <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800" />
      <div>
        <div className="font-bold">{name}</div>
        <div className="text-sm text-gray-400">{title}</div>
      </div>
    </div>
    <p className="text-gray-400 leading-relaxed italic">"{quote}"</p>
  </div>
);

export default LandingPage;
