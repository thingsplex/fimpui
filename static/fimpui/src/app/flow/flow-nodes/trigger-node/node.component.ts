import {Component, Input, OnInit} from "@angular/core";
import {FlowRunDialog, MetaNode, ServiceLookupDialog} from "../../flow-editor/flow-editor.component";
import {MatDialog} from "@angular/material";


@Component({
  selector: 'trigger-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class TriggerNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  flowPublishService: string;
  flowPublishInterface : string;
  flowPublishAddress : string;
  constructor(public dialog: MatDialog) {

  }

  ngOnInit() {

    // backword compatability
    this.loadDefaultConfig();
    if (this.node.Config.Timeout == null) {
      this.node.Config["Timeout"] = 0;
      this.node.Config["ValueFilter"] = {"Value":"","ValueType":""};
    }
  }

  loadDefaultConfig() {

    console.log("Initializing config 1");
    console.dir(this.node.Config);
    if (this.node.Config==null) {
      console.log("Initializing config 2");
      this.node.Config = {};
      this.node.Config["Timeout"] = 0;
      this.node.Config["VirtualServiceGroup"] = "";
      this.node.Config["VirtualServiceProps"] = {};
      this.node.Config["RegisterAsVirtualService"] = false;
      this.node.Config["LookupServiceNameAndLocation"] = false;

      this.node.Config["ValueFilter"] = {"Value":"","ValueType":"bool"};
      this.node.Config["IsValueFilterEnabled"] = false;
    }
    if (this.flowPublishService == null) {
      this.flowPublishService = "out_bin_switch";
      this.flowPublishInterface = "cmd.binary.set";
      this.onPublishServiceChange();
    }
  }

  runFlow(node:MetaNode) {
    let dialogRef = this.dialog.open(FlowRunDialog,{
      // height: '95%',
      width: '500px',
      data:node
    });
    dialogRef.afterClosed().subscribe(result => {
      // this.flow = result;
      // this.loadContext();
    });
  }

  onPublishServiceChange(){
    console.log(this.flowPublishService);
    var msgType = "cmd";
    try{
      if (this.flowPublishInterface.indexOf("evt.")>=0){
        msgType = "evt";
      }
    }catch(err){

    }

    this.flowPublishAddress = "pt:j1/mt:"+msgType+"/rt:dev/rn:flow/ad:1/sv:"+this.flowPublishService+"/ad:"+this.flowId;
  }
  publishFlowAsVirtualDevice(){
    this.node.ServiceInterface = this.flowPublishInterface;
    this.node.Service = this.flowPublishService;
    this.node.Address = this.flowPublishAddress;
  }
  serviceLookupDialog(nodeId:string) {
    let dialogRef = this.dialog.open(ServiceLookupDialog,{
      width: '500px',
      data:"out"
    });
    dialogRef.afterClosed().subscribe(result => {
      console.dir(result)
      if (result)
        this.nodes.forEach(element => {
          if (element.Id==nodeId) {
            element.Service = result.serviceName
            if(element.Label==""||element.Label==undefined){
              element.Label =  result.serviceAlias + " at "+result.locationAlias
            }
            element.ServiceInterface = result.intfMsgType
            element.Address = result.intfAddress
            element.Config.ValueFilter.ValueType =  result.intfValueType
          }
        });
    });
  }
}


@Component({
  selector: 'vinc-trigger-node',
  templateUrl: './vinc-trigger-node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class VincTriggerNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  constructor(public dialog: MatDialog) {

  }
  ngOnInit() {
    this.loadDefaultConfig()
  }

  loadDefaultConfig() {

    if (this.node.Config==null) {
      this.node.Config = {};
      this.node.Config["Timeout"] = 0;
      this.node.Config["VirtualServiceGroup"] = "";
      this.node.Config["VirtualServiceProps"] = {};
      this.node.Config["RegisterAsVirtualService"] = false;
      this.node.Config["ValueFilter"] = {"Value":"","ValueType":"string"};
      this.node.Config["IsValueFilterEnabled"] = false;
      this.node.Address = "pt:j1/mt:evt/rt:app/rn:vinculum/ad:1"
      this.node.ServiceInterface = "evt.mode.report"
      this.node.Service = "home_mode"
      this.node.Label = "Home mode trigger"
    }
  }

  runFlow(node:MetaNode) {
    let dialogRef = this.dialog.open(FlowRunDialog,{
      // height: '95%',
      width: '500px',
      data:node
    });
    dialogRef.afterClosed().subscribe(result => {
      // this.flow = result;
      // this.loadContext();
    });
  }

}
