import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";
import {ConnectorsService} from "../../connectors/connectors.service";

@Component({
  selector: 'websocket-client-trigger-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class WebsocketClientTriggerNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;
  connector:any;
  hostname:string;
  constructor(public dialog: MatDialog,private connSvc : ConnectorsService) {
    this.hostname = location.hostname
  }

  ngOnInit() {
    this.loadDefaultConfig();

    let connectors = this.connSvc.getConnectors()
    let fconn = connectors.filter(conn => conn.ID == "httpserver")
    if (fconn.length > 0 ) {
      this.connector = fconn[0]
      console.log("connector:")
      console.dir(this.connector)

    }
  }

  loadDefaultConfig() {
    if (this.node.Config == null) {
      this.node.Config = {
        "PayloadFormat": "json",
        "ConnectorID": "",
        "OutputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":"object"},
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
