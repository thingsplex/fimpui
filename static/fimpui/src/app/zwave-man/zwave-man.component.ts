import { Component, OnInit , OnDestroy ,Input ,ChangeDetectorRef,Inject} from '@angular/core';
import { MatDialog, MatDialogRef,MAT_DIALOG_DATA} from '@angular/material';
import { FimpService} from 'app/fimp/fimp.service';
import { Observable }    from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import {Router} from '@angular/router';
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message';
import { Http, Response,URLSearchParams,RequestOptions,Headers }  from '@angular/http';
import { BACKEND_ROOT } from "app/globals";
import {MatSnackBar} from '@angular/material';
import {
  MqttMessage,
  MqttModule,
  MqttService
}  from 'angular2-mqtt';

declare var vis: any;

@Component({
  selector: 'app-zwave-man',
  templateUrl: './zwave-man.component.html',
  styleUrls: ['./zwave-man.component.css']
})
export class ZwaveManComponent implements OnInit ,OnDestroy {
  selectedOption: string;
  nodes : any[];
  networkStats : any[];
  repeaterNodes :number[];
  zwAdState : string;
  visJsNetwork : any;
  globalNonSecureInclMode : string;
  inclProcState : string;
  errorMsg : string;
  selectedCommand : string ;
  globalSub : Subscription;
  progressBarMode : string ;
  localTemplates : string[];
  localTemplatesCache : string[];
  pingResult :string;
  isReloadNodesEnabled:boolean;
  rssiReport : any;
  constructor(public dialog: MatDialog,private fimp:FimpService,private router: Router,private http : Http) {
  }

  ngOnInit() {
    this.zwAdState = "UNKNOWN";
    this.isReloadNodesEnabled = true;
    this.showProgress(false);
    this.getAdapterStates();
    this.loadLocalTemplates();
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      console.log(msg.payload.toString());
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zwave-ad" )
        {
        if(fimpMsg.mtype == "evt.network.all_nodes_report" )
        {
          this.nodes = fimpMsg.val;
          this.loadThingsFromRegistry()

          // for(var key in fimpMsg.val){
          //   this.nodes.push({"id":key,"status":fimpMsg.val[key]});
          // }
          this.showProgress(false);
          localStorage.setItem("zwaveNodesList", JSON.stringify(this.nodes));
        }else if (fimpMsg.mtype == "evt.zwnetstats.net_ping_report"){

          for(let node of this.nodes) {
            node["status"] = ""
          }
          for(let stNode of fimpMsg.val) {
            var isFound = false;
            for(let node of this.nodes) {
              if (stNode["address"] == node["address"]) {
                node["status"] = stNode["status"];
                isFound = true;
              }
            }
            if (!isFound) {
              this.nodes.push(stNode)
            }
            this.drawNetworkTopology();

          }

        }else if (fimpMsg.mtype == "evt.zwnetstats.rssi_report"){
          this.rssiReport = {"ch1":fimpMsg.val["0"],"ch2":fimpMsg.val["1"]} ;
        }else if (fimpMsg.mtype == "evt.zwnetstats.full_report"){
          this.networkStats = fimpMsg.val;
          localStorage.setItem("zwNetworkStats", JSON.stringify(this.networkStats));
          this.drawNetworkTopology();

        }else if (fimpMsg.mtype == "evt.thing.exclusion_report" || fimpMsg.mtype == "evt.thing.inclusion_report"){
            console.log("New inclusion report");
            if(this.isReloadNodesEnabled) {
              console.log("Reloading nodes ");
              this.reloadNodes();
            }

        }else if (fimpMsg.mtype == "evt.state.report"){
            this.zwAdState = fimpMsg.val;
            if (fimpMsg.val == "NET_UPDATED" || fimpMsg.val == "RUNNING") {
              this.showProgress(false);
            }else if (fimpMsg.val == "STARTING" || fimpMsg.val == "TERMINATED") {
              this.showProgress(true);
            }
        }else if (fimpMsg.mtype == "evt.error.report") {
          this.errorMsg = fimpMsg.props["msg"];
        }else if(fimpMsg.mtype == "evt.ping.report"){

          var node = this.getNodeByAddress(fimpMsg.val["address"])
          if (fimpMsg.val.status=="SUCCESS")
            node.status = "OK";
          else
            node.status = "NO_RESP";

        }else if (fimpMsg.mtype == "evt.network.update_report") {
            this.zwAdState = fimpMsg.val;
        }else if (fimpMsg.mtype == "evt.adapter.states_report") {
          this.zwAdState = fimpMsg.val["adapter_state"];
          this.inclProcState = fimpMsg.val["base_net_proc_state"];
          this.globalNonSecureInclMode = fimpMsg.val["enabled_global_non_secure"];
        }
      }else if (fimpMsg.service == "dev_sys") {
        if (fimpMsg.mtype == "evt.ping.report") {
            this.pingResult = fimpMsg.val.status;
        }
      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });

    // Let's load nodes list from cache otherwise reload nodes from zwave-ad .
    if (localStorage.getItem("zwaveNodesList")==null){
        this.reloadNodes();
    }else {
        this.nodes = JSON.parse(localStorage.getItem("zwaveNodesList"));
        this.loadThingsFromRegistry();
    }
    if (localStorage.getItem("zwNetworkStats")!=null){
      this.networkStats = JSON.parse(localStorage.getItem("zwNetworkStats"));
      this.drawNetworkTopology()
    }

  }
  ngOnDestroy() {
    this.globalSub.unsubscribe();
  }
  showProgress(start:boolean){
    if (start){
      this.progressBarMode = "indeterminate";
    }else {
      this.progressBarMode = "determinate";
    }
  }


  isNodeRepeater(nodeId) {
      for(let rep of this.repeaterNodes) {
        if (rep == nodeId) {
          return true
        }
      }
      return false
  }

  getNodeByAddress(address:string){
    for(let node of this.nodes) {
      if(node.address == address) {
        return node;
      }
    }
  }



  drawNetworkTopology() {
        this.repeaterNodes = []
        var nodes = [];
        var edges = []
        for(let node of this.networkStats) {
          var tnd = this.getNodeByAddress(String(node.node_id)) ;
          if (tnd) {
            node["alias"] = tnd.alias;
            node["power_source"] = tnd.power_source;
            node["status"] = tnd.status;
            console.log("Alias is set "+tnd.alias);
          }
          for(let nbNode of node["nb_info"]) {
              var skip = false
              for(let n of edges){
                if(n.to==node["node_id"] && n.from == nbNode["node_id"] ){
                  skip = true
                  break
                }
              }
              if(skip){
                continue
              }
              edges.push({from:node["node_id"],to:nbNode["node_id"],arrows:''})
              if(nbNode["is_rep"]) {
                this.repeaterNodes.push(nbNode["node_id"])
              }
          }
        }

        for(let node of this.networkStats) {
            var rgroup = "sleep"
            if(node["node_id"]==1) {
              rgroup = "gw"
            }else
            if(this.isNodeRepeater(node["node_id"])) {
              rgroup ="rep"
              // console.log("Node is repater ="+node["node_id"]);
            }
            nodes.push({id:node["node_id"],label:"Node "+node["node_id"],group:rgroup,title:node["alias"]})
        }
        var nodesDS = new vis.DataSet(nodes);

        var edgesDS = new vis.DataSet(edges);


        // create a network
        var container = document.getElementById('zwnetwork');

        // provide the data in the vis format
        var data = {
          nodes: nodesDS,
          edges: edgesDS
        };

        // gravitationalConstant: -26,
    //               centralGravity: 0.005,
    //               springLength: 230,
    //               springConstant: 0.18,
    //               avoidOverlap:0.5
        // var options = {};
        var options = {
          nodes: {
            shape: 'dot',
            size: 16,

          },
          edges : {
            chosen:{edge:function(values, id, selected, hovering) {
                values.color = "orange";
                values.width = 3;
              }}
          },
          layout: {
            randomSeed:1
          },
          physics: {
            enabled:true,
            forceAtlas2Based: {
              avoidOverlap:0.65,
              gravitationalConstant: -45,
                            // centralGravity: 0.005,
              //               springLength: 230,
                            springConstant: 0.18
            },
            maxVelocity: 500,
            minVelocity:200,
            solver: 'forceAtlas2Based',
            timestep: 0.35,
            stabilization: {iterations: 100}
          },
          groups: {
            "gw": {color:{background:'red'}, borderWidth:3,size:30},
            "rep": {color:{background:'green'}, borderWidth:2,size:18},
            "sleep": {color:{background:'gray'}, borderWidth:1}
          }
        };
        // initialize your network!
        this.visJsNetwork = new vis.Network(container, data, options);
  }

  stopSimulation(){
    this.visJsNetwork.stopSimulation()
  }

  loadThingsFromRegistry() {
     this.http
      .get(BACKEND_ROOT+'/fimp/api/registry/things')
      .map(function(res: Response){
        let body = res.json();
        //console.log(body.Version);
        return body;
      }).subscribe ((result) => {
        //  console.log(result.report_log_files);
         for(let node of this.nodes) {
           for (let thing of result) {
              // change node.id to node.address
               if (node.address == thing.address && thing.comm_tech == "zw") {
                  node["alias"] = thing.location_alias +" "+ thing.alias
                  node["product_name"] = thing.product_name
               }
           }
         }
         localStorage.setItem("zwaveNodesList", JSON.stringify(this.nodes));
      });
  }
  requestAllInclusionReports(){
    this.isReloadNodesEnabled = false;
    for(let node of this.nodes) {
      let msg  = new FimpMessage("zwave-ad","cmd.thing.get_inclusion_report_q","string",node.address ,null,null)
      this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    }
  }
  pingNode(fromNode:string,toNode:string,level:string){
    this.pingResult = "working...";
    let props:Map<string,string> = new Map();
    props["tx_level"] = level;
    let msg  = new FimpMessage("dev_sys","cmd.ping.send","string",toNode,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:dev/rn:zw/ad:1/sv:dev_sys/ad:"+fromNode+"_0",msg.toString());
  }

  requestRSSI(){
    this.rssiReport = {"ch1":"?","ch2":"?"};
    let msg  = new FimpMessage("zwave-ad","cmd.zwnetstats.get_rssi","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  pingNodeFromGw(toNode:string){
    this.pingResult = "working...";
    let props:Map<string,string> = new Map();
    props["tx_level"] = "0";
    let msg  = new FimpMessage("zwave-ad","cmd.ping.send","string",toNode,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  reloadNodes(){
    this.isReloadNodesEnabled = true;
    this.getAdapterStates();
    let msg  = new FimpMessage("zwave-ad","cmd.network.get_all_nodes","null",null,null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  resetNetwork(){
    let msg  = new FimpMessage("zwave-ad","cmd.network.reset","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  getAdapterStates(){
    let msg  = new FimpMessage("zwave-ad","cmd.adapter.get_states","null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  restartAdapter(){
    let msg  = new FimpMessage("zwave-ad","cmd.proc.restart","string","zwave-ad",null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    this.router.navigateByUrl("/timeline");
  }
  updateNetwork(){
    let msg  = new FimpMessage("zwave-ad","cmd.network.update","string","topology",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }



  cleanUpNetwork(){
    let msg  = new FimpMessage("zwave-ad","cmd.network.cleanup","string","full",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  pingNetwork(){
    let msg  = new FimpMessage("zwave-ad","cmd.zwnetstats.net_ping","string","",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  requestImaStats(){
    this.networkStats = []
    let msg  = new FimpMessage("zwave-ad","cmd.zwnetstats.get_full_report","string","",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  resetImaStats(){
    let msg  = new FimpMessage("zwave-ad","cmd.zwnetstats.reset","string","",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  runCommand(node:any) {
     switch (this.selectedCommand) {
       case "update":
         this.updateDevice(node.address);
         break;
       case "template":
         this.openTemplateEditor(node.hash+'.json','stable');
         break;
       case "delete":
         this.deleteFailedDevice(node.address);
         break;
       case "replace":
         this.replaceDevice(node.address);
         break;
       case "ping":
         this.pingNodeFromGw(String(node.address));
         break;
     }
  }

  updateDevice(nodeId :number){
    let msg  = new FimpMessage("zwave-ad","cmd.network.node_update","int",Number(nodeId),null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  setGatewayMode(mode:string){
    let msg  = new FimpMessage("zwave-ad","cmd.mode.set","string",mode,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  deleteFailedDevice(nodeId :number){
     let val = {"address":String(nodeId),"stop":""}
    let msg  = new FimpMessage("zwave-ad","cmd.thing.delete","str_map",val,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    let dialogRef = this.dialog.open(RemoveDeviceDialog, {
      height: '400px',
      width: '600px',
      data : "exclusion",
    });
  }
  replaceDevice(nodeId :number){
    let val = {"address":String(nodeId),"stop":""}
    let msg  = new FimpMessage("zwave-ad","cmd.thing.replace","str_map",val,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    let dialogRef = this.dialog.open(RemoveDeviceDialog, {
      height: '400px',
      width: '600px',
      data : "inclusion",
    });
  }
  addDevice(){
    console.log("Add device")

    let dialogRef = this.dialog.open(AddDeviceDialog, {
      height: '400px',
      width: '600px',
      data : "inclusion",
    });
    dialogRef.afterClosed().subscribe(result => {
      this.selectedOption = result;
    });
  }
  removeDevice(){
    console.log("Remove device ")
    let msg  = new FimpMessage("zwave-ad","cmd.thing.exclusion","bool",true,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    let dialogRef = this.dialog.open(RemoveDeviceDialog, {
      height: '400px',
      width: '600px',
      data:"exclusion",
    });
    dialogRef.afterClosed().subscribe(result => {
      this.selectedOption = result;
    });
  }

  loadLocalTemplates () {
    ///fimp/api/products/list-local-templates?type=cache
    this.http.get(BACKEND_ROOT+'/fimp/api/zwave/products/list-local-templates')
    .map(function(res: Response){
      let body = res.json();
      return body;
    }).subscribe ((result) => {
         this.localTemplates = result
    });
    this.http.get(BACKEND_ROOT+'/fimp/api/zwave/products/list-local-templates?type=cache')
    .map(function(res: Response){
      let body = res.json();
      return body;
    }).subscribe ((result) => {
         this.localTemplatesCache = result
    });
  }
  downloadTemplatesFromCloud(){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
    .post(BACKEND_ROOT+'/fimp/api/zwave/products/download-from-cloud',  options )
    .subscribe ((result) => {
       console.log("Flow was saved");
    });
  }
  uploadCacheToCloud() {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
    .post(BACKEND_ROOT+'/fimp/api/zwave/products/upload-to-cloud',  options )
    .subscribe ((result) => {
       console.log("Flow was saved");
    });
  }

  openTemplateEditor(templateName:string,templateType :string ) {
    templateName = templateName.replace("zw_","");
    let dialogRef = this.dialog.open(TemplateEditorDialog,{
            // height: '95%',
            width: '95%',
            data:{"name":templateName,"type":templateType}
          });
    dialogRef.afterClosed().subscribe(result => {
              this.loadLocalTemplates();
          });
  }

}
//////////////////////////////////////////////////////////////////////
@Component({
  selector: 'add-device-dialog',
  templateUrl: './dialog-add-node.html',
})
export class AddDeviceDialog implements OnInit, OnDestroy  {
  messages:string[]=[];
  globalSub : Subscription;
  customTemplateName : string;
  forceInterview : boolean;
  forceNonSecure : boolean;
  s2pin : string;

  constructor(public dialogRef: MatDialogRef<AddDeviceDialog>,private fimp:FimpService,@Inject(MAT_DIALOG_DATA) public data: any) {

    console.log("Dialog constructor Opened");
  }
  ngOnInit(){
    this.messages = [];
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {

      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zwave-ad" )
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
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });
  }
  ngOnDestroy() {
    this.globalSub.unsubscribe();
  }

  startInclusion(){
    var props = new Map<string,string>();
    props["template_name"] = this.customTemplateName;
    props["force_non_secure"] = "false";
    props["pin"] = this.s2pin;

    if(this.forceInterview) {
      props["template_name"] = "__interview__";
    }
    if(this.forceNonSecure){
      props["force_non_secure"] = "true";
    }
    let msg  = new FimpMessage("zwave-ad","cmd.thing.inclusion","bool",true,props,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }
  stopInclusion(){
    let msg  = new FimpMessage("zwave-ad","cmd.thing."+this.data,"bool",false,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    this.dialogRef.close();
  }

}

//////////////////////////////////////////////////////////////////////////////////////

@Component({
  selector: 'remove-device-dialog',
  templateUrl: './dialog-remove-node.html',
})
export class RemoveDeviceDialog implements OnInit, OnDestroy  {
  public messages:string[]=[];
  globalSub : Subscription;
  customTemplateName : string;
  forceInterview : boolean;
  forceNonSecure : boolean;

  constructor(public dialogRef: MatDialogRef<RemoveDeviceDialog>,private fimp:FimpService,@Inject(MAT_DIALOG_DATA) public data: any) {

    console.log("Dialog constructor Opened");
  }
  ngOnInit(){
    this.messages = [];
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {

      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zwave-ad" )
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
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });
  }
  ngOnDestroy() {
    this.globalSub.unsubscribe();
  }

  stopExclusion(){
    let msg  = new FimpMessage("zwave-ad","cmd.thing."+this.data,"bool",false,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
    this.dialogRef.close();
  }

}

//////////////////////////////////////////////////////////////////////////////////////



@Component({
  selector: 'template-editor-dialog',
  templateUrl: './template-editor-dialog.html',
})
export class TemplateEditorDialog implements OnInit, OnDestroy  {
  template : any;
  templateStr : string;
  templateName :string;
  templateType :string;
  constructor(public dialogRef: MatDialogRef<TemplateEditorDialog>,@Inject(MAT_DIALOG_DATA) public data: any,private http : Http) {
    this.templateName = data["name"];
    this.templateType = data["type"]
    this.template = {};
    this.template["auto_configs"] = {"assoc":[],"configs":[]};
    this.template["dev_custom"] = {"service_grouping":[],"service_descriptor":[],"basic_mapping":[],"binary_switch_mapping":[]}
    this.template["docs_ref"] = ""
    console.log("Dialog constructor Opened");
  }

  ngOnInit(){
    this.loadTemplate();
  }

  loadTemplate(){
    this.http.get(BACKEND_ROOT+'/fimp/api/zwave/products/template?name='+this.templateName+'&type='+this.templateType)
    .map(function(res: Response){
      let body = res.json();
      return body;
    }).subscribe ((result) => {
         this.template = result;
         if(this.template.auto_configs == undefined) {
           this.template["auto_configs"] = {"assoc":[],"configs":[]}
         }
         if(this.template.dev_custom == undefined) {
           this.template["dev_custom"] = {"service_grouping":[],"service_fields":[],"service_descriptor":[],"basic_mapping":[]}
         }
         if(this.template.dev_custom.service_fields == undefined) {
          this.template["dev_custom"]["service_fields"] = [];
         }
         if(this.template.comment == undefined){
           this.template["comment"]=""
         }
         if(this.template.wakeup_interval == undefined){
           this.template.wakeup_interval = this.template.wkup_intv;
         }
         if( this.template["docs_ref"] == undefined){
          this.template["docs_ref"] = "";
         }
         // Converting json object into string, needed for editor
         // this.template.dev_custom.service_descriptor.forEach(element => {
         //   element.descriptor = JSON.stringify(element.descriptor, null, 2);
         // });
        //  this.templateStr = JSON.stringify(result, null, 2);
    });
  }
  addNewAssoc() {
      this.template.auto_configs.assoc.push({"group":1,"node":1,"comment":""})
  }
  deleteAssoc(assoc:any) {
    var i = this.template.auto_configs.assoc.indexOf(assoc);
    if(i != -1) {
      this.template.auto_configs.assoc.splice(i, 1);
    }
  }
  addNewConfig() {
    this.template.auto_configs.configs.push({"key":1,"value":1,"size":1,"comment":""})
  }
  deleteConfig(configObj:any) {
    var i = this.template.auto_configs.configs.indexOf(configObj);
    if(i != -1) {
      this.template.auto_configs.configs.splice(i, 1);
    }
  }
  addNewServiceGrouping() {
    this.template.dev_custom.service_grouping.push({"endp":1,"service":"sensor_temp","group":"ch_0","comment":""})
  }

  addNewServiceFieldCustomization() {
    this.template.dev_custom.service_fields.push({"endp":1,"service":"","enabled":true,"comment":""})
  }

  deleteServiceGrouping(serviceGrp:any) {
    var i = this.template.dev_custom.service_grouping.indexOf(serviceGrp);
    if(i != -1) {
      this.template.dev_custom.service_grouping.splice(i, 1);
    }
  }
  deleteServiceFieldCustomization(serviceGrp:any) {
    var i = this.template.dev_custom.service_fields.indexOf(serviceGrp);
    if(i != -1) {
      this.template.dev_custom.service_fields.splice(i, 1);
    }
  }


  addNewServiceDescriptor() {
    var sampleDescriptor = {
      "enabled": true,
      "groups": [
        "ch_0"
      ],
      "interfaces": [
        {
          "intf_t": "out",
          "msg_t": "evt.mode.report",
          "val_t": "bool",
          "ver": "1"
        },
        {
          "intf_t": "in",
          "msg_t": "cmd.mode.set",
          "val_t": "string",
          "ver": "1"
        },
        {
          "intf_t": "in",
          "msg_t": "cmd.mode.get_report",
          "val_t": "null",
          "ver": "1"
        }
      ],
      "location": "",
      "name": "siren_ctrl",
      "props": {
        "is_secure": true,
        "is_unsecure": false,
        "sup_modes":["on","off","fire"]
      }
    }
    // var strDescriptor = JSON.stringify(sampleDescriptor,null, 2);
    this.template.dev_custom.service_descriptor.push({"endp":0,"operation":"add","descriptor":sampleDescriptor,"comment":""});
  }
  deleteServiceDescriptor(serviceDescriptor:any) {
    var i = this.template.dev_custom.service_descriptor.indexOf(serviceDescriptor);
    if(i != -1) {
      this.template.dev_custom.service_descriptor.splice(i, 1);
    }
  }
  addNewBasicMapping() {
    this.template.dev_custom.basic_mapping.push({"endp":0,"basic_value":0,"service":"","msg_type":"","fimp_value":{"val":"","val_t":"string"},
    "map_range":false,"is_get_report_cmd":false,"min":0,"max":100,"comment":"" });
  }
  deleteBasicMapping(basicMapping:any) {
    var i = this.template.dev_custom.basic_mapping.indexOf(basicMapping);
    if(i != -1) {
      this.template.dev_custom.basic_mapping.splice(i, 1);
    }
  }

  addNewBinarySwitchMapping() {
    if (this.template.dev_custom.bin_switch_mapping == undefined) {
      this.template.dev_custom.bin_switch_mapping = [];
    }
    this.template.dev_custom.bin_switch_mapping.push(
      {"endp":0,"service":"","msg_type":"",
        "cc_value":true,
        "fimp_value":{"val":"","val_t":"string"},
        "is_get_report_cmd":false,"comment":"" });


  }

  addNewSceneActivationMapping() {
    if (this.template.dev_custom.scene_activation_mapping == undefined) {
      this.template.dev_custom.scene_activation_mapping = [];
    }
    this.template.dev_custom.scene_activation_mapping.push(
      {"endp":0,"service":"","msg_type":"",
        "cc_value":"","location":"",
        "fimp_value":{"val":"","val_t":"string"},
        "is_get_report_cmd":false,"comment":"" });

  }


  deleteBinarySwitchMapping(binSwMapping:any) {
    var i = this.template.dev_custom.bin_switch_mapping.indexOf(binSwMapping);
    if(i != -1) {
      this.template.dev_custom.bin_switch_mapping.splice(i, 1);
    }
  }

  deleteSceneActivationMapping(binSwMapping:any) {
    var i = this.template.dev_custom.scene_activation_mapping.indexOf(binSwMapping);
    if(i != -1) {
      this.template.dev_custom.scene_activation_mapping.splice(i, 1);
    }
  }

  templateOperation(opName:string) {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
      .post(BACKEND_ROOT+'/fimp/api/zwave/products/template-op/'+opName+'/'+this.templateName,null,  options )
      .subscribe ((result) => {
         console.log("Operation executed");
         this.dialogRef.close();

      });
  }

  deleteTemplate() {
    this.http
    .delete(BACKEND_ROOT+'/fimp/api/zwave/products/template/'+this.templateType+'/'+this.templateName)
    .subscribe ((result) => {
      console.log("Template deleted");
      this.dialogRef.close();
    });
  }

  prepareTemplate(){
    // Converting descriptor back from string to object
    // this.template.dev_custom.service_descriptor.forEach(element => {
    //   element.descriptor = JSON.parse(element.descriptor);
    // });
  }

  showSource() {
     this.prepareTemplate();
     this.templateStr = JSON.stringify(this.template, null, 2);
     // this.template.dev_custom.service_descriptor.forEach(element => {
     //    element.descriptor = JSON.stringify(element.descriptor,null,2);
     // });
  }
  saveSource() {
    this.template = JSON.parse(this.templateStr);
   //  this.template.dev_custom.service_descriptor.forEach(element => {
   //    element.descriptor = JSON.stringify(element.descriptor,null,2);
   // });
  }


  saveTemplate(){
    this.prepareTemplate();
    console.dir(this.template)
     let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});


    this.http
      .post(BACKEND_ROOT+'/fimp/api/zwave/products/template/'+this.templateType+'/'+this.templateName,JSON.stringify(this.template),  options )
      .subscribe ((result) => {
         console.log("Template is saved");

      });
  }

  ngOnDestroy() {

  }


}

