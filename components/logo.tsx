'use client';

import Image from 'next/image';
import { useTheme } from '@/components/theme-provider';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  const { theme } = useTheme();
  const src = theme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  return (
    <Image
      src={src}
      alt="PT Aliansi Koin Global"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
