'use client';

import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { ThemeToggleProps } from '@/lib/types';

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="rounded-lg"
      aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
    >
      {theme === 'day' ? (
        <>
          <Moon className="h-4 w-4 mr-2" />
          Night
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 mr-2" />
          Day
        </>
      )}
    </Button>
  );
}
