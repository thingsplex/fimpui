import {Component, OnInit, ViewChild} from '@angular/core';
import {FlowLogDialog, FlowSourceDialog} from "../flow-editor/flow-editor.component";
import { MatDialog } from "@angular/material/dialog";
import {FimpService} from "../../../fimp/fimp.service";
import {Subscription} from "rxjs";
import {FimpMessage, NewFimpMessageFromString} from "../../../fimp/Message";
import {SimplePieChartComponent} from "../../analytics/charts/simple-pie-chart.component";
import {ConnectorsService} from "./connectors.service";

@Component({
  selector: 'flow-connectors',
  templateUrl: './connectors.component.html',
  styleUrls: ['./connectors.component.css']
})
export class ConnectorsComponent implements OnInit {

  public connectors : any[];

  private connSub : Subscription;
  private globalSub : Subscription;

  constructor(private fimp : FimpService,private connectorsSvc : ConnectorsService) {
  }

  ngOnInit() {
    // this.configureFimpListener();
    this.loadData();
  }

  loadData() {
    if (this.fimp.isConnected())
      this.connectors = this.connectorsSvc.getConnectors()
    else
      this.connSub = this.fimp.getConnStateObservable().subscribe((message: any) => {
        // this.loadAllConnectorInstances();
        this.connectors = this.connectorsSvc.getConnectors()
      });
  }

  // configureFimpListener() {
  //   this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
  //     if (fimpMsg.service == "tpflow" ){
  //       if (fimpMsg.mtype == "evt.flow.connector_instances_report") {
  //         if (fimpMsg.val) {
  //             this.connectors = fimpMsg.val;
  //         }
  //       }
  //     }
  //   });
  // }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
    if(this.connSub)
      this.connSub.unsubscribe();
  }

  updateHttConnectorConfig(connConfig) {
    let msg  = new FimpMessage("tpflow","cmd.flow.update_connector_instance_config","object",connConfig,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
    this.connectors = this.connectorsSvc.getConnectors();
  }

  // loadAllConnectorInstances() {
  //   let msg  = new FimpMessage("tpflow","cmd.flow.get_connector_instances","null",null,null,null)
  //   msg.src = "tplex-ui"
  //   msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
  //   this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  // }

}
