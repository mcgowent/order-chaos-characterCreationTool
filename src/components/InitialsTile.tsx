import { initials } from '../rules';
import './InitialsTile.css';

interface Props {
  name: string;
  portrait?: string;
  size: number;
  /** 'card' = gold-dim frame; 'hero' = gold frame with stronger glow. */
  variant?: 'card' | 'hero';
  fallback?: string;
}

export function InitialsTile({ name, portrait, size, variant = 'card', fallback = '?' }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return (
    <span className={`initials initials--${variant}`} style={style} aria-hidden="true">
      {portrait ? <img src={portrait} alt="" className="initials__img" /> : initials(name) || fallback}
    </span>
  );
}
