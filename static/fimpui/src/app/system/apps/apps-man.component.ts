import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { Subscription } from "rxjs/Subscription";
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {AppRecord, AppsRegistryService} from "./apps-registry.service";

@Component({
  selector: 'apps-man',
  templateUrl: './apps-man.component.html',
  styleUrls: ['./apps-man.component.css']
})


export class AppsManComponent implements OnInit {
  globalSub : Subscription;
  apps      : AppRecord[] = [];
  private registrySub: Subscription = null;
  constructor(private fimp:FimpService,private appsReg:AppsRegistryService) {

  }

  ngOnInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.version_report" )
        {

        }
      }else if (fimpMsg.service == "fhbutler") {

      }
    });

    this.registrySub = this.appsReg.registryState$.subscribe((state) => {
      if(state=="allLoaded") {
        this.apps = this.appsReg.getListOfApps();
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
    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map","",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }

  requestInstalledApps() {
    this.apps = [];
    this.appsReg.requestInstalledApps();
  }
  checkForUpdates() {
    this.apps = [];
    this.appsReg.checkForUpdates();
  }


  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}



