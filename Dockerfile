FROM debian:jessie

RUN mkdir -p /opt/fimpui/static/fimpui \
    && touch /opt/fimpui/thingsplex.log

COPY ./static/fimpui/dist /opt/fimpui/static/fimpui/dist
COPY ./fimpui /opt/fimpui/fimpui
COPY var/data/config_local.json /opt/fimpui/config.json


ENV MQTT_HOST=host.docker.internal \
    MQTT_PORT=1883 \
    MQTT_USERNAME= \
    MQTT_PASSWORD=

WORKDIR /opt/fimpui

COPY docker-entrypoint.sh docker-entrypoint.sh

ENTRYPOINT ["/opt/fimpui/docker-entrypoint.sh"]

EXPOSE 8081

CMD ["/opt/fimpui/fimpui", "-c", "/opt/fimpui/config.json"]
