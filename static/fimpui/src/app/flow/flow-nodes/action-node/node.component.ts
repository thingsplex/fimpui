import {MetaNode, ServiceLookupDialog} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material";
import {Http, Response} from "@angular/http";
import {BACKEND_ROOT} from "../../../globals";
import {ContextVariable} from "../../flow-context/variable-selector.component";

@Component({
  selector: 'action-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class ActionNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;
  complexValueAsString:any; //string representation of node.Config.DefaultValue.Value
  propsAsString:any;
  constructor(public dialog: MatDialog,private http : Http) {
  }

  ngOnInit() {
    this.loadDefaultConfig();
    // backword compatability
    if (this.node.Config.VariableName=="undefined"){
      this.node["DefaultValue"] = {"Value":"","ValueType":""};
      this.node["VariableName"] = "";
      this.node["IsVariableGlobal"] = false;
    }
    try{
      this.complexValueAsString = JSON.stringify(this.node.Config.DefaultValue.Value);
    }catch (err){
      console.log("Can't stringify complex default value")
    }
    try{
      this.propsAsString = JSON.stringify(this.node.Config.Props);
    }catch (err){
      console.log("Can't stringify props ")
    }

  }
  updateComplexValue(){
    this.node.Config.DefaultValue.Value = JSON.parse(this.complexValueAsString)
  }
  updateProps(){
    this.node.Config.Props = JSON.parse(this.propsAsString)
  }

  serviceLookupDialog(nodeId:string) {
    let dialogRef = this.dialog.open(ServiceLookupDialog,{
      width: '500px',
      data:"in"
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result)
        this.nodes.forEach(element => {

          if (element.Id==nodeId) {
            element.Service = result.serviceName
            if(element.Label==""||element.Label==undefined){
              element.Label =  result.serviceAlias + " at "+result.locationAlias
            }
            element.ServiceInterface = result.intfMsgType
            element.Address = result.intfAddress
            element.Config.DefaultValue.ValueType =  result.intfValueType

          }
        });
    });
  }


  variableSelected(event:any,config:any,isGlobal:boolean){
    config.IsVariableGlobal = isGlobal;

  }


  loadDefaultConfig() {
    if (this.node.Config==null) {
      this.node.Config = {
        "VariableName": "",
        "IsVariableGlobal": false,
        "Props": {},
        "RegisterAsVirtualService": false,
        "VirtualServiceGroup":"",
        "VirtualServiceProps":{}
      };
      this.node.Config["DefaultValue"] = {"Value": "", "ValueType": ""};
      if (this.node.Ui.nodeType) {
        switch (this.node.Ui.nodeType) {
          case "vinc_action":
            this.node.Address = "pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1"
            this.node.ServiceInterface = "cmd.mode.set"
            this.node.Service = "home_mode"
            this.node.Label = "Home action"
            this.node.Config.DefaultValue.ValueType = "string"
            break;
        }
      }
    }
  }


  inputVariableSelected(cvar:ContextVariable) {
    this.node.Config.VariableName = cvar.Name;
    this.node.Config.IsVariableGlobal = cvar.isGlobal;
    this.node.Config.VariableType = cvar.Type;
  }

}


@Component({
  selector: 'vinc-action-node',
  templateUrl: './vinc-action-node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class VincActionNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  shortcuts:any[];
  constructor(public dialog: MatDialog , private http : Http) {

  }
  ngOnInit() {
    this.loadDefaultConfig()
    this.loadShortcuts()
  }
  loadShortcuts() {
    this.http
      .get(BACKEND_ROOT+'/fimp/api/vinculum/shortcuts')
      .map(function(res: Response){
        let body = res.json();
        return body;
      }).subscribe ((result) => {
      this.shortcuts = result
    });
  }

  loadDefaultConfig() {
    if (this.node.Config==null) {
      this.node.Config = {
        "VariableName": "",
        "IsVariableGlobal": false,
        "Props": {},
        "RegisterAsVirtualService": false,
        "VirtualServiceGroup":"",
        "VirtualServiceProps":{}
      };
      this.node.Config["DefaultValue"] = {"Value": "", "ValueType": "string"};
      this.node.Address = "pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1"
      this.node.ServiceInterface = "cmd.mode.set"
      this.node.Service = "home_mode"
      this.node.Label = "Home action"
    }
  }

}
