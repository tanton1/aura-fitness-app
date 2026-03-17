import React from 'react';
import { LOGO_URL } from '../constants';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
    </div>
  );
}
