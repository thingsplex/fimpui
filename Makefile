version="0.6.16"
version_file=VERSION
working_dir=$(shell pwd)
arch="armhf"

build-js:
	cd static/fimpui;ng build --prod --deploy '/fimp/static/'

build-go-arm:
	GOOS=linux GOARCH=arm GOARM=6 go build -o thingsplex

build-go:
	go build -o thingsplex

build-go-amd:
	GOOS=linux GOARCH=amd64 go build -o thingsplex

clean:
	-rm -R debian/opt/thingsplex/static/fhcore/*
	-rm -R debian/opt/thingsplex/static/thingsplex/dist/*
	-rm debian/opt/thingsplex/thingsplex
	-rm thingsplex

configure-arm:
	python ./scripts/config_env.py prod $(version) armhf

configure-amd64:
	python ./scripts/config_env.py prod $(version) amd64

configure-dev-js:
	python ./scripts/config_env.py dev $(version) armhf	

package-tar:
	tar cvzf thingsplex.tar.gz thingsplex VERSION static/thingsplex/dist static/fhcore

package-deb-doc:
	@echo "Packaging application as debian package"
	chmod a+x debian/DEBIAN/*
	cp thingsplex debian/opt/thingsplex
	cp VERSION debian/opt/thingsplex
	cp -R static/thingsplex/dist debian/opt/thingsplex/static/thingsplex/
	cp -R static/fhcore debian/opt/thingsplex/static/
	docker run --rm -v ${working_dir}:/build -w /build --name debuild debian dpkg-deb --build debian
	@echo "Done"

tar-arm: build-js build-go-arm package-deb-doc
	@echo "The application was packaged into tar archive "

deb-arm : clean configure-arm build-js build-go-arm package-deb-doc
	mv debian.deb thingsplex_$(version)_armhf.deb

deb-amd : configure-amd64 build-js build-go-amd package-deb-doc
	mv debian.deb thingsplex_$(version)_amd64.deb

set-dev : configure-dev-js build-go

build-mac : build-js build-go

run :
	go run main.go -c var/config_local.json


.phony : clean