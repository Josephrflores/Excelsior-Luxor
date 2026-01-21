#!/bin/bash
# Manually pass env vars via CMD to Windows Node
export ANCHOR_PROVIDER_URL
export ANCHOR_WALLET

echo "DEBUG: Dispatching to Windows CMD..."

"/mnt/c/Windows/System32/cmd.exe" /C "set ANCHOR_PROVIDER_URL=$ANCHOR_PROVIDER_URL&& set ANCHOR_WALLET=$ANCHOR_WALLET&& node ./node_modules/mocha/bin/mocha -r ts-node/register -t 1000000 \"tests/**/*.ts\""
