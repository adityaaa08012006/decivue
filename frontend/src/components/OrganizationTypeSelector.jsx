import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { organizationTypes } from '../utils/organizationTemplates';
import Aurora from './Aurora';

// Organization background images from public folder
const orgBackgrounds = {
  business: '/cards/buisness.jpg',
  ngo: '/cards/Ngos.jpg',
  government: '/cards/government.jpg',
  consulting: '/cards/consulting.jpg'
};

const OrganizationTypeSelector = ({ onSelect, onBack }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSelect = (orgType) => {
    onSelect(orgType);
  };

  return (
    <div className="org-selector-page fixed inset-0 z-50 overflow-y-auto">
      {/* Aurora Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#faf5ff] via-[#f3f0ff] to-[#ede9ff]">
        <Aurora
          colorStops={["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"]}
          amplitude={0.7}
          blend={0.45}
        />
      </div>
      
      {/* Subtle Noise Texture Overlay */}
      <div className="fixed inset-0 noise-texture pointer-events-none" />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className={`max-w-4xl w-full transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <div className="text-[#1d4ed8] font-semibold text-sm tracking-wider uppercase flex items-center gap-2 justify-center">
                <div className="w-8 h-[1px] bg-[#1d4ed8]" />
                Step 1 of 2
                <div className="w-8 h-[1px] bg-[#1d4ed8]" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              What kind of organization are you?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose your organization type to see relevant decision-making examples tailored for your industry.
            </p>
          </div>

          {/* Organization Type Cards - Immersive Editorial Style */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {organizationTypes.map((orgType, index) => {
              const Icon = orgType.icon;
              
              return (
                <button
                  key={orgType.id}
                  onClick={() => handleSelect(orgType)}
                  className="org-card group relative h-[380px] rounded-[28px] overflow-hidden transition-all duration-700 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-2"
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Background Image Layer */}
                  <div className="absolute inset-0 rounded-[28px] overflow-hidden">
                    <img 
                      src={orgBackgrounds[orgType.id]} 
                      alt={`${orgType.name} background`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                  </div>

                  {/* Dark Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />

                  {/* Content Layer - Bottom Left Aligned */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <div className="relative z-10 transition-all duration-500 group-hover:-translate-y-2">
                      {/* Icon - Minimal Monochrome */}
                      <div className="mb-6">
                        <div className="inline-flex w-14 h-14 rounded-[18px] items-center justify-center backdrop-blur-xl border border-white/20 transition-all duration-500 bg-white/15 group-hover:bg-white/25 group-hover:scale-110">
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Title - Bold Typography */}
                      <h3 className="text-3xl font-bold text-white mb-3 leading-tight tracking-tight transition-all duration-500 group-hover:translate-y-[-2px]">
                        {orgType.name}
                      </h3>
                      
                      {/* Subtitle - Descriptive */}
                      <p className="text-white/80 text-[15px] leading-relaxed mb-6 font-medium">
                        {orgType.description}
                      </p>

                      {/* CTA Button - Prominent Pill */}
                      <div className="inline-flex">
                        <div className="px-8 py-3.5 rounded-full font-semibold text-[15px] transition-all duration-500 bg-white/90 text-gray-900 group-hover:bg-white group-hover:shadow-[0_8px_24px_rgba(255,255,255,0.35)] group-hover:translate-y-[-2px]">
                          <span className="flex items-center gap-2">
                            <span>Explore</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Border for Depth */}
                  <div className="absolute inset-0 rounded-[28px] border border-white/10 pointer-events-none" />
                </button>
              );
            })}
          </div>

          {/* Skip Option */}
          <div className="text-center mt-12">
            <button
              onClick={() => onSelect({ id: 'skip', name: 'Skip' })}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Skip and create account →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationTypeSelector;
