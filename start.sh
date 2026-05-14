#!/bin/bash
# Find libstdc++.so.6 in Nix store and add to LD_LIBRARY_PATH
# so pip-installed numpy C extensions can load on Railway
LIB=$(find /nix/store -maxdepth 4 -name "libstdc++.so.6" 2>/dev/null | head -1)
if [ -n "$LIB" ]; then
  export LD_LIBRARY_PATH="$(dirname "$LIB"):${LD_LIBRARY_PATH:-}"
  echo "[start.sh] LD_LIBRARY_PATH=$LD_LIBRARY_PATH"
else
  echo "[start.sh] libstdc++.so.6 not found in /nix/store"
fi
exec npm start
