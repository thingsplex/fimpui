import { Component, OnInit } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service';
import {FimpMessage, NewFimpMessageFromString} from "../fimp/Message";
import {navigationCancelingError} from "@angular/router/src/shared";
import {Subscription} from "rxjs";
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  mqttHost:string = localStorage.getItem("mqttHost") ;
  mqttPort:number = parseInt(localStorage.getItem("mqttPort"));
  connStatus:string = "disconnected";
  fimpService:FimpService;
  globalSub : Subscription;
  appCtrlResponse : any;
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

  appCtrl(name:string,operation:string) {
    let props:Map<string,string> = new Map();
    let val:Map<string,string> = new Map();
    val["op"] = operation;
    val["app"] = name;
    val["ver"] = "1.0.0";

    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map",val,props,null)
    this.fimpService.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }

  checkForUpdates() {
    let props:Map<string,string> = new Map();
    let msg  = new FimpMessage("fhbutler","cmd.app.check_updates","null",null,props,null)
    this.fimpService.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg.toString());
  }




  ngOnInit() {
    this.globalSub = this.fimpService.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.ctrl_report") {
          this.appCtrlResponse = fimpMsg.val;
        }
      }
    })
      // console.log(msg.payload.toString());
  }

}
