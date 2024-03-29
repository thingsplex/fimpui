import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowOverviewComponent } from './flow-overview/flow-overview.component';
import { ConnectorsComponent } from './connectors/connectors.component';
import { FlowContextComponent } from './flow-context/flow-context.component';
import { FlowLibComponent } from './flow-lib/flow-lib.component';
import { VariableSelectorComponent } from './flow-context/variable-selector.component';
import { JsonInputComponent } from './ui-elements/json-input.component';
import { FlowEditorComponent, FlowSourceDialog,FlowLogDialog, FlowRunDialog, ServiceLookupDialog,ContextDialog,NodeEditorDialog,HelpDialog } from './flow-editor/flow-editor.component';
import { FlowNodesComponent ,SetVariableNodeComponent,TimeTriggerNodeComponent } from './flow-nodes/flow-nodes.component';
import { LoopNodeComponent,WaitNodeComponent} from './flow-nodes/flow-nodes.component';
import { RestActionNodeComponent } from './flow-nodes/rest-action-node/node.component';
import { TriggerNodeComponent,VincTriggerNodeComponent,SceneTriggerNodeComponent } from './flow-nodes/trigger-node/node.component';
import { IfNodeComponent } from './flow-nodes/if-node/node.component';
import { TransformNodeComponent  } from './flow-nodes/transform-node/node.component';
import { ExecNodeComponent  } from './flow-nodes/exec-node/node.component';
import { LogNodeComponent  } from './flow-nodes/log-node/node.component';
import { ActionNodeComponent,VincActionNodeComponent,NotificationActionNodeComponent,TimelineActionNodeComponent } from './flow-nodes/action-node/node.component';
import { ReceiveNodeComponent } from './flow-nodes/receive-node/node.component';
import { FlowRoutingModule } from "app/tpui-modules/flow/flow-routing.module";
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { RegistryModule} from 'app/tpui-modules/registry/registry.module'
import { VariableElementComponent} from 'app/tpui-modules/flow/flow-nodes/ui-elements/ui-elements.component'
import { RecordEditorDialog} from "./flow-context/record-editor-dialog.component";
import { CdkTableModule } from '@angular/cdk/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule, MatCheckbox } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import {AnalyticsModule} from "../analytics/analytics.module";
import {MatAutocompleteModule} from '@angular/material/autocomplete';
// import {MsgDetailsDialog} from "../timeline/timeline.component";
import {FlowPropsDialog} from "./flow-editor/flow-props-editor.component";
import {MatMenuModule} from '@angular/material/menu';
import {FlowContextService } from './flow-context/flow-context.service';
import {ConnectorsService } from './connectors/connectors.service';
import {IfTimeNodeComponent} from "./flow-nodes/if-time-node/node.component";
import {RateLimitNodeComponent} from "./flow-nodes/rate-limit-node/node.component";
import {TimetoolsNodeComponent} from "./flow-nodes/timetools-node/node.component";
import {MetricsNodeComponent} from "./flow-nodes/metrics-node/node.component";
import {HttpActionNodeComponent} from "./flow-nodes/http-action-node/node.component";
import {HttpTriggerNodeComponent} from "./flow-nodes/http-trigger-node/node.component";

@NgModule({
  imports: [
    CommonModule,
    AnalyticsModule,
    FlowRoutingModule,
    ReactiveFormsModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatFormFieldModule,
    MatTableModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatOptionModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatSliderModule,
    MatCheckboxModule,
    MatDialogModule,
    MatCardModule,
    MatSidenavModule,
    MatRadioModule,
    MatExpansionModule,
    FormsModule,
    RegistryModule,
    MatTabsModule,
    CdkTableModule,

  ],
  declarations: [
     FlowOverviewComponent,
     FlowContextComponent,
     FlowLibComponent,
     FlowEditorComponent,
     FlowSourceDialog,
     FlowRunDialog,
     FlowPropsDialog,
     FlowLogDialog,
     IfTimeNodeComponent,
    RateLimitNodeComponent,
     ConnectorsComponent,
    // SignInDialog,
    // FirebaseAuthCheckComponent,
     VariableSelectorComponent,
     JsonInputComponent,
     NodeEditorDialog,
     HelpDialog,
     FlowNodesComponent,
     ActionNodeComponent,
     NotificationActionNodeComponent,
     TimelineActionNodeComponent,
     RestActionNodeComponent,
     TriggerNodeComponent,
     ReceiveNodeComponent,
     SetVariableNodeComponent,
     ServiceLookupDialog,
     ContextDialog,
     VariableElementComponent,
     TimeTriggerNodeComponent,
     LoopNodeComponent,
     IfNodeComponent,
     TransformNodeComponent,
     ExecNodeComponent,
     LogNodeComponent,
     TimetoolsNodeComponent,
     MetricsNodeComponent,
     HttpActionNodeComponent,
     HttpTriggerNodeComponent,
     WaitNodeComponent,
     VincTriggerNodeComponent,
     VincActionNodeComponent,
     RecordEditorDialog,
    SceneTriggerNodeComponent

  ],
  providers:[FlowContextService,ConnectorsService],
  exports:[JsonInputComponent],
  entryComponents: [FlowSourceDialog,FlowLogDialog,FlowRunDialog,FlowPropsDialog,ServiceLookupDialog,ContextDialog,NodeEditorDialog,HelpDialog,RecordEditorDialog] // SignInDialog
})
export class FlowModule { }
