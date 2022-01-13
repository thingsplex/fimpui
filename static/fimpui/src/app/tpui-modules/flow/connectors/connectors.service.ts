import { Injectable } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {Subscription} from "rxjs";
import {FimpMessage} from "../../../fimp/Message";

@Injectable()
export class ConnectorsService{

  public connectors : any[];
  private globalSub : Subscription;
  constructor(private fimp: FimpService) {
    console.log("Connector service constructor")
    this.configureFimpListener()
    this.loadData()
  }

  public getConnectors() {
    if (this.connectors.length == 0 )
      this.loadData()
    return this.connectors
  }

  loadData() {
    if (this.fimp.isConnected())
      this.loadAllConnectorInstances()
    else
      this.globalSub = this.fimp.getConnStateObservable().subscribe((message: any) => {
        this.loadAllConnectorInstances()
      });
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        if (fimpMsg.mtype == "evt.flow.connector_instances_report") {
          if (fimpMsg.val) {
            this.connectors = fimpMsg.val;
          }
        }
      }
    });
  }

  loadAllConnectorInstances() {
    let msg  = new FimpMessage("tpflow","cmd.flow.get_connector_instances","null",null,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

}


/*
[
    {
      "ID": "fimpmqtt",
      "Name": "fimpmqtt",
      "Plugin": "fimpmqtt",
      "State": "RUNNING",
      "Config": {
        "MqttClientIdPrefix": "thingsplex_conn_dev",
        "MqttPassword": "",
        "MqttServerURI": "tcp://localhost:1883",
        "MqttTopicGlobalPrefix": "",
        "MqttUsername": ""
      }
    },
    {
      "ID": "httpserver",
      "Name": "httpserver",
      "Plugin": "httpserver",
      "State": "RUNNING",
      "Config": {
        "BindAddress": ":8082",
        "GlobalAuth": {
          "AuthMethod": "basic",
          "AuthPassword": "molodec2",
          "AuthToken": "",
          "AuthUsername": "shurik"
        },
        "IsLocalServEnabled": true,
        "IsTunEnabled": true,
        "TunAddress": "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        "TunCloudEndpoint": "wss://tun.thingsplex.com",
        "TunEdgeToken": "XXXXXXXXXXX"
      }
    },
    {
      "ID": "thing_registry",
      "Name": "thing_registry",
      "Plugin": "thing_registry",
      "State": "RUNNING",
      "Config": null
    }
 */
