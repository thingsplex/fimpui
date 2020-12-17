import {Component, OnInit, ViewChild} from '@angular/core';
import {FlowLogDialog, FlowSourceDialog} from "../flow-editor/flow-editor.component";
import { MatDialog } from "@angular/material/dialog";
import {FimpService} from "../../../fimp/fimp.service";
import {Subscription} from "rxjs";
import {FimpMessage, NewFimpMessageFromString} from "../../../fimp/Message";
import {SimplePieChartComponent} from "../../analytics/charts/simple-pie-chart.component";

@Component({
  selector: 'flow-overview',
  templateUrl: './flow-overview.component.html',
  styleUrls: ['./flow-overview.component.css']
})
export class FlowOverviewComponent implements OnInit {
  @ViewChild('flowStateChart') flowStateChartRef: SimplePieChartComponent;
  @ViewChild('flowExecutionStatsChart') flowExecutionStatsRef: SimplePieChartComponent;

  flows : any[];
  groups : string[];
  filter : string;

  public totalFlows : number = 0;
  public totalFlowNodes : number = 0;
  public totalFlowTriggers : number;
  public totalFlowsExecuted :number;
  public totalFlowsFailed :number;
  public totalActiveFlows :number;

  public flowExecutionStats : number[] = [];
  public flowExecutionLabels : string[] = [];

  public flowStateStats : number[] = [];
  public flowStateLabels : string[] = [];

  private connSub : Subscription;
  private globalSub : Subscription;

  constructor(public dialog: MatDialog,private fimp : FimpService) {
    this.filter = "RUNNING"
  }

  ngOnInit() {
    this.configureFimpListener();
    this.loadData();
  }

  loadData() {
    if (this.fimp.isConnected())
      this.loadListOfFlows();
    else
      this.connSub = this.fimp.mqtt.onConnect.subscribe((message: any) => {
        this.loadListOfFlows();
      });
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        console.log("Confirmation report = ",fimpMsg.mtype)
        if (fimpMsg.mtype == "evt.flow.list_report") {
          if (fimpMsg.val) {
            this.flows = fimpMsg.val;
            var groupsSet = new Set();
            for (let gr of this.flows) {
              groupsSet.add(gr.Group);
            }
            this.flows.forEach((value, index,ar) => {
              groupsSet.add(value.Group);
              if(ar[index].Stats.LastExecutionTime>10000000) {
                ar[index].Stats.LastExecutionTime = 0;
              }
            })

            this.groups = [];
            groupsSet.forEach((value:string) => {
              this.groups.push(value);
            })
            this.calculateStats();
          }
        }else if(fimpMsg.mtype == "evt.flow.delete_report" || fimpMsg.mtype == "evt.flow.ctr_report" ||
                 fimpMsg.mtype == "evt.flow.import_report") {

          this.loadListOfFlows();
        }
      }
    });
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
    if(this.connSub)
      this.connSub.unsubscribe();
  }

  loadListOfFlows() {
    let msg  = new FimpMessage("tpflow","cmd.flow.get_list","null",null,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  deleteFlow(id:string) {
    let msg  = new FimpMessage("tpflow","cmd.flow.delete","string",id,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  sendFlowControlCommand(flowId:string,command:string) {
    let val = {"op":command,"id":flowId}
    let msg  = new FimpMessage("tpflow","cmd.flow.ctrl","str_map",val,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  openFlowImportWindow() {
    let dialogRef = this.dialog.open(FlowSourceDialog,{
      // height: '95%',
      width: '95%',
      data:{}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result)
         this.importFlow(result)
         setTimeout(result => {
           this.loadListOfFlows()
         },1000)

    });
  }

  importFlow(flow){
    let msg  = new FimpMessage("tpflow","cmd.flow.import","object",flow,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  showLog() {
    let dialogRef = this.dialog.open(FlowLogDialog,{
      // height: '95%',
      width: '95%',
      data:{flowId:"",mode:"all_flows"}
    });
    dialogRef.afterClosed().subscribe(result => {

    });
  }

  calculateStats() {
    this.totalFlows = this.flows.length ;
    let flowsByState : any = {};
    let successCount = 0;
    let failedCount = 0;
    this.flowExecutionLabels.length= 0;
    this.flowExecutionStats.length= 0;
    this.flowStateLabels.length= 0;
    this.flowStateStats.length= 0;

    for(let n of this.flows) {
      this.totalFlowNodes += n.Stats.NumberOfNodes
      successCount += n.TriggerCounter-n.ErrorCounter;
      failedCount += n.ErrorCounter;
      if (flowsByState[n.State]==undefined)
        flowsByState[n.State] = 1 ;
      else
        flowsByState[n.State]++;  // power source
    }
    this.flowExecutionLabels.push("success: "+successCount);
    this.flowExecutionLabels.push("failed: "+failedCount);
    this.flowExecutionStats.push(successCount);
    this.flowExecutionStats.push(failedCount);

    for (let t in flowsByState) {
      this.flowStateLabels.push(t+": "+flowsByState[t]);
      this.flowStateStats.push(flowsByState[t]);
    }

    // console.dir(this.flowExecutionLabels);
    // console.dir(this.flowExecutionStats);
    //
    // console.dir(this.flowStateLabels);
    // console.dir(this.flowStateStats);

    this.flowStateChartRef.update();
    this.flowExecutionStatsRef.update();
  }
  goToLink(url: string){
    window.open(url, "_blank");
  }


}
