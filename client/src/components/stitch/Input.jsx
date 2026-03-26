import React, { useState } from 'react';

export const Input = ({ icon: Icon, className = '', ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      {Icon && (
        <Icon 
          className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
            isFocused ? 'text-[#00eefc]' : 'text-[#a9abb3]'
          }`} 
          size={20} 
        />
      )}
      <input
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          w-full py-3 rounded-xl font-inter bg-[#000000]/40
          text-[#ecedf6] outline-none transition-all duration-300
          border border-[#45484f]/10
          focus:border-transparent focus:ring-1 focus:ring-[#00eefc]
          ${Icon ? 'pl-11 pr-4' : 'px-4'}
          ${className}
        `}
        {...props}
      />
    </div>
  );
};

