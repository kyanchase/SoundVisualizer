import { useState } from 'react';

export default function Card({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card"
      style={{
        boxShadow: hovered
          ? '0 20px 40px rgba(0,242,254,0.3)'
          : '0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(255,255,255,0.5)',
        transform: hovered ? 'translateY(-10px) scale(1.05)' : 'none',
        filter: hovered ? 'brightness(1.1)' : 'none',
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}
