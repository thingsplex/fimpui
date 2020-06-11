version="0.17.1"
version_file=VERSION
working_dir=$(shell pwd)
arch="armhf"
remote_host = "fh@cube.local"

build-js:
	cd static/fimpui;ng build --prod --deploy '/fimp/static/'

build-go-arm:
	GOOS=linux GOARCH=arm GOARM=6 go build -ldflags="-s -w" -o fimpui

build-go:
	go build -o fimpui

build-go-amd:
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o fimpui

build-tsdb-loader-osx:
	cd  process/tsdb/cli/;go build -o fimp-inxlux-loader

clean:
	-rm -R debian/opt/fimpui/static/fhcore/*
	-rm -R debian/opt/fimpui/static/fimpui/dist/*
	-rm debian/opt/fimpui/fimpui
	-rm fimpui

configure-arm:
	python ./scripts/config_env.py prod $(version) armhf

configure-amd64:
	python ./scripts/config_env.py prod $(version) amd64

configure-dev-js:
	python ./scripts/config_env.py dev $(version) armhf	

package-tar:
	tar cvzf fimpui.tar.gz fimpui VERSION static/fimpui/dist static/fhcore

package-deb-doc:
	@echo "Packaging application as debian package"
	chmod a+x debian/DEBIAN/*
	cp fimpui debian/opt/fimpui
	cp VERSION debian/opt/fimpui
	cp -R static/fimpui/dist debian/opt/fimpui/static/fimpui/
	cp -R static/help debian/opt/fimpui/static/
	docker run --rm -v ${working_dir}:/build -w /build --name debuild debian dpkg-deb --build debian
	@echo "Done"

tar-arm: build-js build-go-arm package-deb-doc
	@echo "The application was packaged into tar archive "

deb-arm : clean configure-arm build-js build-go-arm package-deb-doc
	mv debian.deb fimpui_$(version)_armhf.deb

deb-amd : configure-amd64 build-js build-go-amd package-deb-doc
	mv debian.deb fimpui_$(version)_amd64.deb

set-dev : configure-dev-js build-go

build-mac : build-js build-go

upload :
	scp fimpui_$(version)_armhf.deb $(remote_host):~/

upload-install : upload
	ssh -t $(remote_host) "sudo dpkg -i fimpui_$(version)_armhf.deb"

remote-install : deb-arm upload
	ssh -t $(remote_host) "sudo dpkg -i fimpui_$(version)_armhf.deb"

install-mqtt-broker:
	docker run -p 1883:1883 --name vernemq -d -e "DOCKER_VERNEMQ_ACCEPT_EULA=yes" -e "DOCKER_VERNEMQ_ALLOW_ANONYMOUS=on" erlio/docker-vernemq

start-mqtt-broker:
	docker start vernemq

stop-mqtt-broker:
	docker stop vernemq

run :
	go run main.go -c var/config_local.json


.phony : clean