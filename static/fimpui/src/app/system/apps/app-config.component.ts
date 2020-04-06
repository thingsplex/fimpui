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
import {Location} from "../../tpui-modules/registry/model";
import {ActivatedRoute} from "@angular/router";
import {AppRecord, AppsRegistryService} from "./apps-registry.service";

@Component({
  selector: 'app-config',
  templateUrl: './app-config.component.html',
  styleUrls: ['./app-config.component.css']
})


export class AppConfigComponent implements OnInit {
  globalSub : Subscription;
  app      : AppRecord;
  appName   :string;
  appVersion:string;
  appStatus :string;
  lastOpStatus : string;
  lastError  : string;
  constructor(private fimp:FimpService,private route: ActivatedRoute,private appsReg:AppsRegistryService) {

  }

  ngOnInit() {
    this.appName = this.route.snapshot.params['name'];
    this.appVersion = this.route.snapshot.params['version'];
    this.app = this.appsReg.getAppByName(this.appName);
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.ctrl_report" )
        {
          /*{
          "app": "teleport",
          "app_status": "active",
          "op": "state",
          "op_error": "",
          "op_status": "ok"
        }
        */
          this.appStatus = fimpMsg.val.app_status;
          this.lastOpStatus = fimpMsg.val.op_status;
          this.lastError = fimpMsg.val.op_error;
        }
      }else if (fimpMsg.service == "fhbutler") {

      }
    });
  }


  controlApp(op:string){
    this.lastOpStatus = "Working....";
    this.lastError = "";
    let val = {
      "op": op,
      "app": this.appName,
      "ver": ""
    }
    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }


  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}


