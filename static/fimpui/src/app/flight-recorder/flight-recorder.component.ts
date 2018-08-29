import { Component, OnInit } from '@angular/core';
import { Http, Response,URLSearchParams }  from '@angular/http';
import { ConfigsService } from 'app/configs.service';
import { BACKEND_ROOT } from "app/globals";

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
  constructor(private http : Http,private configs:ConfigsService) { }

  ngOnInit() {
    this.loadSystemConfigs()
  }
  show() {
    console.dir(this.reportLogFiles)
  }
  uploadLogSnapshot(hostAlias) {
    localStorage.setItem("hostAlias",hostAlias)
    let params = new URLSearchParams();
    params.set('hostAlias', hostAlias);
     this.http
      .get(BACKEND_ROOT+'/fimp/fr/upload-log-snapshot',{search:params})
      .map(function(res: Response){
        let body = res.json();
        //console.log(body.Version);
        return body;
      }).subscribe ((result) => {
         this.reportLogFiles = result;

      });
  }

  uploadFileToCloud(hostAlias,filePath) {
    localStorage.setItem("hostAlias",hostAlias)
    localStorage.setItem("fileName",filePath)
    let params = new URLSearchParams();
    params.set('hostAlias', hostAlias);
    params.set('fileName', filePath);
    this.http
      .get(BACKEND_ROOT+'/fimp/api/fr/upload-file',{search:params})
      .map(function(res: Response){
        let body = res.json();
        //console.log(body.Version);
        return body;
      }).subscribe ((result) => {
      this.reportLogFiles = result;

    });
  }

  runCommand(cmd) {
    let params = new URLSearchParams();
    params.set('cmd', cmd);
    this.cmdLog.push(cmd)
    this.http
      .get(BACKEND_ROOT+'/fimp/api/fr/run-cmd',{search:params})
      .map(function(res: Response){
        let body = res.json();
        //console.log(body.Version);
        return body;
      }).subscribe ((result) => {
      this.cmdResult = result;

    });
  }

  loadSystemConfigs() {
     console.log("Loading system info")

     this.http
      .get(BACKEND_ROOT+'/fimp/api/configs')
      .map(function(res: Response){
        let body = res.json();
        //console.log(body.Version);
        return body;
      }).subscribe ((result) => {
         console.log(result.report_log_files);
         this.reportLogFiles = result.report_log_files;
         this.reportLogMaxSize = result.report_log_size_limit;

      });
  }
}
