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
  appResourceType:string;
  lastOpStatus : string;
  lastError  : string;
  manifest   : any;

  username:string;
  password:string;

  accessToken:string;
  refreshToken:string;
  expiresIn:number;
  tokenType:string = "bearer";
  accessScope:string;

  authErrorCode :string;
  authErrorText :string;

  private registrySub: Subscription = null;
  constructor(private fimp:FimpService,private route: ActivatedRoute,private appsReg:AppsRegistryService) {

  }

  ngOnInit() {
    this.appName = this.route.snapshot.params['name'];
    this.appVersion = this.route.snapshot.params['version'];

    this.registrySub = this.appsReg.registryState$.subscribe((state) => {
      if(state=="allLoaded") {
        this.app = this.appsReg.getAppByName(this.appName);
        if (this.app.appType=="adapter" || this.app.appType=="ad") {
          this.appResourceType = "ad";
        }else {
          this.appResourceType = "app";
        }
        this.requestManifest();
      }
      console.log("App configurator. registry state = "+state);

    });


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
      }else if (fimpMsg.service == this.appName) {
        if(fimpMsg.mtype == "evt.app.manifest_report" )
        {
          this.manifest = fimpMsg.val;
          this.lastOpStatus = "ok";
          this.remapManifest();
          console.log("Manifest loaded")

          console.dir(this.manifest)
        }else if (fimpMsg.mtype == "evt.app.config_report") {
          if (fimpMsg.val.op_status=="OK") {
            // maybe do something here
          }
          this.requestManifest()
        }else if (fimpMsg.mtype == "evt.app.config_action_report") {
          // if (fimpMsg.val.op_status!="OK") {
            this.manifest.app_state.last_error_code = fimpMsg.val.error_code;
            this.manifest.app_state.last_error_text = fimpMsg.val.error_text;
          // }
          if (fimpMsg.val.next == "config" || fimpMsg.val.next == "auth" || fimpMsg.val.next == "reload"){
            this.requestManifest()
          }

        }else if (fimpMsg.mtype == "evt.app.error_report") {
          this.manifest.app_state.last_error_code = fimpMsg.val.err_code;
          this.manifest.app_state.last_error_text = fimpMsg.val.err_text;
        }else if (fimpMsg.mtype == "evt.auth.status_report") {
          if(fimpMsg.val.status=="AUTHENTICATED") {

          }else {

          }
          this.authErrorCode = fimpMsg.val.error_code;
          this.authErrorText = fimpMsg.val.error_text;
          this.requestManifest()
        }

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

  requestManifest(){
    this.lastOpStatus = "Working....";
    this.lastError = "";

    let msg  = new FimpMessage(this.appName,"cmd.app.get_manifest","string","manifest_state",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.appName+"/ad:1",msg.toString());
  }

  remapManifest() {
    if (!this.manifest.configs) {
      return;
    }
    for(let i in this.manifest.configs) {
      let conf = this.manifest.configs[i];
      if (this.manifest.config_state){
        conf["_state"] = this.manifest.config_state[conf.id];
      }
    }
  }

  saveConfigChanges() {
    this.lastOpStatus = "Working....";
    this.lastError = "";
    let val = {};
    for(let i in this.manifest.configs) {
      val[this.manifest.configs[i].id] = this.manifest.configs[i]["_state"];
    }
    let msg  = new FimpMessage(this.appName,"cmd.config.extended_set","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.appName+"/ad:1",msg.toString());
  }

  sendButtonAction(msgType:string,val:string) {
    this.lastOpStatus = "Working....";
    this.lastError = "";
    let msg  = new FimpMessage(this.appName,msgType,"string",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.appName+"/ad:1",msg.toString());
  }

  login() {
    this.lastOpStatus = "Authorizing....";
    this.lastError = "";
    let val = {
      "username":this.username,
      "password":this.password,
      "encrypted":false
    };
    let msg  = new FimpMessage(this.appName,"cmd.auth.login","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.appName+"/ad:1",msg.toString());
  }
  sendTokens() {
    this.lastOpStatus = "Authorizing....";
    this.lastError = "";
    let val = {
      "access_token":this.accessToken,
      "refresh_token":this.refreshToken,
      "token_type":this.tokenType,
      "encrypted":false,
      "expires_in":this.expiresIn,
      "scope":this.accessScope
    };

    let msg  = new FimpMessage(this.appName,"cmd.auth.set_tokens","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.appName+"/ad:1",msg.toString());
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}



