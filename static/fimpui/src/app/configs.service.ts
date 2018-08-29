import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { BACKEND_ROOT } from "app/globals";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class ConfigsService {

    private _startupData: any;
    public configs : any;
    constructor(private http: Http) { }

    // This is the method you want to call at bootstrap
    // Important: It should return a Promise
    load(): Promise<any> {

        this._startupData = null;

        // return this.http
        //     .get('REST_API_URL')
        //     .map((res: Response) => res.json())
        //     .toPromise()
        //     .then((data: any) => this._startupData = data)
        //     .catch((err: any) => Promise.resolve());
        
        return this.http
            .get(BACKEND_ROOT+'/fimp/api/configs',{})
            .map((res: Response)=>{
              let result = res.json();
              return result;
            }).toPromise()
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
                .catch((err: any) => Promise.resolve());
            
    }

    get startupData(): any {
        return this._startupData;
    }
}