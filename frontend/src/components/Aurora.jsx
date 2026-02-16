import React, { useEffect, useRef, useState } from 'react';

const Aurora = ({ colorStops = ["#313ce3", "#98f0fb", "#a68ce3"], amplitude = 0.5, blend = 1 }) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || window.innerWidth,
          height: rect.height || window.innerHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    
    ctx.scale(dpr, dpr);

    let time = 0;
    let animationId;

    const drawAurora = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Create multiple aurora layers
      for (let i = 0; i < colorStops.length; i++) {
        const color = colorStops[i];
        const offset = (i / colorStops.length) * Math.PI * 2;
        const size = 500 + i * 180;
        
        // Position calculations for organic movement - slower, more graceful
        const x = dimensions.width / 2 + Math.sin(time * 0.3 + offset) * (dimensions.width * 0.2 * amplitude);
        const y = dimensions.height / 2 + Math.cos(time * 0.2 + offset) * (dimensions.height * 0.2 * amplitude);
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        
        gradient.addColorStop(0, hexToRgba(color, 0.3 * blend));
        gradient.addColorStop(0.5, hexToRgba(color, 0.15 * blend));
        gradient.addColorStop(1, hexToRgba(color, 0));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      }
      
      time += 0.003; // Slower, more subtle movement
      animationId = requestAnimationFrame(drawAurora);
    };

    drawAurora();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [colorStops, amplitude, blend, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        mixBlendMode: 'normal',
        opacity: blend
      }}
    />
  );
};

// Helper function to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default Aurora;
