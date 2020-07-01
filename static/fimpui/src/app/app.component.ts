import { Component } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { FimpService} from 'app/fimp/fimp.service';
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

  // loadConfigsAndSetupMqttConnection() {
  //    let MQTT_SERVICE_OPTIONS_1 = {
  //        hostname:mqttHost,
  //        port: mqttPort,
  //        path: '/mqtt'

  //     };
  //    this.fimpService.mqtt.connect(MQTT_SERVICE_OPTIONS_1);


  // }

  public loadSystemInfo() {
    this.http.get(BACKEND_ROOT+"/fimp/system-info")
      .subscribe((data: any) => {
        // MQTT_PORT = data["WsMqttPort"];
        setGlobals(data["WsMqttPort"])
        this.version = data["Version"];
      });
  }


}
