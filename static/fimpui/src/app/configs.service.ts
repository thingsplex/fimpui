import { Injectable } from '@angular/core';
import {BACKEND_ROOT, setGlobals} from "app/globals";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import {HttpClient} from "@angular/common/http";

export interface SystemInfo {
  Version : string;
  Username : string;
  RemoteSiteId : string;
  OnlineUsers : number;
}

export class SystemInfoImpl implements SystemInfo{
  Version : string;
  Username : string;
  RemoteSiteId : string;
  OnlineUsers : number;
}


@Injectable()
export class ConfigsService {

    private _startupData: any;
    public configs : any;
    public systemInfo : SystemInfo = new SystemInfoImpl();
    constructor(private http: HttpClient) {
      this.loadSystemInfo();
    }

    // This is the method you want to call at bootstrap
    // Important: It should return a Promise
    load(): Promise<any> {
        this._startupData = null;
        return this.http
            .get(BACKEND_ROOT+'/fimp/api/configs',{})
            .toPromise()
              .then((result: any) => {
                    console.log("Config loaded:");
                    console.dir(result);
                    let mqttHost : string = window.location.hostname;
                    this.configs = result;
                    // this.configs  = {
                    //     hostname:mqttHost,
                    //     port: 8081,
                    //     path: '/mqtt',
                    //     username:result["mqtt_server_username"],
                    //     password:result["mqtt_server_password"],

                    // };
                    // this.configs["globalTopicPrefix"] = result["mqtt_topic_global_prefix"]
                })
                .catch((err: any) => {
                  window.location.href = "/fimp/login";
                });

    }

    get startupData(): any {
        return this._startupData;
    }

  public loadSystemInfo() {
    this.http.get(BACKEND_ROOT+"/fimp/system-info")
      .subscribe((data: SystemInfo) => {
        this.systemInfo = data
        console.log("System info:");
        console.dir(this.systemInfo);
      });
  }
}
