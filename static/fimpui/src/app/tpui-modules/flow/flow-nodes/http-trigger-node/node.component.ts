import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";

@Component({
  selector: 'http-trigger-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class HttpTriggerNodeComponent implements OnInit {
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
        "PayloadFormat": "json",
        "Method": "GET",
        "IsSync":true,
        "IsWs":false,
        "MapFormParamsToVars":false,
        "OutputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":"object"}
      }
    }
  }

  outputVariableSelected(cvar:ContextVariable) {
    this.node.Config.OutputVar.Name = cvar.Name;
    this.node.Config.OutputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.OutputVar.InMemory = cvar.InMemory;
    this.node.Config.OutputVar.Type = cvar.Type;
  }

}
