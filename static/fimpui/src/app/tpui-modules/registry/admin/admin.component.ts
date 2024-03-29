import { Component, OnInit } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {FimpMessage} from "app/fimp/Message";
import {ThingsRegistryService} from "../registry.service";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

  constructor( private fimp:FimpService,private registry:ThingsRegistryService) { }

  ngOnInit() {
  }


  public vinculumSyncRooms(){
    let msg  = new FimpMessage("tpflow","cmd.registry.sync_rooms","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:registry/ad:1",msg);
    setTimeout( ()=> {
      this.registry.loadAllComponents()
    },1000)
  }

  public requestFullState(){
    let val = {
      "cmd": "get",
      "component": null,
      "id": null,
      "client": null,
      "param": {
        "components": [
          "state"
        ]
      },
      "requestId": "160276012568854"
    }
    let msg  = new FimpMessage("vinculum","cmd.pd7.request","object",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
    msg.src = "tplex-ui";

    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1",msg);
  }

  public vinculumSyncDevices(){
    let msg  = new FimpMessage("tpflow","cmd.registry.sync_devices","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:registry/ad:1",msg);
  }


  public clearRegistry(){
    // let val = {"id":this.thingId,"alias":this.alias,"location_id":this.locationId}
    let msg  = new FimpMessage("tpflow","cmd.registry.factory_reset","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:registry/ad:1",msg);
  }

  public reindexRegistry(){
  }

  public sendExclusionEvent(adapter,address: string) {
    let val = {"address":address};
    let msg  = new FimpMessage(adapter,"evt.thing.exclusion_report","object",val,null,null);
    let topicAdapter = adapter.replace("zwave-ad","zw");
    this.fimp.publish("pt:j1/mt:evt/rt:ad/rn:"+topicAdapter+"/ad:1",msg);
  }
}
