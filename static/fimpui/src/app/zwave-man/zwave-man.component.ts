import { Component, OnInit , OnDestroy ,Input ,ChangeDetectorRef,Inject} from '@angular/core';
import { MatDialog, MatDialogRef,MAT_DIALOG_DATA} from '@angular/material';
import { FimpService} from 'app/fimp/fimp.service';
// import { Observable }    from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import {Router} from '@angular/router';
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message';
import { BACKEND_ROOT } from "app/globals";
// import {MatSnackBar} from '@angular/material';
// import {
//   MqttMessage,
//   MqttModule,
//   MqttService
// }  from 'angular2-mqtt';
import {TemplateEditorDialog} from "./template-editor.component";
import {ThingsRegistryService} from "../tpui-modules/registry/registry.service";
import {HttpClient, HttpHeaders} from "@angular/common/http";

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
  totalDevices : number;
  totalSleeping: number;
  totalBattery: number;
  totalFlir : number;
  totalUp :number;
  totalDown : number;
  homeId : string;
  graphType = 'lwr';

  constructor(public dialog: MatDialog,private fimp:FimpService,private router: Router,private http : HttpClient,private registry:ThingsRegistryService) {
  }

  ngOnInit() {
    this.zwAdState = "UNKNOWN";

    this.isReloadNodesEnabled = true;
    this.showProgress(false);
    this.getAdapterStates();
    this.loadLocalTemplates();
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      // console.log(msg.payload.toString());
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zwave-ad" )
        {
        if(fimpMsg.mtype == "evt.network.all_nodes_report" )
        {
          this.nodes = fimpMsg.val;
          this.calculateTotals();
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

          let node = this.getNodeByAddress(fimpMsg.val["address"])
          if(node) {
            if(fimpMsg.val.status=="SUCCESS")
              node.status = "OK";
            else
              node.status = "NO_RESP";
          }


        }else if (fimpMsg.mtype == "evt.network.update_report") {
            this.zwAdState = fimpMsg.val;
        }else if (fimpMsg.mtype == "evt.adapter.states_report") {
          this.zwAdState = fimpMsg.val["adapter_state"];
          this.homeId = fimpMsg.val["home_id"];
          this.inclProcState = fimpMsg.val["base_net_proc_state"];
          this.globalNonSecureInclMode = fimpMsg.val["enabled_global_non_secure"];
        }
      }else if (fimpMsg.service == "dev_sys") {
        if (fimpMsg.mtype == "evt.ping.report") {
            this.pingResult = fimpMsg.val.status;
        }
      }else if (fimpMsg.service == "vinc_db" ) {
        if (fimpMsg.mtype == "evt.device.list_report") {
           // this.updateNodesWithVincDeviceInfo(fimpMsg.val);
        }else if (fimpMsg.mtype == "evt.room.list_report") {
           // this.updateNodesWithVincRoomInfo(fimpMsg.val);
        }

      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });

    // Let's load nodes list from cache otherwise reload nodes from zwave-ad .
    if (localStorage.getItem("zwaveNodesList")==null){
        this.reloadNodes();
    }else {
        this.nodes = JSON.parse(localStorage.getItem("zwaveNodesList"));
        this.calculateTotals();
        // this.loadThingsFromRegistry();
    }
    if (localStorage.getItem("zwNetworkStats")!=null){
      this.networkStats = JSON.parse(localStorage.getItem("zwNetworkStats"));
      this.drawNetworkTopology()
    }

  }
  ngOnDestroy() {
    this.globalSub.unsubscribe();
  }

  calculateTotals() {
    this.totalDevices = 0;
    this.totalBattery = 0;
    this.totalSleeping = 0;
    this.totalFlir = 0 ;
    this.totalUp = 0 ;
    this.totalDown = 0 ;

    if (this.nodes) {
      for (let node of this.nodes) {
        this.totalDevices++;
        if (node.power_source == "battery") {
          this.totalBattery++
          if (node.wakeup_int>0) {
            this.totalSleeping++;
          }else {
            this.totalFlir++;
          }
        }
        if(node.status=="UP") {
          this.totalUp++;
        }else {
          this.totalDown++;
        }

      }
    }
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
    if (this.nodes){
      for(let node of this.nodes) {
        if(node.address == address) {
          return node;
        }
      }
    }
    return null;
  }

  generateLwrData() {
    const edges = [];
    const lwrNodes = this.networkStats.filter(n => n.lwr.has_lwr).map(n => {
      n.lwr.route = [n.lwr.r1, n.lwr.r2, n.lwr.r3, n.lwr.r4];
      return n;
    });

    const nodes = lwrNodes.map(node => ({id:node["node_id"],label:"Node\n"+node["node_id"],group:'sleep',title:node["alias"]}));

    // GW node
    const existingGW = nodes.find(n => n.id === 1);
    if (existingGW != null) {
      existingGW.group = 'gw';
    } else {
      const gw = this.networkStats.find(n => n.node_id === 1);
      nodes.push({id:gw["node_id"],label:"Node\n"+gw["node_id"],group:"gw",title:gw["alias"]});
    }

    for (const node of lwrNodes) {
      let from = 1;
      for (const routeNode of node.lwr.route) {
        if (routeNode !== 0) {
          edges.push({from: from, to: routeNode, arrows: 'to', color: { inherit: 'to' }, smooth: {type: 'curvedCW', roundness: 0.2}});
          from = routeNode;
        }
      }
      edges.push({from: from, to: node['node_id'], arrows: 'to', color: { inherit: 'to' }, smooth: {type: 'curvedCW', roundness: 0.2}});
    }

    return {nodes, edges};
  }

  generateNbData() {
    var edges = [];
    var nodes = [];

    for(let node of this.networkStats) {
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
        edges.push({from:node["node_id"],to:nbNode["node_id"],arrows:'',color: { inherit: "from" }})
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
      nodes.push({id:node["node_id"],label:"Node\n"+node["node_id"],group:rgroup,title:node["alias"]})
    }

    return {nodes, edges};
  }

  drawNetworkTopology() {
    this.repeaterNodes = [];
    for(let node of this.networkStats) {
      var tnd = this.getNodeByAddress(String(node.node_id));
      if (tnd) {
        node["alias"] = tnd.alias;
        node["power_source"] = tnd.power_source;
        node["status"] = tnd.status;
        console.log("Alias is set " + tnd.alias);
      }
    }
    const graphData = this.graphType === 'lwr' ? this.generateLwrData() : this.generateNbData();
        var nodesDS = new vis.DataSet(graphData.nodes);
        var edgesDS = new vis.DataSet(graphData.edges);


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
            shape: "circle",
            size: 10,
            font: {
              size: 12,
            }
          },
          edges: {
            smooth: false
          },
          layout: {
            randomSeed: 1
          },
          physics: {
            enabled: true,
            forceAtlas2Based: {
              avoidOverlap: 0.65,
              gravitationalConstant: -2500,
              // centralGravity: 0.005,
              springLength: 100,
              springConstant: 0.3
            },
            maxVelocity: 500,
            minVelocity: 200,
            solver: 'forceAtlas2Based',
            timestep: 0.35,
            stabilization: {iterations: 100}
          },
          groups: {
            "gw": {shape: "box", color: '#e2893d', size: 30},
            "rep": {color: '#96ff6e'},
            "sleep": {color: '#cccccc'}
          }
        };
        // initialize your network!
        this.visJsNetwork = new vis.Network(container, data, options);
        // add double click listener to nodes
        this.visJsNetwork.on('doubleClick', (event) => {
          this.dialog.open(PingDeviceDialog, {
            // height: '400px',
            width: '600px',
            data : {"fimp":this.fimp,"nodeId":event.nodes[0]},
          });
        });
  }

  stopSimulation(){
    this.visJsNetwork.stopSimulation()
  }

  loadThingsFromRegistry() {
    this.updateNodesWithVincDeviceInfo();
  }

  updateNodesWithVincDeviceInfo() {
      try {
        for(let node of this.nodes) {
          node["alias"] = "";
        }

        for(let node of this.nodes) {
          // console.log("Getting thing for address : "+node.address)
          let thing = this.registry.getThingByAddress("zw",node.address)
          console.dir(thing);
          if (thing.length > 0) {
            node.alias = thing[0].alias
            node["room"] = thing[0].location_alias
          }
        }
        localStorage.setItem("zwaveNodesList", JSON.stringify(this.nodes));
      }catch (e) {

      }

   }

  updateNodesWithVincRoomInfo(listOfRooms:any) {
    try {

      for(let node of this.nodes) {
        for (let room of listOfRooms) {
          // change node.id to node.address
          if (node.vincId == room.id) {
            node["room"] = room.type + room.client.name;
          }
        }
      }
      this.showProgress(false);
      localStorage.setItem("zwaveNodesList", JSON.stringify(this.nodes));


    }catch (e) {

    }

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
  resetNetwork() {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '250px',
      });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        let msg  = new FimpMessage("zwave-ad","cmd.network.reset","null",null,null,null)
        this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
      }
    });
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
  // Deprecated
  requestVincDevices() {
    let msg  = new FimpMessage("vinc_db","cmd.device.get_list","null","",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1",msg.toString());
  }

  // Deprecated
  requestVincRooms() {
    let msg  = new FimpMessage("vinc_db","cmd.room.get_list","null","",null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1",msg.toString());
  }

  runCommand(node:any) {
     switch (this.selectedCommand) {
       case "update":
         this.updateDevice(node.address);
         break;
       case "template":
         this.openTemplateEditor(node.hash+'.json','stable');
         break;
       case "reload_template":
         this.reloadDeviceTemplate(node.address);
         break;
       case "delete":
         this.deleteFailedDevice(node.address);
         break;
       case "replace":
         this.replaceDevice(node.address);
         break;
       case "ping":
         // this.pingNodeFromGw(String(node.address));

         let dialogRef = this.dialog.open(PingDeviceDialog, {
           // height: '400px',
           width: '600px',
           data : {"fimp":this.fimp,"nodeId":node.address},
         });
         dialogRef.afterClosed().subscribe(result => {
           this.selectedOption = result;
         });
         break;
     }
  }

  updateDevice(nodeId :number){
    let msg  = new FimpMessage("zwave-ad","cmd.network.node_update","int",Number(nodeId),null,null)
    this.showProgress(true);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  reloadDeviceTemplate(nodeId :number){
    let msg  = new FimpMessage("zwave-ad","cmd.thing.reload_template","int",Number(nodeId),null,null)
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
    .subscribe ((result:any) => {
         this.localTemplates = result
    });
    this.http.get(BACKEND_ROOT+'/fimp/api/zwave/products/list-local-templates?type=cache')
    .subscribe ((result:any) => {
         this.localTemplatesCache = result
    });
  }
  downloadTemplatesFromCloud(){
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let options = {headers:headers};
    this.http
    .post(BACKEND_ROOT+'/fimp/api/zwave/products/download-from-cloud',null,options )
    .subscribe ((result) => {
       console.log("Flow was saved");
    });
  }
  uploadCacheToCloud() {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let options = {headers:headers};
    this.http
    .post(BACKEND_ROOT+'/fimp/api/zwave/products/upload-to-cloud', null , options )
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
    if(this.globalSub)
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
  selector: 'ping-device-dialog',
  templateUrl: './dialog-ping-node.html',
  styleUrls: ['./ping-dialog.css'],
})
export class PingDeviceDialog implements OnInit, OnDestroy  {
  public messages:string[]=[];
  globalSub : Subscription;
  pingResult : string ;
  address : string;
  status : string;
  ima : any;
  results :any[];

  constructor(public dialogRef: MatDialogRef<PingDeviceDialog>,private fimp:FimpService,@Inject(MAT_DIALOG_DATA) public data: any) {

  }
  ngOnInit(){

    this.status = "Working...";
    this.ima = {};
    this.results = [];
    this.pingNodeFromGw(this.data.nodeId);
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {

      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "zwave-ad" )
      {
        if(fimpMsg.mtype == "evt.ping.report" )
        {
          console.log("-----------NEW message---------")
          this.address = fimpMsg.val.address;
          this.status = fimpMsg.val.status;
          this.ima = fimpMsg.val.ima;
          this.results.push(fimpMsg.val);
        }
      }
    });
  }
  ngOnDestroy() {
    this.globalSub.unsubscribe();
  }
  pingNodeFromGw(toNode:string){
    this.status = "Working...";
    this.ima = {};
    let props:Map<string,string> = new Map();
    props["tx_level"] = "0";
    let msg  = new FimpMessage("zwave-ad","cmd.ping.send","string",toNode,props,null)
    this.data.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:zw/ad:1",msg.toString());
  }

  clearPingResults(){
    this.status = "";
    this.ima = {};
    this.results = [];
  }

  color(value:number) {
    if(value > -50) {
      return "#5ee432"; // green
    }else if(value > -60) {
      return "#fffa50"; // yellow
    }else if(value > -75) {
      return "#f7aa38"; // orange
    }else {
      return "#ef4655"; // red
    }
  }


}

//////////////////////////////////////////////////////////////////////////////////////

@Component({
  selector: 'dialog-confirm',
  templateUrl: 'dialog-confirm.html',
})
export class ConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

}

//////////////////////////////////////////////////////////////////////////////////////

