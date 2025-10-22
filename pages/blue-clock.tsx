// A simple blue digital clock that updates every second.
import React, { useState, useEffect } from 'react';

export default function BlueClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup the interval on component unmount
    return () => {
      clearInterval(timerId);    };
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-blue-600 text-white font-mono text-5xl p-10 rounded-lg shadow-lg">
        {time.toLocaleTimeString()}
      </div>
    </div>
  );
}
