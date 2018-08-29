

**Build Angular 2** : 
cd static/thingsplex
ng build 
 or 
ng build --prod --deploy '/fimp/static/'

cd ../../
**Run Angular dev app** :

ng serve 
open http://localhost:4200

**Rsync static files for deverlopment:**
 
GOOS=linux GOARCH=arm GOARM=6 go build -o thingsplex_arm

rsync -a static/thingsplex/dist fh@aleks.local:~/thingsplex/static/thingsplex/

scp thingsplex_arm fh@aleks.local:~/thingsplex/

**Package** :
tar cvzf thingsplex.tar.gz thingsplex_arm static/thingsplex/dist
scp thingsplex.tar.gz fh@aleks.local:~/thingsplex/
**Unpackage** : 
tar -xvf thingsplex.tar.gz
Update static/thingsplex/dist/index.html
