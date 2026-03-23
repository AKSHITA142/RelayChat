import React from 'react';

export const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseClasses = 'px-6 py-2 rounded-full font-inter font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-95 flex items-center justify-center';
  
  const variants = {
    primary: 'bg-gradient-to-br from-[#c59aff] to-[#9547f7] text-[#420082]',
    secondary: 'bg-transparent border-[1.5px] border-[#00eefc] text-[#00eefc] shadow-[inset_0_0_4px_rgba(0,238,252,0.2)] hover:backdrop-blur-[24px]',
  };

  return (
    <button className={`${baseClasses} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};
