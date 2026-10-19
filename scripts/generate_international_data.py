"""Compatibility entry point for the CP global dataset generator."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("generate_global_data.py")), run_name="__main__")
