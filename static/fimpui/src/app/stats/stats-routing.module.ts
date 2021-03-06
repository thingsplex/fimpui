import { RouterModule, Routes } from '@angular/router';
import { NgModule } from "@angular/core";
import {AngrydogComponent} from './angrydog/angrydog.component';
import { ThingViewComponent } from "app/thing-view/thing-view.component";


@NgModule({
  imports: [RouterModule.forChild([
    { path: 'stats/angrydog', component: AngrydogComponent },
    { path: 'fimp/thing-view-addr/:id', component: ThingViewComponent },
  ])],
  exports: [RouterModule]
})
export class StatsRoutingModule {}
