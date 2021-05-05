import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";
import {HttpClient} from "@angular/common/http";
import * as ace from "ace-builds";

@Component({
  selector: 'transform-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class TransformNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  @ViewChild('nodeCodeEditor') editorEl: ElementRef;

  constructor(public dialog: MatDialog,private http : HttpClient) { }
  ngOnInit() {
    this.loadDefaultConfig();
  }

  ngAfterViewInit() {
    ace.config.set('basePath', 'https://unpkg.com/ace-builds@1.4.12/src-noconflict');

    const aceEditor = ace.edit(this.editorEl.nativeElement);
    aceEditor.session.setMode("ace/mode/html");
    aceEditor.session.setValue(this.node.Config.Template);
    aceEditor.on("change", () => {
      this.node.Config.Template = aceEditor.getValue();
    });
    this.transformationTypeChange();
  }


  loadDefaultConfig() {
    if (this.node.Config==null) {
      this.node.Config = {
        "TargetVariableName": "",
        "TargetVariableType": "",
        "IsTargetVariableGlobal": false,
        "IsTargetVariableInMemory":true,
        "TransformType": "calc",
        "Rtype": "var", "IsRVariableGlobal": false,
        "IsLVariableGlobal": false,
        "Expression": "",
        "RValue": {"ValueType": "int", "Value": 0},
        "RVariableName": "",
        "LVariableName": "",
        "ValueMapping": [],
        "XPathMapping": [],
        "Template": ""
      };
    }
  }

  addValueMapping(node:MetaNode){
    let valueMap = {};
    valueMap["LValue"] = {"ValueType":"int","Value":0};
    valueMap["RValue"] = {"ValueType":"int","Value":0};
    node.Config["ValueMapping"].push(valueMap);
  }

  addXPathMapping(node:MetaNode){
    let valueMap = {
      "Path":"",
      "TargetVariableName":"",
      "TargetVariableType":"",
      "IsTargetVariableGlobal":false,
      "UpdateInputVariable":false
    };
    node.Config["XPathMapping"].push(valueMap);
  }

  targetVariableSelected(cvar:ContextVariable,vmap) {
    vmap.TargetVariableName = cvar.Name;
    vmap.TargetVariableType = cvar.Type;
    vmap.IsTargetVariableGlobal = cvar.isGlobal;
    vmap.IsTargetVariableInMemory = cvar.InMemory;
  }

  resultVariableSelected(cvar:ContextVariable) {
    this.node.Config.TargetVariableName = cvar.Name;
    this.node.Config.TargetVariableType = cvar.Type;
    this.node.Config.IsTargetVariableGlobal = cvar.isGlobal;
    this.node.Config.IsTargetVariableInMemory = cvar.InMemory;

  }

  lVariableSelected(cvar:ContextVariable) {
    this.node.Config.LVariableName = cvar.Name;
    this.node.Config.IsLVariableGlobal = cvar.isGlobal;
  }

  deleteMappingRecord(record:any) {
    var i = this.node.Config.ValueMapping.indexOf(record);
    if(i != -1) {
      this.node.Config.ValueMapping.splice(i, 1);
    }
  }

  deleteXPathRecord(record:any) {
    var i = this.node.Config.XPathMapping.indexOf(record);
    if(i != -1) {
      this.node.Config.XPathMapping.splice(i, 1);
    }
  }

  variableSelected(event:any,config:any){

  }

  transformationTypeChange() {
    if (this.node.Config.TransformType == "template") {
      this.editorEl.nativeElement.style.display = 'block';
    }else {
      this.editorEl.nativeElement.style.display = 'none';
    }
  }

}
