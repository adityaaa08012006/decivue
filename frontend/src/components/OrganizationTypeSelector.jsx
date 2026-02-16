import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { organizationTypes } from '../utils/organizationTemplates';
import Aurora from './Aurora';
import ClickSpark from './ClickSpark';

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
    <ClickSpark
      sparkColor='#3b82f6'
      sparkSize={14}
      sparkRadius={25}
      sparkCount={8}
      duration={400}
    >
    <div className="org-selector-page fixed inset-0 z-50 overflow-y-auto">
      {/* Aurora Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff]">
        <Aurora
          colorStops={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]}
          amplitude={0.5}
          blend={0.35}
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

          {/* Organization Type Cards - Full Width Edge to Edge */}
          <div className="flex gap-4 w-full">
            {organizationTypes.map((orgType, index) => {
              const Icon = orgType.icon;
              
              return (
                <button
                  key={orgType.id}
                  onClick={() => handleSelect(orgType)}
                  className="group relative flex-1 aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg cursor-pointer"
                >
                  {/* Background Image Layer */}
                  <div className="absolute inset-0 rounded-[24px] overflow-hidden">
                    <img 
                      src={orgBackgrounds[orgType.id]} 
                      alt={`${orgType.name} background`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  {/* Dark Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/60 to-transparent" />

                  {/* Content Layer - Bottom Left Aligned */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="relative z-10">
                      {/* Icon - Minimal Monochrome */}
                      <div className="mb-4">
                        <div className="inline-flex w-14 h-14 rounded-[16px] items-center justify-center backdrop-blur-xl border border-white/20 bg-white/15">
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Title - Bold Typography */}
                      <h3 className="text-[22px] font-bold text-white mb-2 leading-tight tracking-tight">
                        {orgType.name}
                      </h3>
                      
                      {/* Subtitle - Descriptive */}
                      <p className="text-white/90 text-[15px] leading-relaxed mb-4 font-medium">
                        {orgType.description}
                      </p>

                      {/* CTA Button - Prominent Pill */}
                      <div className="inline-flex">
                        <div className="px-6 py-2.5 rounded-full font-semibold text-[14px] bg-white/90 text-gray-900">
                          <span className="flex items-center gap-2">
                            <span>Explore</span>
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Border for Depth */}
                  <div className="absolute inset-0 rounded-[24px] border border-white/10 pointer-events-none" />
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
    </ClickSpark>
  );
};

export default OrganizationTypeSelector;
