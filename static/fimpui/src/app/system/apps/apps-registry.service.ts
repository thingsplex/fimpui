import { Injectable } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {Subject} from "rxjs";
import {Subscription} from "rxjs/Subscription";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {BACKEND_ROOT} from "../../globals";
import {HttpClient} from "@angular/common/http";

@Injectable()
export class AppsRegistryService{

  globalSub : Subscription;
  apps      : AppRecord[] = [];
  private registryStateSource = new Subject<string>();
  public registryState$ = this.registryStateSource.asObservable();

  constructor(private fimp: FimpService,private http: HttpClient) {
    console.log("apps-registry service constructor")
    this.init()
    this.requestInstalledApps()
  }

  public init() {
    console.log("Dashboard initialized");
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.version_report" )
        {
          this.apps = [];
          for (let key in fimpMsg.val){
            let appRecord = new AppRecord();
            appRecord.name = fimpMsg.val[key].name;
            appRecord.status = fimpMsg.val[key].status;
            appRecord.version = fimpMsg.val[key].ver;
            appRecord.updateVersion = fimpMsg.val[key].update_ver;
            appRecord.isInPlaygrounds = false;
            appRecord.isDiscoverable = false;
            this.apps.push(appRecord)
          }
          this.notifyRegistryState();
          this.loadAppsFromPlaygrounds();

        }
      }else if (fimpMsg.service == "fhbutler") {

      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });
  }

  getListOfApps():AppRecord[] {
    return this.apps;
  }

  isInitialized():boolean {
    if (this.apps != undefined)
      return true;
    else
      return false;
  }

  notifyRegistryState() {
    if (this.isInitialized()) {
      this.registryStateSource.next("allLoaded");
    }
  }

  loadAppsFromPlaygrounds() {
    // https://app-store.s3-eu-west-1.amazonaws.com/registry/list.json
    this.http.get(BACKEND_ROOT+"/fimp/api/get-apps-from-playgrounds")
      .subscribe(result=>{
        result = result["apps"];
        for(let i in result) {

          let app = this.getAppByName(result[i].name);
          if (app != null) {
            console.log("App name = "+result[i].name)
            app.isInPlaygrounds = true
            app.fimpServiceName = result[i].service_name;
            app.appType = result[i].type;
            app.longName = result[i].long_name;
            app.description = result[i].description;
            app.author = result[i].author;
            app.configRequired = result[i].config_required;
          }

        }
        this.notifyRegistryState();

      });
  }

  requestInstalledApps(){
    console.log("Remove device")
    let msg  = new FimpMessage("fhbutler","cmd.app.get_version","null",null,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }

  getAppByName(name:string):AppRecord {
    let result = this.apps.filter(app => app.name == name)
    if (result.length>0) {
      return result[0]
    }else {
      return null
    }
  }

}

export class AppRecord {
  name : string;
  status : string;
  version : string;
  updateVersion : string;
  isDiscoverable : boolean;
  isInPlaygrounds : boolean;
  fimpServiceName : string;
  appType : string;
  longName : string;
  description :string;
  author : string;
  configRequired : boolean;
}

