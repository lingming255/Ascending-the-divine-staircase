import React from 'react';

const GrisBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 
        GRIS Style Implementation:
        1. Base Texture: SVG Fractal Noise for paper/canvas grain
        2. Atmosphere: Large, blurred, breathing watercolor blobs
        3. Blending: Overlay mode to interact with the underlying sky gradient
      */}

      {/* SVG Noise Filter Definition */}
      <svg className="absolute w-0 h-0">
        <filter id="paper-grain">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.65" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.15" /> {/* Low opacity for subtle grain */}
          </feComponentTransfer>
        </filter>
      </svg>

      {/* 1. Grain Overlay Layer */}
      <div 
        className="absolute inset-0 w-full h-full opacity-40 mix-blend-overlay"
        style={{ filter: 'url(#paper-grain)' }}
      />

      {/* 2. Watercolor Blobs Layer */}
      <div className="absolute inset-0 w-full h-full mix-blend-overlay opacity-50">
        <style>
          {`
            @keyframes drift-1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.95); }
            }
            @keyframes drift-2 {
              0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
              50% { transform: translate(-40px, -30px) scale(1.2) rotate(5deg); }
            }
            @keyframes drift-3 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(20px, 40px) scale(0.9); }
            }
            
            .blob-1 { animation: drift-1 25s ease-in-out infinite; }
            .blob-2 { animation: drift-2 35s ease-in-out infinite; }
            .blob-3 { animation: drift-3 45s ease-in-out infinite; }
          `}
        </style>

        {/* Teal Blob (Top Left) */}
        <div className="blob-1 absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-teal-200/30 rounded-full blur-[80px]" />

        {/* Pink Blob (Bottom Right) */}
        <div className="blob-2 absolute -bottom-[10%] -right-[10%] w-[70vw] h-[70vw] bg-pink-200/30 rounded-full blur-[100px]" />

        {/* Indigo Blob (Center-ish) */}
        <div className="blob-3 absolute top-[20%] left-[30%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full blur-[90px]" />
      </div>
    </div>
  );
};

export default GrisBackground;
