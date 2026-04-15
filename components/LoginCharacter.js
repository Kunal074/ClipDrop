'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function LoginCharacter({ isPasswordFocused }) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const characterRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (isPasswordFocused || !characterRef.current) return;
      const rect = characterRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 8;
      const factor = Math.min(dist / 120, 1);
      setEyeOffset({
        x: (dx / (dist || 1)) * maxOffset * factor,
        y: (dy / (dist || 1)) * maxOffset * factor,
      });
    },
    [isPasswordFocused]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    if (isPasswordFocused) setEyeOffset({ x: 0, y: 0 });
  }, [isPasswordFocused]);

  const headTilt = isPasswordFocused ? -18 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <svg
        ref={characterRef}
        viewBox="0 0 260 380"
        width="260"
        height="380"
        style={{ userSelect: 'none' }}
      >
        <defs>
          <radialGradient id="ghostGlow" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.75 0.18 250)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="oklch(0.75 0.18 250)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <ellipse cx="130" cy="200" rx="100" ry="160" fill="url(#ghostGlow)">
          <animate attributeName="ry" values="160;165;160" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Ghost body group with float animation */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-8; 0,0"
            dur="2.5s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
          />

          {/* Ghost body */}
          <path
            d="M 70 180 Q 70 80, 130 60 Q 190 80, 190 180 L 190 290 Q 180 270, 170 290 Q 160 310, 150 290 Q 140 270, 130 290 Q 120 310, 110 290 Q 100 270, 90 290 Q 80 310, 70 290 Z"
            fill="var(--ghost-body)"
            opacity="0.92"
          />

          {/* Ghost highlight */}
          <path
            d="M 95 100 Q 100 80, 130 70 Q 140 75, 135 100"
            fill="var(--ghost-highlight)"
            opacity="0.25"
          />

          {/* Arms */}
          {isPasswordFocused ? (
            <>
              <ellipse cx="92" cy="148" rx="16" ry="10" fill="var(--ghost-body)" opacity="0.9"
                style={{ transition: 'all 0.4s ease' }} />
              <ellipse cx="168" cy="148" rx="16" ry="10" fill="var(--ghost-body)" opacity="0.9"
                style={{ transition: 'all 0.4s ease' }} />
            </>
          ) : (
            <>
              <ellipse cx="68" cy="200" rx="14" ry="10" fill="var(--ghost-body)" opacity="0.85"
                style={{ transition: 'all 0.4s ease' }} />
              <ellipse cx="192" cy="200" rx="14" ry="10" fill="var(--ghost-body)" opacity="0.85"
                style={{ transition: 'all 0.4s ease' }} />
            </>
          )}

          {/* Head group with tilt */}
          <g style={{
            transform: `rotate(${headTilt}deg)`,
            transformOrigin: '130px 155px',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {isPasswordFocused ? (
              <>
                <path d="M 103 148 Q 110 142 117 148" fill="none" stroke="var(--ghost-eye)" strokeWidth="3" strokeLinecap="round" />
                <path d="M 143 148 Q 150 142 157 148" fill="none" stroke="var(--ghost-eye)" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="110" cy="148" rx="16" ry="18" fill="var(--ghost-eye-white)" opacity="0.95" />
                <ellipse cx="150" cy="148" rx="16" ry="18" fill="var(--ghost-eye-white)" opacity="0.95" />
                <circle cx={110 + eyeOffset.x} cy={148 + eyeOffset.y} r="7" fill="var(--ghost-eye)"
                  style={{ transition: 'cx 0.08s ease-out, cy 0.08s ease-out' }} />
                <circle cx={110 + eyeOffset.x * 0.6 - 2} cy={145 + eyeOffset.y * 0.5} r="2.5" fill="var(--ghost-eye-white)" opacity="0.8"
                  style={{ transition: 'cx 0.08s ease-out, cy 0.08s ease-out' }} />
                <circle cx={150 + eyeOffset.x} cy={148 + eyeOffset.y} r="7" fill="var(--ghost-eye)"
                  style={{ transition: 'cx 0.08s ease-out, cy 0.08s ease-out' }} />
                <circle cx={150 + eyeOffset.x * 0.6 - 2} cy={145 + eyeOffset.y * 0.5} r="2.5" fill="var(--ghost-eye-white)" opacity="0.8"
                  style={{ transition: 'cx 0.08s ease-out, cy 0.08s ease-out' }} />
              </>
            )}

            {/* Blush */}
            <ellipse cx="95" cy="168" rx="10" ry="5" fill="var(--ghost-blush)" opacity="0.25" />
            <ellipse cx="165" cy="168" rx="10" ry="5" fill="var(--ghost-blush)" opacity="0.25" />

            {/* Mouth */}
            {isPasswordFocused ? (
              <>
                <ellipse cx="130" cy="182" rx="6" ry="7" fill="var(--ghost-mouth)" opacity="0.7">
                  <animate attributeName="ry" values="7;8;7" dur="0.7s" repeatCount="indefinite" />
                </ellipse>
                <text x="168" y="130" fontSize="16" fill="var(--color-primary)" fontFamily="serif" opacity="0.7">
                  ♪
                  <animateTransform attributeName="transform" type="translate" values="0,0; 8,-12; 0,0" dur="1.5s" repeatCount="indefinite" />
                </text>
                <text x="185" y="118" fontSize="12" fill="var(--color-accent)" fontFamily="serif" opacity="0.5">
                  ♫
                  <animateTransform attributeName="transform" type="translate" values="0,0; 4,-8; 0,0" dur="1.2s" repeatCount="indefinite" />
                </text>
              </>
            ) : (
              <path d="M 118 178 Q 130 192 142 178" fill="none" stroke="var(--ghost-mouth)" strokeWidth="2.5" strokeLinecap="round" />
            )}
          </g>

          {/* Shadow */}
          <ellipse cx="130" cy="340" rx="50" ry="8" fill="var(--ghost-shadow)" opacity="0.3">
            <animate attributeName="rx" values="50;45;50" dur="2.5s" repeatCount="indefinite"
              calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" />
          </ellipse>
        </g>
      </svg>
    </div>
  );
}
