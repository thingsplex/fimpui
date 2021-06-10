version="1.1.9"
version_file=VERSION
working_dir=$(shell pwd)
arch="armhf"
remote_host = "fh@cube.local"
reprepo_host = "reprepro@archive.futurehome.no"

build-js:
	-mkdir -p package/debian/opt/fimpui/static/fimpui
	cd static/fimpui;ng build --prod --deploy-url=/fimp/static/
	cp -R static/fimpui/dist package/debian/opt/fimpui/static/fimpui/
	cp -R static/help package/debian/opt/fimpui/static/
	cp -R static/misc package/debian/opt/fimpui/static/

build-go-arm:
	GOOS=linux GOARCH=arm GOARM=6 go build -ldflags="-s -w -X main.Version=${version}" -o fimpui

build-go-mac-arm64:
	GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w -X main.Version=${version}" -o fimpui

build-go-mac-amd64:
	GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w -X main.Version=${version}" -o fimpui

build-go:
	go build -ldflags="-X main.Version=${version}" -o fimpui

build-go-amd64:
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -X main.Version=${version}" -o package/docker/build/amd64/fimpui

build-go-arm64:
	GOOS=linux GOARCH=arm64 go build -ldflags="-s -w -X main.Version=${version}" -o package/docker/build/arm64/fimpui

build-go-x86:
	GOOS=linux GOARCH=386 go build -ldflags="-s -w main.Version=${version}" -o fimpui

clean-deb:
	find package/debian -name ".DS_Store" -delete

clean:
	-rm -R package/debian/opt/fimpui/static/fhcore/*
	-rm -R package/debian/opt/fimpui/static/fimpui/dist/*
	-rm package/debian/opt/fimpui/fimpui
	-rm fimpui

configure-arm:
	python ./scripts/config_env.py prod $(version) armhf

configure-amd64:
	python ./scripts/config_env.py prod $(version) amd64

configure-dev-js:
	python ./scripts/config_env.py dev $(version) armhf


prep-docker:
	cp fimpui package/docker
	cp VERSION package/docker
	cp -R static/fimpui/dist package/docker/static/fimpui/
	cp -R static/help package/docker/static/
	cp -R static/misc package/docker/static/

package-docker-amd64:prep-docker
	docker buildx build --platform linux/amd64 -t thingsplex/tplexui:${version} -t thingsplex/tplexui:latest ./package/docker

package-docker-arm64:prep-docker
	docker buildx build --platform linux/arm64 -t thingsplex/tplexui:${version} -t thingsplex/tplexui:latest ./package/docker

package-docker-multi:prep-docker
	docker buildx build --platform linux/arm64,linux/amd64 -t thingsplex/tplexui:${version} -t thingsplex/tplexui:latest ./package/docker --push

package-tar:
	cp fimpui package/tar
	cp VERSION package/tar
	cp -R static/fimpui/dist package/tar/static/fimpui/
	cp -R static/help package/tar/static/
	cp -R static/misc package/tar/static/
	tar cvzf package/build/tplexui_${version}.tar.gz package/tar

package-deb-doc:clean-deb
	@echo "Packaging application as debian package"
	chmod a+x package/debian/DEBIAN/*
	cp fimpui package/debian/opt/fimpui
	cp VERSION package/debian/opt/fimpui
	cp -R static/fimpui/dist package/debian/opt/fimpui/static/fimpui/
	cp -R static/help package/debian/opt/fimpui/static/
	cp -R static/misc package/debian/opt/fimpui/static/
	-mkdir package/build
	docker run --rm -v ${working_dir}:/build -w /build --name debuild debian dpkg-deb --build package/debian
	@echo "Done"

tar-arm: clean configure-amd64 build-js build-go-arm package-tar
	@echo "ARM-lunux application was packaged into tar archive "

tar-mac-arm64: clean configure-amd64 build-js build-go-mac-arm64 package-tar
	@echo "MAC-arm64 application was packaged into tar archive "

tar-mac-amd64: clean configure-amd64 build-js build-go-mac-amd64 package-tar
	@echo "MAC-amd64 application was packaged into tar archive "

deb-arm : clean configure-arm build-js build-go-arm package-deb-doc
	mv package/debian.deb package/build/fimpui_$(version)_armhf.deb

deb-amd : configure-amd64 build-js build-go-amd64 package-deb-doc
	mv package/debian.deb package/build/fimpui_$(version)_amd64.deb

docker-amd64 : build-go-amd64 package-docker-amd64

docker-arm64 : build-go-arm64 package-docker-arm64

docker-multi-setup : configure-amd64 build-js
	docker buildx create --name mybuilder
	docker buildx use mybuilder

docker-multi-publish : build-go-arm64 build-go-amd64 package-docker-multi

set-dev : configure-dev-js build-go

build-mac : build-js build-go

upload :
	scp package/build/fimpui_$(version)_armhf.deb $(remote_host):~/

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

start-dev-webserver:
	cd static/fimpui;ng serve

publish-reprepo:
	scp package/build/fimpui_$(version)_armhf.deb $(reprepo_host):~/apps

run :
	go run main.go -c var/

docker-run :
	docker run -p 8081:8081 --name tplexui thingsplex/tplexui:$(version)

.phony : clean