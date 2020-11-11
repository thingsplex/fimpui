import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
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

  resultVariableSelected(cvar,expr) {
    console.log("Variable selected = "+cvar.Name);
    console.dir(cvar);
    expr.RightVariable.ValueType = cvar.Type;
    expr.LeftVariableName = cvar.Name;
    expr.LeftVariableIsGlobal = cvar.isGlobal;
  }

  variableSelected(event:any,config:any){

  }
}
