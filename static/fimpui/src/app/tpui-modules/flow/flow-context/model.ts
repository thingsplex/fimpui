import {Variable} from "../flow-editor/flow-editor.component";

export class ContextRecord{
  Name : string;
  Description : string;
  UpdatedAt : string;
  Variable : Variable;
  FlowId:string;
  InMemory:boolean;
}

export class TableContextRec {
  FlowId : string ;
  Name :string;
  Description:string;
  UpdatedAt:string;
  Value:any;
  ValueType:string;
  InMemory:boolean;
  IsGlobal:boolean;
  Type : number;
}
