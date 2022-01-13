import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";

@Component({
  selector: 'metrics-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class MetricsNodeComponent implements OnInit {
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

  loadDefaultConfig() {
    if (this.node.Config == null) {
      this.node.Config = {
        "Operation": "inc",
        "Step": 1,
        "InputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":"float"},
        "OutputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":"float"},
        "MaxValue":100,
        "MinValue":0,
        "ResetValue":0,
        "LimitAction":"reset"
      }
    }
  }

  inputVariableSelected(cvar:ContextVariable) {
    this.node.Config.InputVar.Name = cvar.Name;
    this.node.Config.InputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.InputVar.InMemory = cvar.InMemory;
    this.node.Config.InputVar.Type = cvar.Type;
  }

  outputVariableSelected(cvar:ContextVariable) {
    this.node.Config.OutputVar.Name = cvar.Name;
    this.node.Config.OutputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.OutputVar.InMemory = cvar.InMemory;
    this.node.Config.OutputVar.Type = cvar.Type;
  }

}
