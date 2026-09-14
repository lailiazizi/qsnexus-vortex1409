
import React, { useState } from 'react';

interface ThreeDBoxProps {
  name: string;
  width: number;
  height: number;
  depth: number;
  rotation: { x: number; y: number; z: number };
  opacity: number;
  position: { x: number; y: number; z: number };
  isSelected: boolean;
  baseColor: string;
  includeReinforcement?: boolean;
  showMeasurements?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

export const ThreeDBox: React.FC<ThreeDBoxProps> = ({
  name,
  width,
  height,
  depth,
  rotation,
  opacity,
  position,
  isSelected,
  baseColor,
  includeReinforcement,
  showMeasurements,
  onMouseDown,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const isActive = isSelected || isHovered;
  // Increase inactive opacity for better visibility
  const finalOpacity = isActive ? 1.0 : 0.7;
  const adjustedOpacity = includeReinforcement ? Math.min(finalOpacity, 0.6) : finalOpacity;

  const getShadedColor = (color: string, percent: number) => {
    const f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      'rgba(' +
      (Math.round((t - R) * p) + R) +
      ',' +
      (Math.round((t - G) * p) + G) +
      ',' +
      (Math.round((t - B) * p) + B) +
      `, ${adjustedOpacity})`
    );
  };

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    userSelect: 'none',
    border: isSelected 
      ? '2px solid rgba(255,255,255,1)' 
      : isHovered 
        ? '2px solid rgba(59, 130, 246, 0.8)' 
        : '1px solid rgba(255,255,255,0.15)',
    boxShadow: isSelected 
      ? '0 0 30px rgba(59, 130, 246, 0.4) inset' 
      : isHovered 
        ? '0 0 15px rgba(59, 130, 246, 0.2) inset' 
        : 'none',
    // CRITICAL FIX: Ensure backface visibility is always 'visible' 
    // Otherwise, box faces disappear when the box or face is rotated 180 degrees.
    backfaceVisibility: 'visible', 
    transition: 'all 0.1s linear',
    transformOrigin: 'center',
  };

  const renderMeasurements = () => {
    if (!showMeasurements || !isSelected) return null;

    const lineCol = '#fbbf24'; 
    const labelBg = '#0f172a'; 
    const offset = 50; 

    return (
      <div className="absolute inset-0 preserve-3d pointer-events-none z-[200]">
        {/* Length (X) */}
        <div className="absolute border-t-2 border-dashed flex items-center justify-center" 
          style={{ 
            width, 
            borderColor: lineCol,
            transform: `translate3d(0, ${halfH + offset}px, ${halfD}px)`,
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.6))'
          }}>
          <div className="absolute left-0 h-6 w-0.5" style={{backgroundColor: lineCol}} />
          <div className="absolute right-0 h-6 w-0.5" style={{backgroundColor: lineCol}} />
          <span className="px-3 py-1 text-[12px] text-white font-black rounded-md border-2 border-amber-500 shadow-2xl flex items-center gap-1" 
                style={{ backgroundColor: labelBg }}>
            {width}mm
          </span>
        </div>

        {/* Height (Y) */}
        <div className="absolute border-l-2 border-dashed flex items-center justify-center" 
          style={{ 
            height, 
            borderColor: lineCol,
            transform: `translate3d(${halfW + offset}px, 0, ${halfD}px)`,
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.6))'
          }}>
          <div className="absolute top-0 w-6 h-0.5" style={{backgroundColor: lineCol}} />
          <div className="absolute bottom-0 w-6 h-0.5" style={{backgroundColor: lineCol}} />
          <span className="px-3 py-1 text-[12px] text-white font-black rounded-md border-2 border-amber-500 shadow-2xl rotate-90 flex items-center gap-1" 
                style={{ backgroundColor: labelBg }}>
            {height}mm
          </span>
        </div>

        {/* Thickness (Z) */}
        <div className="absolute border-l-2 border-dashed flex items-center justify-center" 
          style={{ 
            height: depth, 
            borderColor: lineCol,
            transform: `translate3d(${-halfW - offset}px, ${-halfH}px, 0) rotateX(90deg)`,
            transformOrigin: 'top',
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.6))'
          }}>
          <div className="absolute top-0 w-6 h-0.5" style={{backgroundColor: lineCol}} />
          <div className="absolute bottom-0 w-6 h-0.5" style={{backgroundColor: lineCol}} />
          <span className="px-3 py-1 text-[12px] text-white font-black rounded-md border-2 border-amber-500 shadow-2xl -rotate-90 whitespace-nowrap flex items-center gap-1" 
                style={{ backgroundColor: labelBg }}>
            {depth}mm
          </span>
        </div>
      </div>
    );
  };

  const renderReinforcement = () => {
    if (!includeReinforcement) return null;
    const spacing = 40;
    const barsX = Math.floor(width / spacing);
    const barsY = Math.floor(height / spacing);

    return (
      <div className="absolute inset-0 preserve-3d pointer-events-none">
        {/* Main Grid */}
        {Array.from({ length: barsY + 1 }).map((_, i) => (
          <div key={`x-${i}`} className="absolute bg-slate-800" style={{ width, height: 3, left: 0, top: i * spacing, transform: `translateZ(${-halfD + 10}px)` }} />
        ))}
        {Array.from({ length: barsX + 1 }).map((_, i) => (
          <div key={`y-${i}`} className="absolute bg-slate-800" style={{ width: 3, height: height, left: i * spacing, top: 0, transform: `translateZ(${-halfD + 12}px)` }} />
        ))}
        {/* Vertical Links (Stirrups) */}
        {barsX > 0 && barsY > 0 && [0, barsX].map(xi => [0, barsY].map(yi => (
          <div key={`z-${xi}-${yi}`} className="absolute bg-slate-700" style={{ width: 4, left: xi * spacing, top: yi * spacing, transform: `rotateX(90deg) translateZ(${0}px)`, height: depth, transformOrigin: 'top' }} />
        )))}
      </div>
    );
  };

  return (
    <div
      className={`absolute preserve-3d cursor-pointer transition-all duration-100 ${isSelected ? 'z-[100]' : isHovered ? 'z-[90]' : 'z-10'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        width,
        height,
        left: '50%',
        top: '50%',
        transform: `
          translate(-50%, -50%) 
          translate3d(${position.x}px, ${position.y}px, ${position.z}px) 
          rotateX(${rotation.x}deg) 
          rotateY(${rotation.y}deg) 
          rotateZ(${rotation.z}deg)
        `,
      }}
    >
      {/* Hover Name Tag */}
      {isHovered && (
        <div 
          className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-2xl z-[300] border border-white/20 whitespace-nowrap pointer-events-none flex items-center gap-2"
          style={{ transform: `translateX(-50%) rotateX(${-rotation.x}deg) rotateZ(${-rotation.z}deg)` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: baseColor }}></div>
          {name}
        </div>
      )}

      {renderReinforcement()}
      {renderMeasurements()}

      {/* Front Face */}
      <div style={{ ...faceStyle, width, height, backgroundColor: getShadedColor(baseColor, 0.2), transform: `translate3d(0, 0, ${halfD}px)` }}></div>
      
      {/* Back Face */}
      <div style={{ ...faceStyle, width, height, backgroundColor: getShadedColor(baseColor, -0.6), transform: `rotateY(180deg) translate3d(0, 0, ${halfD}px)` }}></div>
      
      {/* Top Face */}
      <div style={{ ...faceStyle, width, height: depth, backgroundColor: getShadedColor(baseColor, -0.15), top: (height - depth) / 2, transform: `rotateX(90deg) translate3d(0, 0, ${halfH}px)` }}></div>
      
      {/* Bottom Face */}
      <div style={{ ...faceStyle, width, height: depth, backgroundColor: getShadedColor(baseColor, -0.4), top: (height - depth) / 2, transform: `rotateX(-90deg) translate3d(0, 0, ${halfH}px)` }}></div>
      
      {/* Right Face */}
      <div style={{ ...faceStyle, width: depth, height, backgroundColor: getShadedColor(baseColor, -0.25), left: (width - depth) / 2, transform: `rotateY(90deg) translate3d(0, 0, ${halfW}px)` }}></div>
      
      {/* Left Face */}
      <div style={{ ...faceStyle, width: depth, height, backgroundColor: getShadedColor(baseColor, -0.25), left: (width - depth) / 2, transform: `rotateY(-90deg) translate3d(0, 0, ${halfW}px)` }}></div>
    </div>
  );
};
