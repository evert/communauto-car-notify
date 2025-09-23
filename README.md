Look for close-by Communauto flex cars and get an alert
========================================================

Sick of refreshing the app or (even worse!) the web app for a close-by car?
This command-line script checks nearby cars on a loop and pops up a desktop
notification when it finds one.

![CLI output](image/screenshot1.png)

![Notification](image/screenshot2.png)


Installation
------------

This script has been tested on Fedora Linux 39 and requires Node and
`geoclue2-demos` to fetch the current latitude and longitude.
If you are on any other system and it doesn't work, let me know
via an issue and I'll update this script to get it to work.

## Fedora

```
sudo dnf install geoclue2-demos nodejs
```

Usage
-----

Just run `./run.mjs`. 

```bash

Usage: node run.mjs [options]

Options:
  -d, --delay <seconds>   Delay between requests (default: 15)
  -c, --city <name>       City name (default: toronto). Supported cities: ${
    Object.keys(branchIds).join(", ")
  }
  -l, --location <coord>  Location coordinates (e.g. "43.7,-79.4")
  -h, --help              Show this help message

Examples:
  node run.mjs --delay 30 --city montreal
  node run.mjs -d 10 -c vancouver
  node run.mjs -l "45.5,-73.6"
  node run.mjs --help
``````
