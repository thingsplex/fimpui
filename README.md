# FIMPUI

### Build Static Files
```shell
make build-js
```

### Run Angular dev app
```shell
ng serve
```
Then open http://localhost:4200

### Run Go Server
Set server config in `var/data/config.json` and then:

```shell
make run
```

### Create Debian Package
```shell
make deb-arm
```

### Rsync static files for deverlopment
```shell
GOOS=linux GOARCH=arm GOARM=6 go build -o thingsplex_arm
rsync -a static/fimpui/dist fh@aleks.local:~/thingsplex/static/fimpui/
scp thingsplex_arm fh@aleks.local:~/thingsplex/
```

### Other
**Package** :
tar cvzf thingsplex.tar.gz thingsplex_arm static/thingsplex/dist
scp thingsplex.tar.gz fh@aleks.local:~/thingsplex/

**Unpackage** : 
tar -xvf thingsplex.tar.gz
Update static/thingsplex/dist/index.html
