import { Component, OnInit } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service';
import {FimpMessage, NewFimpMessageFromString} from "../fimp/Message";
import {Subscription} from "rxjs";
import {WebRtcService} from "../fimp/web-rtc.service";
import {ConfigsService} from "../configs.service";
import {BACKEND_ROOT} from "../globals";
import {HttpClient} from "@angular/common/http";

// declare function  GetWebRtcInstance():any;

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  connStatus:string = "disconnected";
  fimpService:FimpService;
  globalSub : Subscription;
  appCtrlResponse : any;
  wrtcLocalDescription : string;
  onWrtcLocalDescriptionReady:any;
  fimpTransportType:string = "ws"; // Connectivity channel , either mqtt or webrtc
  pc : any;
  constructor(fimpService:FimpService,public configs:ConfigsService, private webrtcService: WebRtcService,private http : HttpClient) {
    // this.pc = GetWebRtcInstance();
    this.fimpService = fimpService;
    this.fimpTransportType = fimpService.transportType;
    if(this.fimpTransportType=="webrtc") {
      this.onWrtcLocalDescriptionReady = (desc) => {
        console.log("onWebRtc local descriptor" + desc);
        this.wrtcLocalDescription = desc;
      }
      this.webrtcService.setLocalDescriptionHandler(this.onWrtcLocalDescriptionReady);
    }
    // let statusMap = {0:"disconnected",1:"connecting",2:"conneted"};
    // this.connStatus = statusMap[this.fimpService.mqtt.state.getValue().toString()];
    this.connStatus = this.fimpService.getConnState();
  }

  saveBrokerConfigs() {
    console.log(this.configs.configs)
    this.http
      .post(BACKEND_ROOT+'/fimp/api/configs',this.configs.configs )
      .subscribe ((result) => {
        console.log("Template is saved");
        location.reload();
      });

  }

  saveFimpTransportType() {
    this.fimpService.transportType = this.fimpTransportType;
    location.reload();
  }

  appCtrl(name:string,operation:string) {
    let props:Map<string,string> = new Map();
    let val:Map<string,string> = new Map();
    val["op"] = operation;
    val["app"] = name;
    val["ver"] = "1.0.0";

    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map",val,props,null)
    this.fimpService.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }

  checkForUpdates() {
    let props:Map<string,string> = new Map();
    let msg  = new FimpMessage("fhbutler","cmd.app.check_updates","null",null,props,null)
    this.fimpService.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }


  ngOnInit() {
    // this.fimpService.subscribeMqtt("pt:j1/mt:evt/rt:ad/rn:fimp2p/ad:1").subscribe((msg)=>{
    //   let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
    //   if (fimpMsg.service == "fimp2p" ) {
    //     if(fimpMsg.mtype == "evt.system.connect_params_report") {
    //       console.log("Webrtc desciptor response")
    //       this.webrtcService.startWrtcSession(fimpMsg.val.address);
    //     }
    //
    //   }
    // })


    this.globalSub = this.fimpService.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg== null) {
        return;
      }
      if (fimpMsg.service == "fhbutler" )
      {
        if(fimpMsg.mtype == "evt.app.ctrl_report") {
          this.appCtrlResponse = fimpMsg.val;
        }
      }
    })
      // console.log(msg.payload.toString());
  }


  generateOffer(){
    this.wrtcLocalDescription = "loading...";
    this.webrtcService.generateOffer();
  }

  startWrtcSessionFromForm() {
    this.webrtcService.startWrtcSessionFromForm();
  }



  startWrtcRemoteSession() {
      let props:Map<string,string> = new Map();
      let val:Map<string,string> = new Map();
      val["security_key"] = this.webrtcService.getLocalDescriptor();
      let msg  = new FimpMessage("fimp2p","cmd.system.connect","str_map",val,props,null)
      this.fimpService.publishMqtt("pt:j1/mt:cmd/rt:ad/rn:fimp2p/ad:1",msg.toString());
  }


}
