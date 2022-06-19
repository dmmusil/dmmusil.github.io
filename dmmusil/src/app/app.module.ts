import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AboutComponent } from './about/about.component';
import { MainComponent } from './main/main.component';
import { AngularOnGithubPagesComponent } from './posts/angular-on-github-pages/angular-on-github-pages.component';
import { AzureSqlServerlessComponent } from './posts/azure-sql-serverless/azure-sql-serverless.component';

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    MainComponent,
    AngularOnGithubPagesComponent,
    AzureSqlServerlessComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
