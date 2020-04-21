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
import {MatSnackBar} from "@angular/material/snack-bar";

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

  snackRef : any;

  private registrySub: Subscription = null;
  constructor(private fimp:FimpService,private route: ActivatedRoute,private appsReg:AppsRegistryService,public snackBar: MatSnackBar) {

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
        this.snackRef = this.snackBar.open('Loading app manifest...',"",{duration:2000});
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
          this.snackBar.open('Operation status :'+fimpMsg.val.op_status,"",{duration:2000});
        }
      }else if (fimpMsg.service == this.app.fimpServiceName) {
        if(fimpMsg.mtype == "evt.app.manifest_report" )
        {
          console.log("Manifest loaded")
          this.manifest = fimpMsg.val;
          this.lastOpStatus = "ok";
          this.remapManifest();
          // this.snackBar.open('Manifest loaded',"",{duration:2000});
          this.snackRef.dismiss();
        }else if (fimpMsg.mtype == "evt.app.config_report") {
          if (fimpMsg.val.op_status=="OK") {
            this.snackBar.open('Changes successfully saved',"",{duration:2000});
          }else{
            this.snackBar.open('Error:'+fimpMsg.val.app_state.last_error_text,"",{duration:2000});
          }
          this.requestManifest()
        }else if (fimpMsg.mtype == "evt.app.config_action_report") {
          // if (fimpMsg.val.op_status!="OK") {
            this.manifest.app_state.last_error_code = fimpMsg.val.error_code;
            this.manifest.app_state.last_error_text = fimpMsg.val.error_text;
          // }
          this.snackBar.open('Action executed.',"",{duration:2000});
          if (fimpMsg.val.next == "config" || fimpMsg.val.next == "auth" || fimpMsg.val.next == "reload"){
            this.requestManifest()
          }

        }else if (fimpMsg.mtype == "evt.app.error_report") {
          this.manifest.app_state.last_error_code = fimpMsg.val.err_code;
          this.manifest.app_state.last_error_text = fimpMsg.val.err_text;
          this.snackRef = this.snackBar.open('Application error :'+fimpMsg.val.err_text,"");
        }else if (fimpMsg.mtype == "evt.auth.status_report") {
          if(fimpMsg.val.status=="AUTHENTICATED") {
            this.snackBar.open('Authenticated successfully',"",{duration:2000});
          }else {
            this.snackBar.open('Authentication error :'+fimpMsg.val.error_text,"",{duration:5000});
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
    this.snackRef = this.snackBar.open('Controlling application...',"");
  }

  requestManifest(){
    this.lastOpStatus = "Working....";
    this.lastError = "";

    let msg  = new FimpMessage(this.app.fimpServiceName,"cmd.app.get_manifest","string","manifest_state",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.app.fimpServiceName+"/ad:1",msg.toString());
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
    let msg  = new FimpMessage(this.app.fimpServiceName,"cmd.config.extended_set","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.app.fimpServiceName+"/ad:1",msg.toString());
    this.snackRef = this.snackBar.open('Saving configurations...',"");
  }

  sendButtonAction(msgType:string,val:string) {
    this.lastOpStatus = "Working....";
    this.lastError = "";
    let msg  = new FimpMessage(this.app.fimpServiceName,msgType,"string",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.app.fimpServiceName+"/ad:1",msg.toString());
    this.snackRef = this.snackBar.open('Executing config action ....',"");
  }

  login() {
    this.lastOpStatus = "Authorizing....";
    this.lastError = "";
    let val = {
      "username":this.username,
      "password":this.password,
      "encrypted":false
    };
    let msg  = new FimpMessage(this.app.fimpServiceName,"cmd.auth.login","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.app.fimpServiceName+"/ad:1",msg.toString());
    this.snackRef = this.snackBar.open('Authenticating...',"");
    //snackRef.dismiss();
    //this.snackBar.open('Flow is saved',"",{duration:1000});
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

    let msg  = new FimpMessage(this.app.fimpServiceName,"cmd.auth.set_tokens","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:"+this.appResourceType+"/rn:"+this.app.fimpServiceName+"/ad:1",msg.toString());
    this.snackRef = this.snackBar.open('Authenticating...',"");
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}



