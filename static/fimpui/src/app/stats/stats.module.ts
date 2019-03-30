import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { HttpModule } from '@angular/http';
import { EventLogComponent,EventsPerDeviceChart } from './event-log/event-log.component';
import { SystemMetricsComponent } from './system-metrics/system-metrics.component';
import { AngrydogComponent } from './angrydog/angrydog.component';
import { TsdbConfigComponent } from './tsdb/tsdb-config.component';

import { StatsRoutingModule } from "./stats-routing.module";
import { last } from 'rxjs/operator/last';
import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { MatTableModule,
  MatSortModule,
  MatFormFieldModule,
  MatCheckboxModule,
  MatInputModule,
  MatPaginator,
  MatChipsModule,
  MatButtonModule,
  MatRadioModule,
  MatCardModule,
  MatIconModule,
  MatSliderModule,
  MatListModule,
  MatDialogModule,
  MatTabsModule,
  MatExpansionModule} from '@angular/material';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CdkTableModule,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatTableModule,
    MatListModule,
    MatIconModule,
    MatRadioModule,
    MatSliderModule,
    MatDialogModule,
    MatExpansionModule,
    MatTabsModule,
     HttpModule,
     ChartsModule,
    StatsRoutingModule
  ],
  exports:[EventsPerDeviceChart],
  declarations: [EventLogComponent,SystemMetricsComponent,AngrydogComponent,EventsPerDeviceChart,TsdbConfigComponent]
})
export class StatsModule { }
