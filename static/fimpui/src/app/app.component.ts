import { Component } from '@angular/core';
import {BACKEND_ROOT, MQTT_PORT, setGlobals} from "./globals";
import {HttpClient} from "@angular/common/http";
@Component({
  moduleId: module.id,
  selector: 'fimp-ui',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeading = true;
  public version :String;
  constructor (private http: HttpClient){
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

  public loadSystemInfo() {
    this.http.get(BACKEND_ROOT+"/fimp/system-info")
      .subscribe((data: any) => {
        // MQTT_PORT = data["WsMqttPort"];
        setGlobals(data["WsMqttPort"])
        this.version = data["Version"];
      });
  }


}
