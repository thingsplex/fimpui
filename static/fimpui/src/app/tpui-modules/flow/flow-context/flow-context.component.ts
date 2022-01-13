import {Component, ElementRef, ViewChild, OnInit, Input} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { MatDialog } from "@angular/material/dialog";
import {RecordEditorDialog} from "./record-editor-dialog.component";
import {TableContextRec} from "./model"
import {FimpService} from "../../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../../fimp/Message";
import {ThingsRegistryService} from "../../registry/registry.service";


@Component({
  selector: 'flow-context',
  templateUrl: './flow-context.component.html',
  styleUrls: ['./flow-context.component.css']
})
export class FlowContextComponent implements OnInit {
  @Input() isEmbedded : boolean;
  @Input() flowId : string;
  loadMode : string
  displayedColumns = ['name','description','value','valueType','inMemory','updatedAt','action'];
  dataSource: FlowContextDataSource | null;
  dialogRef : any;
  private globalSub : Subscription;
  constructor(private fimp : FimpService,public dialog: MatDialog,public regService: ThingsRegistryService) {
  }
  ngOnInit() {
    this.configureFimpListener();
    if (!this.flowId) {
      this.flowId = "global";
    }
    this.dataSource = new FlowContextDataSource(this.fimp,this.flowId,this.regService);
    // console.log("Is embedded = "+this.isEmbedded);
    if (this.isEmbedded) {
      this.loadMode = "local"
    }else {
      this.loadMode = "global"
    }
  }

  ngOnDestroy() {
   this.dataSource.disconnect();
   if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  configureFimpListener(){
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        if (!fimpMsg.val) {
          return
        }
        if (fimpMsg.mtype == "evt.flow.ctx_records_report") {
          this.dataSource.setDateRecords(fimpMsg.val);
        }else if (fimpMsg.mtype == "evt.flow.ctx_update_report" || fimpMsg.mtype =="evt.flow.ctx_delete_report") {
          this.reload();
          if(this.dialogRef)
            this.dialogRef.close();
        }
      }
    });
  }

  showRecordEditorDialog(ctxRec:TableContextRec) {
    if(this.loadMode=="local") {
      ctxRec.FlowId = this.flowId;
    }else {
      ctxRec.FlowId = "global";
    }

    this.dialogRef = this.dialog.open(RecordEditorDialog,{
      width: '450px',
      data:ctxRec
    });

    this.dialogRef.afterClosed().subscribe(result => {
      if (result)
      {
        this.dataSource.getData("global")
      }
    });
  }

  showAddNewRecordEditorDialog() {
    var ctxRec = new TableContextRec();
    if(this.loadMode=="local") {
      ctxRec.FlowId = this.flowId;
    }else {
      ctxRec.FlowId = "global";
    }
    let dialogRef = this.dialog.open(RecordEditorDialog,{
      width: '450px',
      data:ctxRec
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result)
      {
        this.dataSource.getData("global");
      }
    });
  }

  onModeChange(event:any) {
    if(this.loadMode == "global") {
      this.dataSource.getData("global");
    }else {
      this.dataSource.getData(this.flowId);
    }
  }

  reload() {
    this.dataSource.getData(this.flowId);
  }

}


export class FlowContextDataSource extends DataSource<any> {
  ctxRecordsObs = new BehaviorSubject<TableContextRec[]>([]);
  constructor(private fimp : FimpService,private flowId:string,public regService: ThingsRegistryService) {
    super();
    this.getData(flowId);
  }

  setDateRecords(data:any) {
    let result = this.mapContext(data,this.flowId)
    this.ctxRecordsObs.next(result);
  }

  getData(flowId:string) {
    let val = {"flow_id":flowId};
    let msg  = new FimpMessage("tpflow","cmd.flow.ctx_get_records","str_map",val,null,null)
    msg.src = "tplex-ui";
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  connect(): Observable<TableContextRec[]> {
    return this.ctxRecordsObs ;
  }
  disconnect() {

  }

  mapContext(result:any,flowId:string):TableContextRec[] {
    let contexts : TableContextRec[] = [];

    for (var key in result){
            let loc = new TableContextRec();
            loc.FlowId = flowId;
            loc.Name = result[key].Name;
            loc.Description = result[key].Description;
            loc.UpdatedAt = result[key].UpdatedAt;
            loc.Value = result[key].Variable.Value;
            loc.ValueType = result[key].Variable.ValueType;
            loc.InMemory = result[key].InMemory;
            loc.Type = result[key].Type;

            if (loc.Type == 1) {
              try {
                let ss = loc.Name.split("@")
                console.log("Searching service by "+ss[1])

                let svc =  this.regService.getServiceByAddress("/"+ss[1])
                console.dir(svc);
                let tloc = this.regService.getLocationById(svc[0].location_id)
                loc.Description = svc[0].alias + " at "+tloc[0].alias;
              }catch (e) {
                console.dir(e);
              }

            }

            contexts.push(loc)
            console.log("Value = "+loc.Value)
     }
     return contexts;
  }
}
