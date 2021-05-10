import { Injectable } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {Subject, Subscription} from "rxjs";
import {FimpMessage, NewFimpMessageFromString} from "../../../fimp/Message";
import {TableContextRec} from "./model";
import {ContextVariable} from "./variable-selector.component";

@Injectable()
export class FlowContextService{

  private contextRecords : TableContextRec[] = [] ;
  private contextQueryRequestId:string;
  private lastRequestFlowId:string;
  // public registryState$ = this.registryStateSource.asObservable();
  private globalSub : Subscription;
  constructor(private fimp: FimpService) {
    console.log("Context service constructor")
    // this.fimp.mqtt.state.subscribe((state: any) => {
    //     console.log(" reg: FimpService onConnect . State = ",state);
    //     if (this.fimp.isConnected()) {
    //       this.configureFimpListener()
    //       this.loadAllComponents();
    //     }
    //   });
    this.configureFimpListener()
  }

  public init() {
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        if (fimpMsg.mtype == "evt.flow.ctx_records_report") {
          if (fimpMsg.val) {
            if (this.contextQueryRequestId == fimpMsg.corid) {
              this.mapContext(fimpMsg.val,this.lastRequestFlowId);
              if (this.lastRequestFlowId != "global")
                  this.requestContext("global");
            }
          }
        }
      }
    });
  }

  private mapContext(result:any,flowId:string) {
    for (let key in result){
      let loc = new TableContextRec();
      loc.FlowId = flowId;
      loc.Name = result[key].Name;
      loc.Description = result[key].Description;
      loc.UpdatedAt = result[key].UpdatedAt;
      loc.Value = result[key].Variable.Value;
      loc.ValueType = result[key].Variable.ValueType;
      loc.InMemory = result[key].InMemory;
      loc.IsGlobal = false;
      if (flowId == "global")
        loc.IsGlobal = true;
      this.contextRecords.push(loc)
    }
  }
  // addNewRecord adds new record to internal array. The data is not sent to backend.
  public addNewRecord(flowId:string,name:string,description:string,isGlobal:boolean,valType:string,InMemory:boolean){
    let loc = new TableContextRec();
    loc.FlowId = flowId;
    loc.Name = name;
    loc.Description = description;
    loc.ValueType = valType;
    loc.IsGlobal = isGlobal;
    loc.InMemory = InMemory;
    if (flowId == "global")
      loc.IsGlobal = true;
    this.contextRecords.push(loc)
  }

  public getVariableByName(name:string,isGlobal:boolean):TableContextRec {
    for (let v of this.contextRecords) {
      if (v.Name == name && v.IsGlobal == isGlobal) {
        return v;
      }
    }
    return null;
  }

  public getContextData(flowId:string):TableContextRec[] {
    if (this.contextRecords.length == 0) {
      this.requestContext(flowId);
    }
    return this.contextRecords
  }

  public reloadFullContext(flowId:string) {
     this.contextRecords.length = 0;
     this.requestContext(flowId);
  }

  private requestContext(flowId:string) {
    let val = {"flow_id":flowId};
    let msg  = new FimpMessage("tpflow","cmd.flow.ctx_get_records","str_map",val,null,null)
    msg.src = "tplex-ui";
    this.contextQueryRequestId = msg.uid;
    this.lastRequestFlowId = flowId;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }




}


