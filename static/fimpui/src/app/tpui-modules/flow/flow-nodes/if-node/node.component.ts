import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {BACKEND_ROOT} from "../../../../globals";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'if-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class IfNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;
  constructor(public dialog: MatDialog,private http : HttpClient) { }
  ngOnInit() {

  }

  addIfExpression(node:MetaNode){
    let rightVariable = {};
    let expr = {};
    expr["Operand"] = "eq";
    expr["LeftVariableName"] = "";
    expr["LeftVariableIsGlobal"] = false;
    rightVariable["Value"] = 100;
    rightVariable["ValueType"] = "int";
    expr["RightVariable"] = rightVariable
    expr["BooleanOperator"] = "";
    node.Config["Expression"].push(expr);
  }

  resultVariableSelected(cvar,rightVar) {
    console.log("Variable selected = "+cvar.Name);
    console.dir(cvar);
    rightVar.ValueType = cvar.Type;
    // this.node.Config.Name = cvar.Name;
    // if (this.valueSource=="value")
    //   this.node.Config.DefaultValue.ValueType = cvar.Type;
    // else
    //   this.node.Config.DefaultValue.ValueType = "";
    //
    // this.node.Config.UpdateGlobal = cvar.isGlobal;
    // // this.node.Config.IsTargetVariableInMemory = cvar.InMemory;
  }

  variableSelected(event:any,config:any){

  }
}
