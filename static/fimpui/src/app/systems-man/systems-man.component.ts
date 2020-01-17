import { Component, OnInit } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service';
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-systems-man',
  templateUrl: './systems-man.component.html',
  styleUrls: ['./systems-man.component.css']
})
export class SystemsManComponent implements OnInit {
  systemId : string;
  address : string ;
  securityKey : string;
  globalSub : Subscription;
  configKeys : string[];
  configParams : any;
  connectStatus : string;
  connectError  : string;
  listOfDiscoveredResources : string[];
  listOfDiscoveredResourceObjects : any[];
  selectedResource : string; // Name of the adapter
  constructor(private fimp:FimpService) { }

  ngOnInit() {
    if (localStorage.getItem("selectedResource")!=null){
      this.selectedResource = localStorage.getItem("selectedResource");
    }

    if (localStorage.getItem("listOfDiscoveredResources-")!=null){
      this.listOfDiscoveredResources = JSON.parse(localStorage.getItem("listOfDiscoveredResources"));
    }else {
      this.discover();
    }
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      console.log(msg.payload.toString());
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if(fimpMsg.mtype == "evt.system.connect_params_report" )
        {
          this.configKeys = [];
          console.log("updating variables");
          console.dir(fimpMsg.val)
          this.configParams = fimpMsg.val
          for(let key in fimpMsg.val) {
            console.log("Key:"+key)
            this.configKeys.push(key);

          }
          // this.systemId = fimpMsg.val["id"];
          // this.address = fimpMsg.val["address"];

        }else if (fimpMsg.mtype == "evt.system.connect_report") {
         if (fimpMsg.val) {
           this.connectStatus = fimpMsg.val.status;
           this.connectError  = fimpMsg.val.error;
         }

      }else if (fimpMsg.mtype == "evt.discovery.report") {
          this.listOfDiscoveredResources.push(fimpMsg.val.resource_name)
          this.listOfDiscoveredResourceObjects.push(fimpMsg.val)
          localStorage.setItem("listOfDiscoveredResources", JSON.stringify(this.listOfDiscoveredResources));
      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });

  }
  discover() {
    this.listOfDiscoveredResources = [];
    this.listOfDiscoveredResourceObjects = [];
    this.fimp.discoverResources()
  }
  public connect(service:string) {
     if(service == "") {
      service = this.selectedResource;
     }
    let res = this.getDiscoveredResourceObject(service)
    let rt = "ad";
    let instance_id = "1";
    if (res) {
      rt = res.resource_type;
      instance_id = res.instance_id;
    }
    let msg  = new FimpMessage(service,"cmd.system.connect","str_map",this.configParams,null,null);
    this.fimp.publish("pt:j1/mt:cmd/rt:"+rt+"/rn:"+service+"/ad:"+instance_id,msg.toString());
  }

  public getConnParams(service:string) {
    if(service == "") {
      service = this.selectedResource;
    }
    let res = this.getDiscoveredResourceObject(service)
    let rt = "ad";
    let instance_id = "1";
    if (res) {
      rt = res.resource_type;
      instance_id = res.instance_id;
    }
    let msg  = new FimpMessage(service,"cmd.system.get_connect_params","null",null,null,null);
    this.fimp.publish("pt:j1/mt:cmd/rt:"+rt+"/rn:"+service+"/ad:"+instance_id,msg.toString());
 }

  public disconnect(service:string) {
    if(service == "") {
      service = this.selectedResource;
    }
    let res = this.getDiscoveredResourceObject(service)
    let rt = "ad";
    let instance_id = "1";
    if (res) {
      rt = res.resource_type;
      instance_id = res.instance_id;
    }
    let msg  = new FimpMessage(service,"cmd.system.disconnect","null",null,null,null);
    this.fimp.publish("pt:j1/mt:cmd/rt:"+rt+"/rn:"+service+"/ad:"+instance_id,msg.toString());
 }
 // Force system syncronization .
 public sync(service:string) {
  if(service == "") {
     service = this.selectedResource;
  }
   let res = this.getDiscoveredResourceObject(service)
   let rt = "ad";
   let instance_id = "1";
   if (res) {
     rt = res.resource_type;
     instance_id = res.instance_id;
   }
  let msg  = new FimpMessage(service,"cmd.system.sync","null",null,null,null);
   this.fimp.publish("pt:j1/mt:cmd/rt:"+rt+"/rn:"+service+"/ad:"+instance_id,msg.toString());
  }

  public getDiscoveredResourceObject(name:string):any {
    for (let res of this.listOfDiscoveredResourceObjects) {
      if (res.resource_name == name) {
        return res;
      }
    }
  }
}
