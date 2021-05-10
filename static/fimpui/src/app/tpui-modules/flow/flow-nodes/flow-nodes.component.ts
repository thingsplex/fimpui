import { Component, OnInit ,Input } from '@angular/core';
import { MetaNode, ServiceLookupDialog } from "../flow-editor/flow-editor.component";
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-flow-nodes',
  templateUrl: './flow-nodes.component.html',
  styleUrls: ['./flow-nodes.component.css']
})
export class FlowNodesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
}

@Component({
  selector: 'set-variable-node',
  templateUrl: './set-variable-node.html',
  styleUrls: ['./flow-nodes.component.css']
})
export class SetVariableNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  public valueSource:string;
  constructor(public dialog: MatDialog) { }
  ngOnInit() {
    if (this.node.Config.DefaultValue.ValueType == "") {
      this.valueSource = "input";
    }else {
      this.valueSource = "value";
    }
  }

  valueSourceSelected() {
    console.log("Input source changed to = "+this.valueSource);
    if (this.valueSource=="value") {
      this.node.Config.Name = "";
      this.node.Config.DefaultValue.ValueType = "string";
    }else {
      this.node.Config.DefaultValue.ValueType = "";
    }
  }

  resultVariableSelected(cvar) {
    console.log("Variable selected = "+cvar.Name);
    this.node.Config.Name = cvar.Name;
    if (this.valueSource=="value")
       this.node.Config.DefaultValue.ValueType = cvar.Type;
    else
       this.node.Config.DefaultValue.ValueType = "";

    this.node.Config.UpdateGlobal = cvar.isGlobal;
    this.node.Config.IsVariableInMemory = cvar.InMemory;
  }
}

@Component({
  selector: 'time-trigger-node',
  templateUrl: './time-trigger-node.html',
  styleUrls: ['./flow-nodes.component.css']
})
export class TimeTriggerNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  constructor(public dialog: MatDialog) { }
  ngOnInit() {
  }
}

@Component({
  selector: 'loop-node',
  templateUrl: './loop-node.html',
  styleUrls: ['./flow-nodes.component.css']
})
export class LoopNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  constructor(public dialog: MatDialog) { }
  ngOnInit() {

  }
}

@Component({
  selector: 'wait-node',
  templateUrl: './wait-node.html',
  styleUrls: ['./flow-nodes.component.css']
})
export class WaitNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  constructor(public dialog: MatDialog) { }
  ngOnInit() {
  }
}

