import React from 'react';

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`
      p-5 rounded-xl bg-[#22262f]/40 backdrop-blur-[12px]
      border border-[#45484f]/15
      shadow-[0_10px_40px_-5px_rgba(236,237,246,0.05)]
      ${className}
    `}>
      {children}
    </div>
  );
};
