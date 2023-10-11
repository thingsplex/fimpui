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

__Install Node 14__
  ```shell
  nvm install 14
  nvm use 14
  node -v
  ```

__Install Bun__

We use bun as it is much faster than npm and less error prone.

  ```shell
  curl -fsSL https://bun.sh/install | bash
  ```

__Install required NPM packages__
  ```shell
  cd static/fimpui
  bun install
  npm install
  ```

### Run Locally
__Prepare config__

Set server config in `var/data/config.json`. Example:

```json
{
    "mqtt_server_uri": "tcp://localhost:1883",
    "mqtt_server_username": "",
    "mqtt_server_password": "",
    "mqtt_topic_global_prefix": "8EC4C1C0-CBE4-4D17-851A-8E9495BB238F",
    "mqtt_client_id_prefix": "datatools",
    "log_file": "",
    "log_level": "debug",
    "zwave_product_templates": "",
    "is_dev_mode": true,
    "configured_at": "2021-01-20T19:37:39+01:00",
    "configured_by": "auto",
    "cookie_key": "Gg5v/XH5MOVEIX4SkDm0xsnKMXc0QgfpII+qds30VR0=",
    "tls_cert_dir": "",
    "enable_cb_support": true,
    "global_auth_type": "none",
    "deployment_mode": "local"
}
```

Using `localhost` as your MQTT server assumes you have a local server running.
You can use a local FH hub as well. In this case the server URI can be `tcp://my-box.local:1883` or use the hub IP.

__MQTT Server__
If you choose `localhost` in the config file, you would need to run your own MQTT server. This can be easily achieved with the `eclipse-mosquitto` Docker image.

__Run Go Server__

```shell
make run
```

__Check Backend Root__

Check that `static/fimpui/src/app/globals.ts` has:

```js
BACKEND_ROOT = "http://localhost:8081";
```

__Run ng server__
```shell
# Inside static/fimpui
ng serve
```
You can now visit `localhost:4200` in your browser.

### Create Debian Package
You need to be running Docker with Debian image available.

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
```shell
tar cvzf thingsplex.tar.gz thingsplex_arm static/thingsplex/dist
scp thingsplex.tar.gz fh@aleks.local:~/thingsplex/
```

**Unpackage** : 
```shell
tar -xvf thingsplex.tar.gz
Update static/thingsplex/dist/index.html
```
