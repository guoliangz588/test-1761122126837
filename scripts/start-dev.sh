#!/bin/bash

# Set the port to check
PORT=4000

# Find the PID of the process using the specified port
# The -t flag outputs only the PID, which is ideal for scripting
PID=$(lsof -ti :$PORT)

# Check if a PID was found
if [ ! -z "$PID" ]; then
  echo "Process found on port $PORT with PID: $PID. Attempting to kill it..."
  kill -9 $PID
  # Give a moment for the OS to release the port
  sleep 1 
  echo "Process killed successfully."
else
  echo "No process found on port $PORT. Proceeding to start server."
fi

# Start the Next.js development server
echo "Starting development server..."
npm run dev 