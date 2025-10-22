/*
 * A simple UI component that displays the current time.
 * Generated UI Tool Component
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClockDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // Use 24-hour format  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });  return (
    <Card className="w-full max-w-md mx-auto p-6 text-center shadow-lg">
      <CardHeader>
        <CardTitle className="text-4xl font-bold text-primary">
          {formattedTime}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg text-muted-foreground mt-2">
          {formattedDate}
        </p>
        <div className="mt-6 text-sm text-gray-500">
          <p>Your local time</p>
        </div>
      </CardContent>    </Card>
  );
}
