import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";

@Component({
  selector: 'if-time-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class IfTimeNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;

  constructor(public dialog: MatDialog) {

  }
  ngOnInit() {
    this.loadDefaultConfig();
  }
  addIfExpression(node:MetaNode){
    let expr = {};
    expr["Weekday"] = "1";
    expr["From"] = "00:00";
    expr["To"] = "23:59";
    expr["Action"] = "a";
    node.Config["Expression"].push(expr);
  }

  variableSelected(event:any,config:any){

  }

  loadDefaultConfig() {
    if (this.node.Config==null) {
      this.node.Config = {"Expression":[{
        "Weekday":"1", // cmd , sh-cmd , python , script
        "From":"00:00",
        "To": "23:59",
        "Action": "a"
      }]}
    }
  }
}
