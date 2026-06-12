import { ButtonHTMLAttributes, forwardRef } from 'react';
import { haptic, type HapticLevel } from '@/lib/feedback/haptic';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  level?: HapticLevel;
}

export const HapticButton = forwardRef<HTMLButtonElement, Props>(function HapticButton(
  { level = 'light', onClick, onTouchStart, onMouseDown, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      onTouchStart={(e) => {
        haptic(level);
        onTouchStart?.(e);
      }}
      onMouseDown={(e) => {
        haptic(level);
        onMouseDown?.(e);
      }}
      onClick={onClick}
    />
  );
});