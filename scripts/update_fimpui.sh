#!/bin/bash
version=$1
echo "Updating to version: $version"
wget https://storage.googleapis.com/fh-repo/thingsplex_${version}_armhf.deb
sudo dpkg -i thingsplex_${version}_armhf.deb
