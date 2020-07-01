import { Injectable } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {BehaviorSubject, Subject} from "rxjs";
import {Subscription} from "rxjs/Subscription";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {BACKEND_ROOT} from "../../globals";
import {HttpClient} from "@angular/common/http";

@Injectable()
export class AppsRegistryService{

  globalSub : Subscription;
  apps      : AppRecord[] = [];
  timeoutId : number;
  private registryStateSource = new BehaviorSubject<string>("");
  public registryState$ = this.registryStateSource.asObservable();

  constructor(private fimp: FimpService,private http: HttpClient) {
    console.log("apps-registry service constructor")
    this.init()
    if (this.loadFromLocalStorage()) {
      this.notifyRegistryState();
    }else {
      this.requestInstalledApps();
    }

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
            if (fimpMsg.val[key].name != undefined)
              appRecord.name = fimpMsg.val[key].name;
            else
              appRecord.name = "unknown";
            appRecord.status = fimpMsg.val[key].status;
            if (appRecord.status.includes("installed"))
              appRecord.status = "installed";
            appRecord.version = fimpMsg.val[key].ver;
            appRecord.updateVersion = fimpMsg.val[key].update_ver;
            appRecord.isInPlaygrounds = false;
            appRecord.isDiscoverable = false;
            this.apps.push(appRecord)
          }
          // this.notifyRegistryState();
          this.loadAppsFromPlaygrounds();
        }else if (fimpMsg.mtype == "evt.app.ctrl_report") {
          if (fimpMsg.val["op"]=="install" && fimpMsg.val["op_status"]=="ok") {
            this.completeResourceDiscovery();
          }
        }
      }else if (fimpMsg.mtype == "evt.discovery.report") {
        console.log("Discovered resource:"+fimpMsg.val.resource_name);
        let app = this.getAppByNameMatch(fimpMsg.val.resource_name);
        if(app) {
          app.appType = fimpMsg.val.resource_type;
          app.fimpServiceName = fimpMsg.val.resource_name;
          app.isDiscoverable = true;
          if (app.author==""||app.author==null) {
              app.author = fimpMsg.val.author;
          }

          if (app.description==""||app.description==null) {
              app.description = fimpMsg.val.description;
          }
          if (app.longName==""||app.longName==null) {
              app.longName = fimpMsg.val.resource_full_name;
          }

        }else {
          let app = new AppRecord();
          if (fimpMsg.val.package_name)
            app.name = fimpMsg.val.package_name;
          else
            app.name = fimpMsg.val.resource_name;
          app.version = fimpMsg.val.version;
          app.isInPlaygrounds = false;
          app.isDiscoverable = true;
          app.fimpServiceName = fimpMsg.val.resource_name;
          app.appType = fimpMsg.val.resource_type;
          app.longName = fimpMsg.val.resource_full_name;
          app.description = fimpMsg.val.description;
          app.author = fimpMsg.val.author;
          app.configRequired = fimpMsg.val.config_required;
          this.apps.push(app);
        }

      }
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
        this.saveToLocalStorage();
        this.fimp.discoverResources();
        setTimeout(args => this.completeResourceDiscovery(),5000);

      });
  }

  completeResourceDiscovery() {
    console.log("discovery process completed")
    this.saveToLocalStorage();
    this.notifyRegistryState();
  }

  discoverLocalApps() {
    this.fimp.discoverResources();
    setTimeout(args => this.completeResourceDiscovery(),5000);
  }

  saveToLocalStorage() {
    localStorage.setItem("appsRegistry", JSON.stringify(this.apps));
  }
  loadFromLocalStorage():boolean {
    if (localStorage.getItem("appsRegistry")!=null){
      this.apps = JSON.parse(localStorage.getItem("appsRegistry"));
      return true;
    }
    return false;
  }

  requestInstalledApps(){
    let msg  = new FimpMessage("fhbutler","cmd.app.get_version","null",null,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }

  checkForUpdates(){
    let msg  = new FimpMessage("fhbutler","cmd.app.check_updates","null",null,null,null)
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

  getAppByNameMatch(name:string):AppRecord {
    let result = this.apps.filter(app => app.name.includes(name))
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

