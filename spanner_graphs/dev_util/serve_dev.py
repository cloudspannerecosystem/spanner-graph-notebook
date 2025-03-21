# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys
import threading
import subprocess
import time
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from spanner_graphs.graph_server import GraphServer

class ParcelServer:
    def __init__(self, port=1234):
        self.port = port
        self.process = None
        
    def start(self):
        # Change to the frontend directory
        os.chdir(str(project_root / 'frontend'))
        
        # Create a command to start Parcel in dev mode with hot reloading
        cmd = ["npx", "parcel", "serve", "static/dev.html"]

        # Start Parcel process
        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )

        # Start a thread to log Parcel output
        threading.Thread(target=self._log_output, daemon=True).start()

    def _log_output(self):
        """Print Parcel output to console"""
        for line in iter(self.process.stdout.readline, ''):
            print(f"Parcel: {line.strip()}")
    
    def stop(self):
        if self.process:
            self.process.terminate()
            self.process.wait()
            print("\nParcel development server stopped")

def main():
    parcel_server = None
    
    try:
        # Set GraphServer port to 8975
        GraphServer.set_port(8975)
        
        # Start the graph server
        graph_server_thread = GraphServer.init()
        print(f"GraphServer started on port {GraphServer.port}")
        
        # Start the Parcel server in a separate thread
        parcel_server = ParcelServer()
        parcel_server.start()
        
        print("\nPress Ctrl+C to stop the servers...")
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        if parcel_server:
            parcel_server.stop()
        GraphServer.stop_server()
        sys.exit(0)

if __name__ == "__main__":
    main() 