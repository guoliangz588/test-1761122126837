/*
 * A blue-themed UI component that displays the current time.
 * Generated UI Tool Component
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BlueClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // Use 24-hour format
  });  const formattedDate = time.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="w-full max-w-md mx-auto p-6 text-center bg-blue-600 text-white shadow-xl border-blue-800 border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-5xl font-bold tracking-wide">
          {formattedTime}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-lg opacity-90">
          {formattedDate}
        </p>
        <div className="mt-6 text-sm opacity-70">          <p>A calming blue clock</p>
        </div>
      </CardContent>
    </Card>
  );
}
