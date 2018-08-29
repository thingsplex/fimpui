import { Component, OnInit } from '@angular/core';
import { ThingsDbService} from '../things-db.service'

@Component({
  selector: 'app-things-table',
  templateUrl: './things-table.component.html',
  styleUrls: ['./things-table.component.css']
})
export class ThingsTableComponent implements OnInit {

  constructor(public thingsDb:ThingsDbService) { }

  ngOnInit() {
  }

}
