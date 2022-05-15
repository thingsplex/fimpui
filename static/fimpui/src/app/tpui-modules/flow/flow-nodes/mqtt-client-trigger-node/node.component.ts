import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";
import {ConnectorsService} from "../../connectors/connectors.service";

@Component({
  selector: 'mqtt-client-trigger-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class MqttClientTriggerNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;
  connector:any;
  hostname:string;
  localUrl:string;
  globalUrl:string;
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
    this.onAliasChange()
  }

  loadDefaultConfig() {
    if (this.node.Config == null) {
      this.node.Config = {
        "PayloadFormat": "json",
        "Method": "GET",
        "IsSync":true,
        "IsWs":false,
        "MapFormParamsToVars":false,
        "Alias":"",
        "OutputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":"object"},
        "AuthConfig":{"AuthMethod":"none","AuthToken":"","AuthUsername":"","AuthPassword":"","AuthCustomParamName":""}
      }
    }
  }

  outputVariableSelected(cvar:ContextVariable) {
    this.node.Config.OutputVar.Name = cvar.Name;
    this.node.Config.OutputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.OutputVar.InMemory = cvar.InMemory;
    this.node.Config.OutputVar.Type = cvar.Type;
  }

  onAliasChange() {
    console.log("Alias has changed")
    let alias = this.flowId;
    if (this.node.Config.Alias) {
      alias = this.node.Config.Alias;
    }else if (!this.node.Config.IsWs) {
      alias = alias+"_"+this.node.Id;
    }
    let resourceType = "rest"
    if (this.node.Config.IsWs)
      resourceType = "ws"


    this.localUrl = "http://"+this.hostname+this.connector.Config.BindAddress +"/flow/"+alias+"/"+resourceType;
    this.globalUrl = "https://tun.thingsplex.com/cloud/"+this.connector.Config.TunAddress+"/flow/"+alias+"/"+resourceType+"?tptun_token="+this.connector.Config.TunEdgeToken;
  }

}
