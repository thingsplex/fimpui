import { Component, OnInit } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  mqttHost:string = localStorage.getItem("mqttHost") ;
  mqttPort:number = parseInt(localStorage.getItem("mqttPort"));
  connStatus:string = "disconnected";
  fimpService:FimpService
  constructor(fimpService:FimpService) {
    this.fimpService = fimpService;
    let statusMap = {0:"disconnected",1:"connecting",2:"conneted"};
    this.connStatus = statusMap[this.fimpService.mqtt.state.getValue().toString()];
  }

  save(mqttHost:string , mqttPort:number) {
    this.mqttHost = mqttHost;
    this.mqttPort = mqttPort;
    localStorage.setItem("mqttHost", mqttHost);
    localStorage.setItem("mqttPort", mqttPort.toString());
    location.reload();
    // let MQTT_SERVICE_OPTIONS_1 = {
    //     hostname:mqttHost,
    //     port: mqttPort,
    //     path: '/mqtt'
    //   };

    // this.fimpService.mqtt.onConnect.subscribe((message: any) => {
    //        this.connStatus = "connected";
    //  });
    // this.fimpService.mqtt.disconnect();
    // this.fimpService.mqtt.connect(MQTT_SERVICE_OPTIONS_1);

  }

  ngOnInit() {
  }

}
