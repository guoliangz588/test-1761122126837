/*
 * A digital clock UI component displaying the current time with a distinct style.
 * Generated UI Tool Component
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DigitalClock() {
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
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="w-full max-w-sm mx-auto p-4 bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-xl shadow-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-5xl font-mono tracking-wider text-center">
          {formattedTime}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-lg text-center opacity-80">
          {formattedDate}
        </p>
        <div className="mt-4 text-xs text-center opacity-60">
          <p>Live Digital Clock</p>
        </div>
      </CardContent>
    </Card>
  );
}
