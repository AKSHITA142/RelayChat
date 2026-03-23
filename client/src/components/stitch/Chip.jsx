import React from 'react';

export const Chip = ({ label, active = false, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-xs font-inter transition-all duration-300
        ${active ? 'bg-[#006970] text-[#ecedf6]' : 'bg-[#10131a] hover:bg-[#1c2028] text-[#a9abb3]'}
        ${className}
      `}
    >
      {label}
    </button>
  );
};
