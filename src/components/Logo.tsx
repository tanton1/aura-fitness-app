import React from 'react';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <h1 
        className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text"
        style={{
          backgroundImage: 'linear-gradient(to bottom, #ff007f, #ff66b2)',
          WebkitTextStroke: '1px #ff007f',
          textShadow: '0 0 15px rgba(255, 0, 127, 0.6)'
        }}
      >
        AURA
      </h1>
      <span className="text-[10px] font-bold text-white tracking-widest bg-[#ff007f] px-2 py-0.5 rounded-sm mt-[-6px] z-10 shadow-[0_0_10px_rgba(255,0,127,0.8)]">
        +FITNESS+
      </span>
    </div>
  );
}
