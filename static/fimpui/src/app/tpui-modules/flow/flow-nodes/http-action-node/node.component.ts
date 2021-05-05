import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";

@Component({
  selector: 'http-action-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class HttpActionNodeComponent implements OnInit {
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
        "ResponsePayloadFormat": "json",
        "InputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":""},
        "IsWs":false,
        "IsPublishOnly":false,
      }
    }
  }

  inputVariableSelected(cvar:ContextVariable) {
    this.node.Config.InputVar.Name = cvar.Name;
    this.node.Config.InputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.InputVar.InMemory = cvar.InMemory;
    this.node.Config.InputVar.Type = cvar.Type;
  }

}
