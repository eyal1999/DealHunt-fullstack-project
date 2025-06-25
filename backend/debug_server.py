#!/usr/bin/env python3

import sys
import traceback

try:
    print("Starting debug server...")
    
    # Test imports
    print("Testing imports...")
    from app.main import app
    print("✓ Main app imported successfully")
    
    # Test startup manually
    import uvicorn
    print("✓ Uvicorn imported successfully")
    
    print("Starting server on port 8003...")
    uvicorn.run(app, host="127.0.0.1", port=8003, reload=False)
    
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)