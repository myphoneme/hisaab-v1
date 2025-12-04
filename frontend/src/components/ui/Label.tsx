import { type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-gray-700 mb-1',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
