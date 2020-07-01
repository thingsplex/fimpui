import { Component, OnInit } from '@angular/core';
import { ConfigsService } from 'app/configs.service';
import { BACKEND_ROOT } from "app/globals";
import {HttpClient, HttpParams} from "@angular/common/http";

@Component({
  selector: 'app-flight-recorder',
  templateUrl: './flight-recorder.component.html',
  styleUrls: ['./flight-recorder.component.css']
})
export class FlightRecorderComponent implements OnInit {
  reportLogFiles:string[]=[];
  reportLogMaxSize:number = 0;
  hostAlias:string = localStorage.getItem("hostAlias") ;
  cmdResult:any;
  cmdLog:string[]=[];
  constructor(private http : HttpClient,private configs:ConfigsService) { }

  ngOnInit() {
    this.loadSystemConfigs()
  }
  show() {
    console.dir(this.reportLogFiles)
  }

  runCommand(cmd) {
    let params = new HttpParams();
    params.set('cmd', cmd);
    this.cmdLog.push(cmd)
    this.http.get(BACKEND_ROOT+'/fimp/api/fr/run-cmd',{params:params})
      .subscribe ((result) => {
      this.cmdResult = result;
    });
  }

  loadSystemConfigs() {
     console.log("Loading system info")

     this.http
      .get(BACKEND_ROOT+'/fimp/api/configs')
      .subscribe (result => {
         console.log(result["report_log_files"]);
         this.reportLogFiles = result["report_log_files"];
         this.reportLogMaxSize = result["report_log_size_limit"];

      });
  }
}
