#!/bin/bash
# Add all Nix Python 3.12 site-packages to PYTHONPATH
# so subprocess spawned by Node.js can find numpy/pandas from Nix packages
while IFS= read -r dir; do
  export PYTHONPATH="$dir:${PYTHONPATH:-}"
done < <(find /nix/store -maxdepth 5 -name "site-packages" -path "*/python3.12/*" 2>/dev/null)

echo "[start.sh] PYTHONPATH=$PYTHONPATH"
exec npm start
