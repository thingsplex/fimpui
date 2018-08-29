import { Component, OnInit } from '@angular/core';
import { FimpService } from "app/fimp/fimp.service";
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message'; 
import { Subscription } from "rxjs/Subscription";

@Component({
  selector: 'app-zigbee-man',
  templateUrl: './zigbee-man.component.html',
  styleUrls: ['./zigbee-man.component.css']
})
export class ZigbeeManComponent implements OnInit {
  nodes : any[];
  globalSub : Subscription;
  constructor(private fimp:FimpService) {
  }

  reloadZigbeeDevices(){
    let msg  = new FimpMessage("zigbee","cmd.network.get_all_nodes","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg.toString());
  } 

  addDevice(){
    console.log("Add device")
    let msg  = new FimpMessage("zigbee","cmd.thing.inclusion","bool",true,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg.toString());
   
  }
  removeDevice(){
    console.log("Remove device ")
    let msg  = new FimpMessage("zigbee","cmd.thing.exclusion","bool",true,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg.toString());
    
  }
  
  generateExclusionReport(address:string){
    let msg  = new FimpMessage("zigbee","evt.thing.exclusion_report","object",{"address":String(address)},null,null)
    this.fimp.publish("pt:j1/mt:evt/rt:ad/rn:zigbee/ad:1",msg.toString());
    
  }

  ngOnInit() {
    
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      console.log(msg.payload.toString());
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zigbee" )
        {
        if(fimpMsg.mtype == "evt.network.all_nodes_report" )
        { 
          this.nodes = fimpMsg.val;
          localStorage.setItem("zigbeeNodesList", JSON.stringify(this.nodes));
        }else if (fimpMsg.mtype == "evt.thing.exclusion_report" || fimpMsg.mtype == "evt.thing.inclusion_report"){
            console.log("Reloading nodes 2");
            //this.reloadZigbeeDevices();
        }
      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });

    // Let's load nodes list from cache otherwise reload nodes from zwave-ad .
    if (localStorage.getItem("zigbeeNodesList")==null){
      this.reloadZigbeeDevices();
    }else {
      this.nodes = JSON.parse(localStorage.getItem("zigbeeNodesList"));
    }
    
  }
}
