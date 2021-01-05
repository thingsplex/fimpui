import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { Subscription } from "rxjs";
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {AppRecord, AppsRegistryService} from "./apps-registry.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'apps-man',
  templateUrl: './apps-man.component.html',
  styleUrls: ['./apps-man.component.css']
})


export class AppsManComponent implements OnInit {
  globalSub : Subscription;
  apps      : AppRecord[] = [];
  filter    : string = "user";
  private registrySub: Subscription = null;
  constructor(private fimp:FimpService,private appsReg:AppsRegistryService,public snackBar: MatSnackBar) {

  }

  ngOnInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.version_report" )
        {

        }else if(fimpMsg.mtype == "evt.app.ctrl_report" )
        {
          /*{
          "app": "teleport",
          "app_status": "active",
          "op": "state",
          "op_error": "",
          "op_status": "ok"
        }
        */
          if (fimpMsg.val.app_status=="active")
            this.snackBar.open('App'+fimpMsg.val.app+' installed successfully',"",{duration:3000});
          else
            this.snackBar.open('App'+fimpMsg.val.app+' installation failed . Error:'+fimpMsg.val.op_error,"",{duration:5000});
        }
      }else if (fimpMsg.service == "fhbutler") {

      }
    });

    this.registrySub = this.appsReg.registryState$.subscribe((state) => {
      if(state=="allLoaded") {
        this.apps = this.appsReg.getListOfApps();
        this.snackBar.open('Done!',"",{duration:3000});
      }
      console.log("new registry state = "+state);

    });

    // if (this.appsReg.isInitialized()) {
    //   this.apps = this.appsReg.getListOfApps();
    // }

  }

  controlApp(name:string,op:string){
    let val = {
      "op": op,
      "app": name,
      "ver": ""
    }
    console.log("Installing "+name);
    this.snackBar.open('Installing the app '+name+'....',"",{duration:3000});
    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }

  setLogLevel(name:string,level:string,appType:string) {
      console.log("Setting application log level . Service"+name+" level="+level)
      let msg  = new FimpMessage(name,"cmd.log.set_level","string",level,null,null)
      msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
      this.fimp.publish("pt:j1/mt:cmd/rt:"+appType+"/rn:"+name+"/ad:1",msg);
  }

  requestInstalledApps() {
    this.snackBar.open('Reloading list of apps ',"",{duration:10000});
    this.apps = [];
    this.appsReg.requestInstalledApps();
  }

  discoverLocalApps() {
    this.snackBar.open('Discovering local apps ',"",{duration:10000});
    this.appsReg.discoverLocalApps();
  }

  checkForUpdates() {
    this.snackBar.open('Downloading list of available updates ',"",{duration:10000});
    this.apps = [];
    this.appsReg.checkForUpdates();
  }


  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}



