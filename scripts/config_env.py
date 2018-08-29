import sys

def set_deb_control(version , arch):
    file_name  = "./debian/DEBIAN/control"
    template = "Package: thingsplex\n"
    template+= "Version: "+version+"\n"
    template+= "Replaces: thingsplex\n"
    template+= "Architecture: "+arch+"\n"
    template+= "Maintainer: Aleksandrs Livincovs <aleksandrs.livincovs@gmail.com>\n"
    template+= "Description: FimpUI is support GUI for FIMP protocol .\n"

    f = open(file_name,"w")
    f.write(template)
    f.close()

def set_static_globals(environment):
    if environment == "prod" :
        template = 'export const BACKEND_ROOT = ""'
    elif environment == "dev" :
        template = 'export const BACKEND_ROOT = "http://localhost:8081"'    
    
    file_name  = "./static/thingsplex/src/app/globals.ts"
    f = open(file_name,"w")
    f.write(template)
    f.close()    

def set_version_file(version):
    file_name = "./VERSION"
    f = open(file_name,"w")
    f.write(version)
    f.close()    

if __name__ == "__main__":
   environment = sys.argv[1] 
   version = sys.argv[2]
   arch = sys.argv[3]
   set_deb_control(version,arch)
   set_static_globals(environment)
   set_version_file(version)