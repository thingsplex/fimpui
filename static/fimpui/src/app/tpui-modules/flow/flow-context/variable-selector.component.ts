import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {TableContextRec} from "./model";
import {RecordEditorDialog} from "./record-editor-dialog.component";
import { MatDialog } from "@angular/material/dialog";
import {FlowContextService} from "./flow-context.service";

export class ContextVariable {

  Name : string;
  Type : string;
  Value : any;
  isGlobal : boolean;
  InMemory:boolean;
}

@Component({
  selector: 'variable-selector',
  templateUrl: './variable-selector.html',
})
export class VariableSelectorComponent implements OnInit {
    @Input() variableName : string;
    @Input() isGlobal : boolean;
    @Input() inMemory : boolean = false;
    @Input() label : string;
    @Input() flowId:string;
    @Input() mode :string; // read/write
    @Input() valueType:string = "";
    @Input() value : any;
    @Output() onSelect = new EventEmitter<ContextVariable>();
    variableType : string;
    vars:TableContextRec[];

  ngOnInit() {
    if (!this.mode)
      this.mode = "write";
    this.loadContext();
  }
  constructor(public dialog: MatDialog, private ctxService: FlowContextService) {
    this.loadContext();
  }

  loadContext() {
    this.vars = [];
    if (this.flowId) {
      this.vars = this.ctxService.getContextData(this.flowId);
    }
  }

  showContextVariableDialog() {
    console.log("Default value = "+this.value);
    let ctxRec = new TableContextRec();
    if (this.isGlobal)
      ctxRec.FlowId = "global";
    else
      ctxRec.FlowId = this.flowId;

    ctxRec.InMemory = this.inMemory;

    if (this.valueType != "")
      ctxRec.ValueType = this.valueType;

    if (this.value != undefined)
      ctxRec.Value = this.value

    let dialogRef = this.dialog.open(RecordEditorDialog,{
      width: '450px',
      data:ctxRec
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result)
      {
        this.variableName = result.Name;
        this.variableType = result.Variable.ValueType;
        this.ctxService.addNewRecord(this.flowId,this.variableName,"",this.isGlobal,this.variableType);
        this.onSelected();
        this.loadContext();
        this.ctxService.reloadFullContext(this.flowId)
      }
    });
  }

  getVariableByName(name:string,isGlobal:boolean):ContextVariable {
    for (let v of this.vars) {
      if(v.Name == name && v.IsGlobal == isGlobal) {
        let result = new ContextVariable();
        result.Name = v.Name;
        result.Type = v.ValueType;
        result.isGlobal = v.IsGlobal;
        result.InMemory = v.InMemory;
        result.Value = v.Value;
        return result;
      }
    }
    return null;

  }

  onSelected() {
      var event = new ContextVariable();
      console.log("OnSelected variable name = "+this.variableName );
      event.Name = this.variableName;
      event.Type = this.variableType
      event.isGlobal = this.isGlobal;
      event.InMemory = this.inMemory;

     if(this.variableName=="") {
       var event = new ContextVariable();
       event.Name = "";
       this.onSelect.emit(event);
     }
     if (this.variableType == undefined){
       event = this.getVariableByName(this.variableName,this.isGlobal)

     }
     if (event) {
       this.onSelect.emit(event);
     }

  }

}
