#!/bin/sh
set -e

echo "Updating config"
echo "MQTT_HOST: ${MQTT_HOST}"
echo "MQTT_PORT: ${MQTT_PORT}"
echo "MQTT_USERNAME: ${MQTT_USERNAME}"
echo "MQTT_PASSWORD: ${MQTT_PASSWORD}"

sed -i "/mqtt_server_uri/c\  \"mqtt_server_uri\":\"tcp://${MQTT_HOST}:${MQTT_PORT}\"," config.json
sed -i "/mqtt_server_username/c\  \"mqtt_server_username\":\"${MQTT_USERNAME}\"," config.json
sed -i "/mqtt_server_password/c\  \"mqtt_server_password\":\"${MQTT_PASSWORD}\"," config.json

exec "$@"