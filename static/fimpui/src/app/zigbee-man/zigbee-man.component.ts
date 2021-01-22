import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {FimpMessage} from '../fimp/Message';
import {Subscription} from "rxjs";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
// import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ThingsRegistryService} from "../tpui-modules/registry/registry.service";

interface Cluster {
  name: string,
  id: number,
}

@Component({
  selector: 'app-zigbee-man',
  templateUrl: './zigbee-man.component.html',
  styleUrls: ['./zigbee-man.component.css']
})

export class ZigbeeManComponent implements OnInit {
  nodes : any[];
  globalSub : Subscription;

  groupBindClusters: Cluster[] = [
    {name: "Scene", id: 5},
    {name: "OnOff", id: 6},
    {name: "LevelControl", id: 8},
    {name: "ColorControl", id: 768},
  ]

  allClusters: Cluster[] = [
    {name: "Identify", id: 3},
    {name: "Groups", id: 4},
    {name: "Scene", id: 5},
    {name: "OnOff", id: 6},
    {name: "LevelControl", id: 8},
    {name: "BinaryInput", id: 0xF},
    {name: "MultistateInput", id: 0x12},
    {name: "OTAUpgrade", id: 0x19},
    {name: "PollControl", id: 0x20},
    {name: "DoorLock", id: 0x101},
    {name: "Thermostat", id: 0x201},
    {name: "ColorControl", id: 0x300},
    {name: "Temperature", id: 0x402},
    {name: "Occupancy", id: 0x406},
    {name: "IASZone", id: 0x500},
    {name: "Metering", id: 0x702},
    {name: "ElecMeasurement", id: 0xB04},
  ]

  constructor(public dialog: MatDialog,private fimp:FimpService,private snackBar: MatSnackBar,public registry:ThingsRegistryService) {
  }

  reloadZigbeeDevices(){
    let msg  = new FimpMessage("zigbee","cmd.network.get_all_nodes","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);
  }

  addDevice(){
    console.log("Add device")

    let dialogRef = this.dialog.open(AddZigbeeDeviceDialog, {
      height: '400px',
      width: '600px',
      data : "inclusion",
    });
    dialogRef.afterClosed().subscribe(result => {
      // this.selectedOption = result;
    });
  }

  removeDevice(address:string){
    console.log("Remove device")
    let val = {"address":address.toString()}
    let msg  = new FimpMessage("zigbee","cmd.thing.delete","str_map",val,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);

  }

  pingDevice(address:string){
    console.log("Ping device")
    let msg  = new FimpMessage("zigbee","cmd.custom.ping_device","int", parseInt(address), null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);

  }

  discoverDevice(address:string){
    console.log("Discover device")
    let msg  = new FimpMessage("zigbee","cmd.custom.discovery","int", parseInt(address), null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);

  }

  readAttribute(form: Object) {
    console.log("Read attribute")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.read_attribute", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  writeAttribute(form: Object) {
    console.log("Write attribute")
    for (const key in form) {
      if (key === 'type') {
        continue
      }
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.write_attribute", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  readRepConfig(form: Object) {
    console.log("Read reporting config")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.read_reporting_config", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  writeRepConfig(form: Object) {
    console.log("Write reporting config")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.write_reporting_config", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  bind(form: Object) {
    console.log("Bind message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.bind", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  unbind(form: Object) {
    console.log("Unbind message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.unbind", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  getBindList(form: Object) {
    console.log("Bind list message")
    let msg = new FimpMessage("zigbee", "cmd.custom.get_bind_list", "int", parseInt(form["udid"]), null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  bindDevices(form: Object) {
    console.log("Bind devices message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.bind_devices", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  unbindDevices(form: Object) {
    console.log("Unbind devices message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.unbind_devices", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  bindGroup(form: Object) {
    console.log("Bind group message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.bind_group", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  unbindGroup(form: Object) {
    console.log("Unbind group message")
    for (const key in form) {
      form[key] = parseInt(form[key])
    }
    let msg = new FimpMessage("zigbee", "cmd.custom.unbind_group", "object", form, null, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
  }

  generateExclusionReport(address:string){
    let msg  = new FimpMessage("zigbee","evt.thing.exclusion_report","object",{"address":String(address)},null,null)
    this.fimp.publish("pt:j1/mt:evt/rt:ad/rn:zigbee/ad:1",msg);
  }

  ngOnInit() {

    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "zigbee" )
        {
        if(fimpMsg.mtype == "evt.network.all_nodes_report" )
        {
          this.nodes = fimpMsg.val;
          for (let n of this.nodes) {
            let things = this.registry.getThingByAddress("zigbee",n.address);
            if (things.length>0) {
              n["location"] = things[0].location_alias;
              n["name"] = things[0].alias;
            }
          }
          localStorage.setItem("zigbeeNodesList", JSON.stringify(this.nodes));
        }else if (fimpMsg.mtype == "evt.thing.exclusion_report" || fimpMsg.mtype == "evt.thing.inclusion_report"){
            console.log("Reloading nodes 2");
            this.reloadZigbeeDevices();
        }

        if (fimpMsg.mtype == "evt.thing.exclusion_report") {
          // Simple message.
          let snackBarRef = this.snackBar.open('Device deleted',"",{
            duration: 5000
          });
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
  changeChannel(channel:number) {
    channel = Number(channel)
    var props = new Map<string,string>();
    let msg  = new FimpMessage("zigbee","cmd.custom.channel","int",channel,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);

    let snackBarRef = this.snackBar.open('Command was sent',"",{
      duration: 2000
    });
  }

  runZigbeeNetCommand(cmd:string) {
    var props = new Map<string,string>();
    let msg  = new FimpMessage("zigbee","cmd.custom."+cmd,"null",null,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);
    this.snackBar.open('Command was sent', "", {duration: 2000});
  }

  runZigbeeNetCommandParam(cmd: string, param: string) {
    var props = new Map<string, string>();
    let msg = new FimpMessage("zigbee", "cmd.custom." + cmd, "int", parseInt(param), props, null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1", msg);
    this.snackBar.open('Command was sent', "", {duration: 2000});
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}


@Component({
  selector: 'add-device-dialog',
  templateUrl: './dialog-add-node.html',
})
export class AddZigbeeDeviceDialog implements OnInit, OnDestroy  {
  messages:string[]=[];
  globalSub : Subscription;
  customTemplateName : string;
  constructor(public dialogRef: MatDialogRef<AddZigbeeDeviceDialog>,private fimp:FimpService,@Inject(MAT_DIALOG_DATA) public data: any) {
  }
  ngOnInit(){
    this.messages = [];
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {

      if (fimpMsg.service == "zigbee" )
      {
        if(fimpMsg.mtype == "evt.thing.inclusion_report" )
        {
          this.messages.push("Node added :"+fimpMsg.val.address);
          this.messages.push("Product name :"+fimpMsg.val.product_name);
        } else if (fimpMsg.mtype == "evt.thing.exclusion_report" ){
          this.messages.push("Node removed :"+fimpMsg.val.address);
        }
        else if (fimpMsg.mtype == "evt.thing.inclusion_status_report" ){
          this.messages.push("New state :"+fimpMsg.val);
        } else if (fimpMsg.mtype == "evt.error.report" ){
          this.messages.push("Error : code:"+fimpMsg.val+" message:"+fimpMsg.props["msg"]);
        }
      }
    });
  }
  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  startInclusion(){
    this.messages = [];
    this.messages.push("Network is open.");
    var props = new Map<string,string>();
    props["template_name"] = this.customTemplateName;
    let msg  = new FimpMessage("zigbee","cmd.thing.inclusion","bool",true,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);
  }
  stopInclusion(){
    let msg  = new FimpMessage("zigbee","cmd.thing.inclusion","bool",false,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zigbee/ad:1",msg);
    this.dialogRef.close();
  }



}
