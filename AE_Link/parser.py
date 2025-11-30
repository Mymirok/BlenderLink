import os
import json
from typing import List, Dict, Optional

def get_json_files(directory: str) -> List[str]:
    """Return names of all JSON files in directory"""
    if not os.path.isdir(directory):
        return []
    
    return [f for f in os.listdir(directory) 
            if f.lower().endswith('.json') and os.path.isfile(os.path.join(directory, f))]

def read_json_file(filepath: str) -> Optional[Dict]:
    """Safely read and parse JSON file"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"Error reading {filepath}: {str(e)}")
        return None