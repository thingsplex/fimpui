import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'storage-man',
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.css']
})


export class StorageComponent implements OnInit {
  files      : string[] = [];
  constructor(private fimp:FimpService,public snackBar: MatSnackBar) {

  }

  ngOnInit() {
  }

  controlApp(name:string,op:string){
    let val = {
      "op": op,
      "app": name,
      "ver": ""
    }
    console.log("Installing "+name);
    this.snackBar.open('Installing the app '+name+'....',"",{duration:3000});
    let msg  = new FimpMessage("fhbutler","cmd.app.ctrl","str_map",val,null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }




  ngOnDestroy() {
  }

}



