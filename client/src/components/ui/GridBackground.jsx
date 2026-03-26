const GridBackground = ({ className = "" }) => {
  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        backgroundColor: '#0a0a0f'
      }}
    />
  );
};

export default GridBackground;
