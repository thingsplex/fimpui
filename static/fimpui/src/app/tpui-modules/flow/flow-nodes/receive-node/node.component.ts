import {Component, Input, OnInit} from "@angular/core";
import {FlowRunDialog, MetaNode, ServiceLookupDialog} from "../../flow-editor/flow-editor.component";
import { MatDialog } from "@angular/material/dialog";
import {ServiceInterface} from "../../../registry/model";
import {FimpService} from "../../../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../../../fimp/Message";
import {Subscription} from "rxjs";
import {FimpApiMetadataService} from "../../../../fimp/fimp-api-metadata.service";
import {FormControl} from '@angular/forms';

@Component({
  selector: 'receive-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class ReceiveNodeComponent implements OnInit {
  myControl = new FormControl();
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  flowPublishService: string;
  flowPublishInterface : string;
  flowPublishAddress : string;
  listOfAutoCompleteInterfaces : any;
  constructor(public dialog: MatDialog,private fimpMeta:FimpApiMetadataService) {
    this.listOfAutoCompleteInterfaces = fimpMeta.getListOfInterfaces();
    console.log("Autocomplete interfaces:")
    console.dir(this.listOfAutoCompleteInterfaces);
  }

  ngOnInit() {

    // backword compatability
    this.loadDefaultConfig();
    if (this.node.Config.Timeout == null) {
      this.node.Config["Timeout"] = 0;
      this.node.Config["ValueFilter"] = {"Value":"","ValueType":""};
    }
  }

  onServiceConfigured(service:ServiceInterface) {
    console.log("---Service configured event--- "+service.intfAddress)
    this.node.Address = service.intfAddress;
    this.node.Service = service.serviceName;
    this.node.ServiceInterface = service.intfMsgType;
    this.node.Config.ValueFilter.ValueType =  service.intfValueType;
  }

  loadDefaultConfig() {

    if (this.node.Config==null) {
      console.log("Initializing config 2");
      this.node.Config = {};
      this.node.Config["Timeout"] = 120;
      this.node.Config["VirtualServiceGroup"] = "ch_0";
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

    this.flowPublishAddress = "pt:j1/mt:"+msgType+"/rt:dev/rn:flow/ad:1/sv:"+this.flowPublishService+"/ad:"+this.flowId+"_0";
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
