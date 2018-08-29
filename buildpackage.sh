#!/bin/bash

cd static/thingsplex
ng build --prod --deploy '/fimp/static/'
cd ../../
GOPATH=~/DevProjects/APPS/GOPATH GOOS=linux GOARCH=arm GOARM=6 go build -o thingsplex
cp thingsplex debian/opt/thingsplex
cp -R static/thingsplex/dist debian/opt/thingsplex/static/thingsplex/dist
cp -R static/fhcore debian/opt/thingsplex/static/fhcore
#tar cvzf thingsplex.tar.gz thingsplex VERSION static/thingsplex/dist static/fhcore
#dpkg-deb --build debian