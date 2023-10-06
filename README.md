# FIMPUI

### Essential Setup
__On MacOS__

- Install Python2
- Create an alias for `python`
  ```shell
  alias python=python3
  ```

- Install required compilers
  ```shell
  xcode-select --install
  ```

__Install Node 13__
  ```shell
  nvm install 13
  nvm use 13
  node -v
  ```

__Install required NPM packages__
  ```shell
  cd static/fimpui && npm install
  ```

### Run Locally
__Build Static Files__
  ```shell
  make build-ng
  ```

__Run Go Server__

Set server config in `var/data/config.json` and then:

```shell
make run
```

You can now visit `localhost:8081` in your browser.

_Note:_ You will not get hot reloading and your html/ts/css changes will not be reflected until you run `make build-ng` again.

### Create Debian Package
```shell
make deb-arm
```

### Rsync static files for development
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
