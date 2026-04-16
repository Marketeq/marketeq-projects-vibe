// src/renderer/components/ui/avatar.tsx
//
// Minimal Avatar / AvatarImage / AvatarFallback implementation that
// satisfies the subset of the frontend API used by the desktop-tracker
// components. Pure React — no Radix, no CVA, no external icon packs.

import * as React from 'react';
import { cn } from '../../utils/functions';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClass: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
  '2xl': 'h-16 w-16',
};

interface AvatarContextValue {
  size: AvatarSize;
}
const AvatarContext = React.createContext<AvatarContextValue>({ size: 'xs' });

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  isOnline?: boolean;
  containerClassName?: string;
  badgeClassName?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      size = 'xs',
      isOnline,
      containerClassName,
      badgeClassName,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <AvatarContext.Provider value={{ size }}>
        <div className={cn('relative inline-block', containerClassName)}>
          <div
            ref={ref}
            className={cn(
              'relative flex shrink-0 overflow-hidden rounded-full bg-primary-25',
              sizeClass[size],
              className,
            )}
            {...props}
          >
            {children}
          </div>
          {isOnline && (
            <span
              className={cn(
                'absolute -bottom-[1.5px] -right-[1.5px] inline-block rounded-full border-[1.5px] border-white bg-success-500 h-[9px] w-[9px]',
                badgeClassName,
              )}
            />
          )}
        </div>
      </AvatarContext.Provider>
    );
  },
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt = '', ...props }, ref) => {
    const [loaded, setLoaded] = React.useState(false);
    const [errored, setErrored] = React.useState(false);
    const normalizedSrc =
      typeof src === 'string' && src.trim().length === 0 ? undefined : src;
    if (!normalizedSrc || errored) return null;
    return (
      <img
        ref={ref}
        src={normalizedSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'aspect-square h-full w-full object-cover',
          !loaded && 'opacity-0',
          className,
        )}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  AvatarFallbackProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-primary-25 text-primary-500 font-medium text-xs',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
AvatarFallback.displayName = 'AvatarFallback';
