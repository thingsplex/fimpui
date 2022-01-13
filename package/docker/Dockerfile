FROM alpine:edge

ARG TARGETARCH

COPY ./data /opt/tplexui/data
COPY ./defaults /opt/tplexui/defaults
COPY ./static /opt/tplexui/static
COPY ./build/$TARGETARCH/fimpui /opt/tplexui/fimpui

EXPOSE 8081/tcp

WORKDIR /opt/tplexui/
CMD ["/opt/tplexui/fimpui", "-c", "/opt/tplexui/"]
