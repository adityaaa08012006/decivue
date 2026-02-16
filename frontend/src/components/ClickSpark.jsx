import React, { useEffect, useRef } from 'react';

const ClickSpark = ({ 
  children, 
  sparkColor = '#fff', 
  sparkSize = 14, 
  sparkRadius = 15, 
  sparkCount = 8,
  duration = 400 
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createSpark = (x, y) => {
      const sparksContainer = document.createElement('div');
      sparksContainer.style.position = 'fixed';
      sparksContainer.style.left = `${x}px`;
      sparksContainer.style.top = `${y}px`;
      sparksContainer.style.pointerEvents = 'none';
      sparksContainer.style.zIndex = '9999';

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        const angle = (360 / sparkCount) * i;
        const radian = (angle * Math.PI) / 180;
        
        spark.style.position = 'absolute';
        spark.style.width = `${sparkSize}px`;
        spark.style.height = `${sparkSize}px`;
        spark.style.backgroundColor = sparkColor;
        spark.style.borderRadius = '50%';
        spark.style.left = '0';
        spark.style.top = '0';
        spark.style.transform = 'translate(-50%, -50%)';
        spark.style.opacity = '1';
        
        const tx = Math.cos(radian) * sparkRadius;
        const ty = Math.sin(radian) * sparkRadius;
        
        spark.animate([
          { 
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: 1 
          },
          { 
            transform: `translate(${tx}px, ${ty}px) scale(0)`,
            opacity: 0 
          }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        });

        sparksContainer.appendChild(spark);
      }

      document.body.appendChild(sparksContainer);
      
      setTimeout(() => {
        document.body.removeChild(sparksContainer);
      }, duration);
    };

    const handleClick = (e) => {
      createSpark(e.clientX, e.clientY);
    };

    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

export default ClickSpark;
