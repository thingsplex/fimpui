import { Component, OnInit,Inject } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FimpService } from "app/fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "app/fimp/Message";
import { msgTypeToValueTypeMap } from "app/things-db/mapping";
import { BACKEND_ROOT } from "app/globals";
import { ServiceInterface } from "app/tpui-modules/registry/model";
import {SafeResourceUrl,DomSanitizer} from "@angular/platform-browser"
import {FimpApiMetadataService} from "app/fimp/fimp-api-metadata.service"
// import {FireService} from "app/firebase/fire.service";
import {FlowPropsDialog} from "./flow-props-editor.component";
import {Subscription} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {tryCatch} from "rxjs/internal-compatibility";

/*
 <mat-icon *ngSwitchCase="'trigger'" aria-label="Edit node">input</mat-icon>
                    <mat-icon *ngSwitchCase="'vinc_trigger'" aria-label="Edit node">input</mat-icon>
                    <mat-icon *ngSwitchCase="'receive'" aria-label="Edit node">input</mat-icon>
                    <mat-icon *ngSwitchCase="'time_trigger'" aria-label="Edit node">schedule</mat-icon>
                    <mat-icon *ngSwitchCase="'wait'" aria-label="Edit node">update</mat-icon>
                    <mat-icon *ngSwitchCase="'action'" aria-label="Edit node">send</mat-icon>
                    <mat-icon *ngSwitchCase="'rest_action'" aria-label="Edit node">send</mat-icon>
                    <mat-icon *ngSwitchCase="'if'" aria-label="Edit node">call_split</mat-icon>
                    <mat-icon *ngSwitchCase="'iftime'" aria-label="Edit node">call_split</mat-icon>
                    <mat-icon *ngSwitchCase="'rate_limit'" aria-label="Edit node">call_split</mat-icon>
                    <mat-icon *ngSwitchCase="'loop'" aria-label="Edit node">loop</mat-icon>
                    <mat-icon *ngSwitchCase="'set_variable'" aria-label="Edit node">edit</mat-icon>
                    <mat-icon *ngSwitchCase="'transform'" aria-label="Edit node">transform</mat-icon>
                    <mat-icon *ngSwitchCase="'exec'" aria-label="Exec node">flash_on</mat-icon>
                    <mat-icon *ngSwitchCase="'log_action'" aria-label="Log node">edit</mat-icon>
                    <mat-icon *ngSwitchDefault aria-label="Edit node">build</mat-icon>
 */

const nodeTypeAlias = {
  "trigger":"Trigger",
  "http_trigger":" Http/ws",
  "vinc_trigger":"Home event",
  "receive":"Wait event",
  "time_trigger":"Time trigger",
  "wait":"Delay",
  "action":"Action",
  "rest_action":"HTTP msg",
  "action_http_reply":"Http reply",
  "if":"If condition",
  "iftime":"Time filter",
  "rate_limit":"Rate limit",
  "loop":"Loop",
  "set_variable":"Set variable",
  "transform":"Transform",
  "exec":"Run script",
  "log_action":"Log action",
  "notification_action":"Notification",
  "timeline_action":"Timeline",
  "vinc_action":"Home mode",
  "timetools": "Time tools",
  "metrics": "Metrics"
}

export class MetaNode {
  Id               :string;
	Type             :string;
	TypeAlias        :string; // Human readable type
  LastValue        :string; // Last value on UI
	Label            :string;
	SuccessTransition :string;
	TimeoutTransition :string;
	ErrorTransition   :string;
	Address           :string;
	ResponseToTopic   :string;
	Service           :string;
	ServiceInterface  :string;
  Config            :any;
  Ui                :Ui;
}

export class Ui {
  x:number;
  y:number;
  nodeType:string;  // the same node can have different UI nodes
}

export class Variable {
  Value :any;
  ValueType :string;
}

@Component({
  selector: 'app-flow-editor',
  templateUrl: './flow-editor.component.html',
  styleUrls: ['./flow-editor.component.css']
})
export class FlowEditorComponent implements OnInit {
  flow :Flow;
  id   :string;
  selectedNewNodeType:string;
  // properties for drag-and-drop
  currentDraggableNode:any;
  dragStartPosX:number;
  dragStartPosY:number;
  currentDraggableNodeId:string;
  isDraggableLine:boolean;
  canvasHeight:number;
  canvasInitHeight:number;
  lastRequestId:string;
  private globalSub : Subscription;
  private connSub : Subscription;

  constructor(private route: ActivatedRoute,private router: Router,public dialog: MatDialog,public snackBar: MatSnackBar,private fimp : FimpService,private fimpMeta : FimpApiMetadataService) {
    this.flow = new Flow();
   }

  ngOnInit(){
    this.id  = this.route.snapshot.params['id'];
    if (this.id=="-" || this.id=="") {
      this.showPropsDialog(this.id);
    }
    this.canvasHeight = 0;
    this.configureFimpListener();
    this.loadData();
  }

  loadData() {
    if (this.fimp.isConnected())
      this.loadFlow(this.id);
    else
      this.connSub = this.fimp.getConnStateObservable().subscribe((message: any) => {
        this.loadFlow(this.id);
      });
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
    if(this.connSub)
      this.connSub.unsubscribe();
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" && fimpMsg.corid ==this.lastRequestId ){
        if (fimpMsg.mtype == "evt.flow.definition_report") {
          if (fimpMsg.val) {
            this.flow = fimpMsg.val;
            this.enhanceNodes();
            console.log("Flow loaded. Name :"+this.flow.Name);
            setTimeout(()=>{this.redrawAllLines()},100);
            let canvas = document.getElementById("flowEditorCanvasId");
            this.canvasInitHeight = canvas.clientHeight;
          }
        }else if(fimpMsg.mtype == "evt.flow.update_report") {
          if (fimpMsg.val == "ok") {
            this.snackBar.open('Flow is saved',"",{duration:1000});
          }else {
            this.snackBar.open('ERROR!!! Flow can not be initialized ',"",{duration:3000});
            console.log(fimpMsg.val)
            let dialogRef = this.dialog.open(HelpDialog,{
              // height: '95%',
              width: '400px',
              data:fimpMsg.val
            });
          }

        }
      }else {
        this.updateUiValue(fimpMsg.topic,fimpMsg);
      }
    });
  }

  loadFlow(id:string) {
    let msg  = new FimpMessage("tpflow","cmd.flow.get_definition","string",id,null,null)
    msg.src = "tplex-ui"
    this.lastRequestId = msg.uid;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  updateUiValue(topic:string,fimpMsg : FimpMessage) {
    if (this.flow.Nodes) {
      // console.log("New update from topic " + topic);
      // console.dir(fimpMsg);
      this.flow.Nodes.forEach(node => {
        if (node.Address == topic && node.Service == fimpMsg.service && node.ServiceInterface == fimpMsg.mtype) {
          if (fimpMsg.valueType == "string" || fimpMsg.valueType == "int" || fimpMsg.valueType == "float" || fimpMsg.valueType == "bool") {
            node.LastValue = fimpMsg.val;
            if (fimpMsg.props)
              if(fimpMsg.props["unit"]) {
                node.LastValue = node.LastValue+" "+fimpMsg.props["unit"];
              }
          }

        }
      });
    }
  }

  variableSelected(event:any,config:any){
    if (config.LeftVariableName.indexOf("__global__")!=-1) {
      config.LeftVariableName = config.LeftVariableName.replace("__global__","");
      config.LeftVariableIsGlobal = true;
    }
  }

 saveFlow() {
    // console.dir(this.flow)
     let snackRef = this.snackBar.open('Saving....',"");
     let msg  = new FimpMessage("tpflow","cmd.flow.update_definition","object",this.flow,null,null)
     msg.src = "tplex-ui"
     this.lastRequestId = msg.uid;
     msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
     this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }
  runFlow() {
    let node:MetaNode;
    for(node of this.flow.Nodes) {
      if (node.Type == "trigger") {
        break;
      }
    }
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

  showPropsDialog(id) {
    let dialogRef = this.dialog.open(FlowPropsDialog,{
      // height: '95%',
      width: '600px',
      data:this.flow
    });
    dialogRef.afterClosed().subscribe(result => {
      console.dir(result)
      if (result.Name != undefined) {
        this.flow.Name = result.Name;
        this.flow.Group = result.Group;
        this.flow.Description = result.Description;
        if(id=="-") {
          this.saveFlow();
        }
      }

    });
  }

  sendFlowControllCommands(command:string) {
    let val = {"op":command,"id":this.flow.Id}
    let msg  = new FimpMessage("tpflow","cmd.flow.ctrl","str_map",val,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

 getNewNodeId():string {
   let id = 0;
   let maxId = 0;
   this.flow.Nodes.forEach(element => {
     id = parseInt(element.Id);
     if (id > maxId) {
       maxId = id ;
     }
   });
   maxId++;
   return maxId+"";
 }

 allowNodeDrop(event:any) {
   if (!this.isDraggableLine){
     console.log("allow node drop");
     event.preventDefault();
    }
  }

 nodeDrop(event:any) {
   if (!this.isDraggableLine){
      console.log("node dropped");
      console.dir(event);
      var offsetX = event.clientX - this.dragStartPosX ;
      var offsetY = event.clientY - this.dragStartPosY ;
      var nodeStartPositionX = 20;
      var nodeStartPositionY = 20;

      if (this.currentDraggableNode.style.left)
        nodeStartPositionX = Number(this.currentDraggableNode.style.left.replace("px",""));
      if (this.currentDraggableNode.style.top)
        nodeStartPositionY = Number(this.currentDraggableNode.style.top.replace("px",""));
      var xPos = nodeStartPositionX + offsetX;
      var yPos = nodeStartPositionY + offsetY
      this.currentDraggableNode.style.left = (xPos)+"px";
      this.currentDraggableNode.style.top = (yPos)+"px";

      var node = this.getNodeById(this.currentDraggableNodeId)
      if(node.Ui == undefined) {
        node.Ui = new Ui();
      }
      node.Ui.x = xPos;
      node.Ui.y = yPos;
      this.redrawNodeLines(this.currentDraggableNodeId);
      event.preventDefault();
  }
 }
 nodeDragStart(event:any){
  this.currentDraggableNode = event.srcElement;
  this.dragStartPosX = event.clientX;
  this.dragStartPosY = event.clientY;
  console.dir(event);
  if (event.srcElement.className.includes("socket")){
    console.log("Line drag start");
    this.isDraggableLine = true
  } else {
    console.log("Node drag start");
    this.isDraggableLine = false;

    this.currentDraggableNodeId = event.srcElement.id.replace("nodeId_","")
    console.log("active node id = "+this.currentDraggableNodeId);
  }
 }
 //////////////////////////
 allowLineDrop(event:any) {
  console.log("allow line drop");
  event.preventDefault();
 }
 // invoked when drag operation is finished
 lineDrop(event:any) {
    console.log("line dropped");
    console.dir(this.currentDraggableNode);
    console.log("dropp event");
    console.dir(event);
    var offsetX = event.clientX - this.dragStartPosX ;
    var offsetY = event.clientY - this.dragStartPosY ;
    console.log("offset x = "+offsetX);
    console.log("offset y = "+offsetY);

    // var outSockCord =  this.findOutputSocketPosition(this.currentDraggableNode);
    // var inSockCord =  this.findInputSocketPosition(event.srcElement);
    var srcNodeIdWithType = this.currentDraggableNode.id.replace("out_socket_nodeid_","");
    var srcSocketType = srcNodeIdWithType.split("_")[0];
    var srcNodeId = srcNodeIdWithType.split("_")[1];
    var targetNodeId = event.srcElement.id.replace("in_socket_nodeid_","");
    var srcNode = this.getNodeById(srcNodeId);
    if (srcNode.Type == "if") {
      if (srcSocketType == "iftrue")
        srcNode.Config.TrueTransition = targetNodeId;
      else
        srcNode.Config.FalseTransition = targetNodeId;
    }else {
      if (srcSocketType == "succ")
        srcNode.SuccessTransition = targetNodeId;
      if (srcSocketType == "err")
        srcNode.ErrorTransition = targetNodeId;
      if (srcSocketType == "timeout")
        srcNode.TimeoutTransition = targetNodeId;

    }
    // this.drawLineBetweenNodes(srcNodeId,targetNodeId,srcSocketType);
    this.redrawAllLines();
    event.preventDefault();
 }

 redrawNodeLines(nodeId:string) {
   // inbound lines

   var parentNodes = this.getParentNodesById(nodeId);
   if (parentNodes != null) {
      for (let parentNode of parentNodes) {

          if (parentNode.Type == "if") {
            if (parentNode.Config.TrueTransition == nodeId)
              this.drawLineBetweenNodes(parentNode.Id,nodeId,"iftrue");
            if (parentNode.Config.FalseTransition == nodeId)
              this.drawLineBetweenNodes(parentNode.Id,nodeId,"iffalse");
          }else {
            if (parentNode.SuccessTransition == nodeId)
                this.drawLineBetweenNodes(parentNode.Id,nodeId,"succ");
            if (parentNode.ErrorTransition == nodeId)
                this.drawLineBetweenNodes(parentNode.Id,nodeId,"err");
            if (parentNode.TimeoutTransition == nodeId)
                this.drawLineBetweenNodes(parentNode.Id,nodeId,"timeout");
          }
      }
   }else {
        console.log("Node doesn't have inbound lines");
    }
   //out bound lines
   var node = this.getNodeById(nodeId);
   if(node.Type == "if"){
    if (node.Config.TrueTransition.length > 0)
        this.drawLineBetweenNodes(nodeId,node.Config.TrueTransition,"iftrue");
    if (node.Config.FalseTransition.length > 0)
        this.drawLineBetweenNodes(nodeId,node.Config.FalseTransition,"iffalse");
   }else {
     if (node.SuccessTransition.length > 0)
        this.drawLineBetweenNodes(nodeId,node.SuccessTransition,"succ");
     if (node.ErrorTransition.length > 0)
        this.drawLineBetweenNodes(nodeId,node.ErrorTransition,"err");
     if(node.TimeoutTransition)
      if (node.TimeoutTransition.length > 0)
          this.drawLineBetweenNodes(nodeId,node.TimeoutTransition,"timeout");

   }

 };

 recalculateCanvasSize() {
  //  var canvas = document.getElementById("flowEditorCanvasId");
  //  console.dir(canvas);
  //  document.getElementById("flowEditorCanvasId").style.height = (canvas.scrollHeight+100)+"px";

 }
 onCanvasSizeChange(){
    console.log("On canvas size change . value ="+this.canvasHeight);
    document.getElementById("flowEditorCanvasId").style.height = (this.canvasInitHeight+this.canvasHeight)+"px";
 }

 //////////////////////////

 drawLineBetweenNodes(sourceNodeId,targetNodeId,type) {
  var outSocketElement = document.getElementById("out_socket_nodeid_"+type+"_"+sourceNodeId);
  var inSocketElement = document.getElementById("in_socket_nodeid_"+targetNodeId);
  if (outSocketElement && inSocketElement){
    var outSockCord =  this.findOutputSocketPosition(outSocketElement);
    var inSockCord =  this.findInputSocketPosition(inSocketElement);
    var yOffset = 19;
    this.drawCurvedLine(sourceNodeId+"_"+targetNodeId+"_"+type,outSockCord.x+5,outSockCord.y-yOffset,inSockCord.x+5,inSockCord.y-yOffset,"#afe0aa",0.0);
  }

 }

 drawCurvedLine(id,x1, y1, x2, y2, color, tension) {
    var svg = document.getElementById("flow-connections");

    var existingLine = document.getElementById(id);
    if (existingLine != undefined) {
      svg.removeChild(existingLine);
    }

    var shape = document.createElementNS("http://www.w3.org/2000/svg","path");
    var delta = (x2-x1)*tension;
    var hx1=x1+delta;
    var hy1=y1;
    var hx2=x2-delta;
    var hy2=y2;
    var path = "";
    if (y2>y1) {
        path = "M "  + x1 + " " + y1 +
                  " C " + hx1 + " " + hy1
                        + " "  + hx2 + " " + hy2
                  + " " + x2 + " " + y2;
    }else {
       var leftx = x1
       if (x2<x1)
         leftx = x2;
       leftx = leftx-130;
       path = "M "  + x1 + " " + y1 + " L "+x1+" "+(y1+30)+ " L "+leftx+" "+(y1+30) +
                  "L "+leftx+" "+(y2-30) + "L "+x2+" "+(y2-30)+ "L "+x2+" "+y2;
    }
    shape.setAttributeNS(null, "d", path);
    shape.setAttributeNS(null, "id", id);
    shape.setAttributeNS(null, "fill", "none");
    shape.setAttributeNS(null, "stroke", color);
    shape.setAttributeNS(null, "stroke-width", "4px");
    svg.appendChild(shape);
}

findOutputSocketPosition(htmlElement):any {
  var x = htmlElement.offsetLeft;
  var y = htmlElement.offsetTop;
  var parentX = Number(htmlElement.offsetParent.style.left.replace("px",""));
  var parentY = Number(htmlElement.offsetParent.style.top.replace("px",""));

  x = (x+parentX)-(htmlElement.clientWidth/2);
  y = (y+parentY+(htmlElement.clientHeight/2))-htmlElement.offsetParent.clientHeight;
  return {
      "x": x,
      "y": y
  };
}

findInputSocketPosition(htmlElement):any {
  var x = htmlElement.offsetLeft;
  var y = htmlElement.offsetTop;
  var parentX = Number(htmlElement.offsetParent.style.left.replace("px",""));
  var parentY = Number(htmlElement.offsetParent.style.top.replace("px",""));

  x = (x+parentX)-(htmlElement.clientWidth/2);
  y = (parentY-(htmlElement.offsetParent.clientHeight+htmlElement.clientHeight/2));
  return {
      "x": x,
      "y": y
  };
}

///////////////////////////
 addNode(nodeType:string,uiNodeType:string){
    console.dir(this.selectedNewNodeType)
    this.recalculateCanvasSize();
    let node  = new MetaNode()
    node.Id = this.getNewNodeId();
    node.Type = nodeType;
    node.Label = "";
    node.Address = "";
    node.Service = "";
    node.ServiceInterface = "";
    node.SuccessTransition = "";
    node.ErrorTransition = "";
    node.Config = null;
    node.Ui = new Ui();
    node.Ui.x = 80;
    node.Ui.y = 200;
    node.Ui.nodeType = uiNodeType;


    switch (node.Type){
      case "trigger":
        break;
      case "action":
        break;
      // case "rest_action":
      //   node.Config = {"Url":"http://","Method":"GET","RequestPayloadType":"json","RequestTemplate":"","LogResponse":false,
      //     "Headers":[{"Name":"Content-type","Value":"application/json"}],"ResponseMapping":[]};
      //   break;
      case "loop":
        node.Config = {};
        node.Config["StartValue"] = 0;
        node.Config["EndValue"] = 5;
        node.Config["Step"] = 1;
        node.Config["SaveToVariable"] = false;
        break;
      case "receive":
        break;
      case "if":
        node.Config = {};
        node.Config["TrueTransition"] = ""
        node.Config["FalseTransition"] = ""
        node.Config["Expression"] = [];
        let expr = {};
        let rightVariable = {};
        expr["Operand"] = "eq";
        expr["LeftVariableName"] = "";
        expr["LeftVariableIsGlobal"] = false;
        rightVariable["Value"] = 100;
        rightVariable["ValueType"] = "int";
        expr["RightVariable"] = rightVariable
        expr["BooleanOperator"] = "";
        node.Config["Expression"].push(expr);
        break;
      case "wait":
        node.Config = 1000;
        break;
      case "set_variable":
        node.Config = {};
        node.Config["Name"] = ""
        node.Config["UpdateGlobal"] = false
        node.Config["UpdateInputMsg"] = false
        node.Config["IsVariableInMemory"] = true
        let variable = {};
        variable["Value"] = 0;
        variable["ValueType"] = "";
        node.Config["DefaultValue"] = variable
        break;
      case "time_trigger":
        node.Config = {};
        node.Config["DefaultMsg"] = {"Value":"","ValueType":""};
        let expressions = [];
        expressions.push({"Name":"","Expression":"","Comments":""});
        node.Config["Expressions"] = expressions;
        node.Config["GenerateAstroTimeEvents"] = false;
        node.Config["Latitude"] = 0.0;
        node.Config["Longitude"] = 0.0;
        node.Config["SunriseTimeOffset"] = 0;
        node.Config["SunsetTimeOffset"] = 0;

        break;

    }
    this.enhanceNode(node);
    this.flow.Nodes.push(node)
  }
  showSource() {
    let dialogRef = this.dialog.open(FlowSourceDialog,{
            // height: '95%',
            width: '95%',
            data:this.flow
          });
    dialogRef.afterClosed().subscribe(result => {
      if(result)
        this.flow = result;
    });
  }

  shareFlow() {
    // this.fire.addFlow(this.flow);
    // this.snackBar.open('Flow is shared',"",{duration:1000});
  }

  showLog() {
    let dialogRef = this.dialog.open(FlowLogDialog,{
      // height: '95%',
      width: '100vw',
      maxWidth: '97vw',
      data:{flowId:this.flow.Id,mode:"flow"}
    });
    dialogRef.afterClosed().subscribe(result => {
      // dialogRef.componentInstance.cleanup();
    });
  }

  showNodeEditorDialog(flow:Flow,node:MetaNode) {
    let dialogRef = this.dialog.open(NodeEditorDialog,{
      // height: '95%',
      // width: '90vw',
      data:{"flow":flow,"node":node}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result=="deleted") {
        this.redrawAllLines();
      }
    });
  }

  showContextDialog() {
    let dialogRef = this.dialog.open(ContextDialog,{
            width: '95%',
            data:this.flow
          });
    dialogRef.afterClosed().subscribe(result => {

    });
  }

  getNodeById(nodeId:string):MetaNode {
    console.log("GEtting node for id = "+nodeId);
    var node:MetaNode;
    this.flow.Nodes.forEach(element => {
        if (element.Id==nodeId) {
          node = element;
          return ;
        }
    });
    return node;
  }

  getParentNodesById(nodeId:string):MetaNode[] {
    var nodes:MetaNode[] = [];
    this.flow.Nodes.forEach(element => {
        if (element.SuccessTransition==nodeId || element.ErrorTransition==nodeId || element.TimeoutTransition==nodeId ) {
          nodes.push(element);
          return ;
        }else {
          if (element.Config) {
            if (element.Config.TrueTransition==nodeId || element.Config.FalseTransition==nodeId) {
              nodes.push(element);
              return ;
            }
          }
        }
    });
    return nodes;
  }
  // for back compatability
  enhanceNodes() {
    this.flow.Nodes.forEach(node => {

      if(node.Ui == undefined) {
        node.Ui = new Ui()
        node.Ui.x = 70;
        node.Ui.y = 170;
        node.Ui.nodeType = "";
      }
      if (node.Ui.nodeType==undefined) {
        node.Ui["nodeType"] = "";
      }
      this.enhanceNode(node);
    });
  }

  enhanceNode(node) {
   try {
     let nodeTAlias = nodeTypeAlias[node.Type]
     if (nodeTAlias) {
       node.TypeAlias = nodeTAlias;
     }
     if (node.Ui.nodeType) {
         nodeTAlias = nodeTypeAlias[node.Ui.nodeType];
         if (nodeTAlias)
           node.TypeAlias = nodeTAlias;
         else
           node.TypeAlias = node.Ui.nodeType;
     }
   }catch (e) {
     node.TypeAlias = node.Type;
   }

  }

  redrawAllLines() {
    var svg = document.getElementById("flow-connections");
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
     }
    var maxY = 0;
    this.flow.Nodes.forEach(node => {
      this.redrawNodeLines(node.Id)
      if (node.Ui.y>maxY)
          maxY = node.Ui.y;
    });
    document.getElementById("flowEditorCanvasId").style.height = (maxY+100)+"px";
    this.canvasInitHeight = maxY+100;

  }

  serviceLookupDialog(nodeId:string) {
    let dialogRef = this.dialog.open(ServiceLookupDialog,{
            width: '95%'
          });
    dialogRef.afterClosed().subscribe(result => {
      if (result)
        this.flow.Nodes.forEach(element => {
            if (element.Id==nodeId) {
              element.Service = result.serviceName
              element.ServiceInterface = result.intfMsgType
              element.Address = result.intfAddress
              element.Config.ValueType =  msgTypeToValueTypeMap[element.ServiceInterface]
            }
        });


    });
  }

}

export class Flow {
    Id :string ;
    Name : string ;
    Description : string ;
    Group:string;
    Nodes : MetaNode[] ;
}

@Component({
  selector: 'flow-source-dialog',
  templateUrl: 'flow-source-dialog.html',
  styleUrls: ['flow-editor.component.css']
})
export class FlowSourceDialog {
  flowSourceText :string ;
  constructor(public dialogRef: MatDialogRef<FlowSourceDialog>,@Inject(MAT_DIALOG_DATA) public data: Flow) {
    this.flowSourceText = JSON.stringify(data, null, 2)
  }
  save(){
    this.data = JSON.parse(this.flowSourceText)
    this.dialogRef.close(this.data);

  }
}

export interface LogEntry {
  level :string;
  msg :string;
  time :string;
  comp:string;
  fid:string;
  ntype:string;
  nid:string;

}

@Component({
  selector: 'flow-log-dialog',
  templateUrl: 'flow-log-dialog.html',
  styleUrls: ['flow-editor.component.css']
})
export class FlowLogDialog {
  flowLog :LogEntry[] ;
  limit : number;
  flowId : string ;
  mode : string;
  private globalSub : Subscription;
  constructor(public dialogRef: MatDialogRef<FlowSourceDialog>,@Inject(MAT_DIALOG_DATA) public data: any,private fimp : FimpService) {
    this.limit = 10;
    this.flowId = data.flowId;
    this.mode = data.mode;
    this.configureFimpListener();
    this.reload();
  }

  reload() {
    let val = {"flowId":this.flowId,"limit":this.limit}
    let msg  = new FimpMessage("tpflow","cmd.flow.get_log","str_map",val,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  ngOnDestroy() {
    console.log("Cleanup")
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        if (fimpMsg.mtype == "evt.flow.log_report") {
          if (fimpMsg.val) {
            this.flowLog = fimpMsg.val
          }
        }
      }
    });
  }

}

@Component({
  selector: 'node-editor-dialog',
  templateUrl: 'node-editor-dialog.html',
  styleUrls: ['flow-editor.component.css']
})
export class NodeEditorDialog {
  flow :Flow;
  node :MetaNode;
  constructor(public dialogRef: MatDialogRef<NodeEditorDialog>,@Inject(MAT_DIALOG_DATA) public data:any,public dialog: MatDialog) {
    this.flow = data.flow;
    this.node = data.node;
   }
   deleteNode(node:MetaNode){
      var nodeId = node.Id;
      let index: number = this.flow.Nodes.indexOf(node);
      if (index !== -1) {
          this.flow.Nodes.splice(index, 1);
      }
      this.flow.Nodes.forEach(element => {
        if (element.SuccessTransition==nodeId) {
          element.SuccessTransition = "";
        }
        if (element.ErrorTransition==nodeId) {
          element.ErrorTransition = "";
        }
        if (element.Type == "if")
          if (element.Config.TrueTransition ==nodeId) {
            element.Config.TrueTransition = "";
          }
          if (element.Config.FalseTransition ==nodeId) {
            element.Config.FalseTransition = "";
          }
      });
      this.dialogRef.close("deleted");
  }
  cloneNode(node:MetaNode){
   //  Object.assign(cloneNode,node);
   //  cloneNode.Id = this.getNewNodeId();
   // temp quick dirty way how to clone nested objects;
    var cloneNode = <MetaNode>JSON.parse(JSON.stringify(node));
    cloneNode.Id = this.getNewNodeId();
    this.flow.Nodes.push(cloneNode);
  }
  getNewNodeId():string {
    let id = 0;
    let maxId = 0;
    this.flow.Nodes.forEach(element => {
      id = parseInt(element.Id);
      if (id > maxId) {
        maxId = id ;
      }
    });
    maxId++;
    return maxId+"";
  }

  showHelp(node:MetaNode){
    // let dialogRef = this.dialog.open(HelpDialog,{
    //   // width: '95%',
    //   height: '95%',
    //   width: '95%',
    //   data:node
    // });
      window.open("https://thingsplex.github.io/docs/thingsplex-ui/flow/", "_blank");
  }


}

@Component({
  selector: 'context-dialog',
  templateUrl: 'context-dialog.html',
  styleUrls: ['flow-editor.component.css']
})
export class ContextDialog {
  localContext :string ;
  globalContext : string;
  constructor(public dialogRef: MatDialogRef<ContextDialog>,@Inject(MAT_DIALOG_DATA) public data: Flow,private http : HttpClient) {

  }

}

@Component({
  selector: 'flow-run-dialog',
  templateUrl: 'flow-run-dialog.html',
})
export class FlowRunDialog {
  value : any;
  valueType : string ;
  actionData : MetaNode;

  constructor(public dialogRef: MatDialogRef<FlowRunDialog>,@Inject(MAT_DIALOG_DATA) public data: MetaNode,private fimp:FimpService,public snackBar: MatSnackBar) {

    this.valueType = data.Config.ValueFilter.ValueType

  }

  run(){
    let msg  = new FimpMessage(this.data.Service,this.data.ServiceInterface,this.valueType,this.value,null,null)
    this.fimp.publish(this.data.Address,msg);
    let snackBarRef = this.snackBar.open('Message was sent',"",{duration:1000});
  }
}

@Component({
  selector: 'help-dialog',
  templateUrl: 'help-dialog.html',
  styleUrls: ['./flow-editor.component.css']
})
export class HelpDialog {
  actionData : MetaNode;
  public url: SafeResourceUrl;
  public errorText : string;
  constructor(public dialogRef: MatDialogRef<FlowRunDialog>,@Inject(MAT_DIALOG_DATA) public data: any,private sanitizer: DomSanitizer) {
    this.errorText = data;
  }
  ngOnInit() {


  }

}

@Component({
  selector: 'service-lookup-dialog',
  templateUrl: 'service-lookup-dialog.html',
  styleUrls: ['./flow-editor.component.css']
})
export class ServiceLookupDialog  implements OnInit {
  interfaces :any;
  msgFlowDirectionD = "";
  constructor(public dialogRef: MatDialogRef<ServiceLookupDialog>,@Inject(MAT_DIALOG_DATA) msgFlowDirectionD : string) {
    console.log("Msg flow direction:"+msgFlowDirectionD);
    this.msgFlowDirectionD = msgFlowDirectionD
  }
  ngOnInit() {
    console.log("ng on init Msg flow  direction:"+this.msgFlowDirectionD);
  }

  onSelected(intf :ServiceInterface){
    console.dir(intf);
    this.dialogRef.close(intf);

  }
}
