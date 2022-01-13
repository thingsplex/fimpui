import { Component } from '@angular/core';
import {BACKEND_ROOT, MQTT_PORT, setGlobals} from "./globals";
import {HttpClient} from "@angular/common/http";
import {ConfigsService} from 'app/configs.service';

@Component({
  moduleId: module.id,
  selector: 'fimp-ui',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeading = true;
  public version :String;
  public username : string;
  public onlineUsers : number;
  public remoteSiteId : string;
  constructor (private http: HttpClient,public configs : ConfigsService){
    this.loadSystemInfo();
  }
  toggleHeading() {
    this.showHeading = !this.showHeading;
  }

  public logout() {
    window.location.href = "/fimp/logout";
  }

  public users() {
    window.location.href = "/fimp/auth-config";
  }

  goToLink(url: string){
    window.open(url, "_blank");
  }

  public loadSystemInfo() {
    console.log("App component version : "+this.configs.systemInfo.Version)
    this.version = this.configs.systemInfo.Version;
    this.username = this.configs.systemInfo.Username;
    this.onlineUsers = this.configs.systemInfo.OnlineUsers;
    this.remoteSiteId = this.configs.systemInfo.RemoteSiteId;
    // this.http.get(BACKEND_ROOT+"/fimp/system-info")
    //   .subscribe((data: any) => {
    //     // MQTT_PORT = data["WsMqttPort"];
    //     setGlobals(data["WsMqttPort"])
    //     this.version = data["Version"];
    //     this.username = data["Username"];
    //     this.remoteSiteId = data["GlobalPrefix"];
    //     this.onlineUsers = data["OnlineUsers"];
    //   });
  }


}
