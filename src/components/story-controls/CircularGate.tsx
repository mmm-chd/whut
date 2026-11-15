import { ArrowDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import './CircularGate.css';

interface CircularGateProps {
  label: string;
  hint?: string;
  placement?: 'opening' | 'stage' | 'dialogue';
  onActivate: () => void;
}

export function CircularGate({ label, hint, placement = 'stage', onActivate }: CircularGateProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className={`circular-gate circular-gate--${placement}`} data-circular-gate>
      <button
        ref={buttonRef}
        type="button"
        className="circular-gate__button"
        aria-label={label}
        onClick={onActivate}
      >
        <span className="circular-gate__pulse" aria-hidden="true" />
        <span className="circular-gate__label">Continue</span>
        {placement === 'stage' ? (
          <ArrowDown className="circular-gate__icon" size={22} aria-hidden="true" />
        ) : null}
        {placement === 'dialogue' ? (
          <ChevronRight className="circular-gate__icon" size={20} strokeWidth={3} aria-hidden="true" />
        ) : null}
      </button>
      {hint ? <span className="circular-gate__hint">{hint}</span> : null}
    </div>
  );
}
