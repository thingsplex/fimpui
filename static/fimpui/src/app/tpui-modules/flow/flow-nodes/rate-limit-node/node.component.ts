import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, Input, OnInit} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";

@Component({
  selector: 'rate-limit-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class RateLimitNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  localVars:any;
  globalVars:any;

  constructor(public dialog: MatDialog) {
  }

  ngOnInit() {
    this.loadDefaultConfig();

  }

  loadDefaultConfig() {
    if (this.node.Config == null) {
      this.node.Config = {
        "TimeInterval": 1,
        "Limit": 1,
        "Action": "skip",
      }
    }
  }


}
