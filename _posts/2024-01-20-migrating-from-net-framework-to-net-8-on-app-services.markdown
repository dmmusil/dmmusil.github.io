---
layout: post_link_source
title:  "Migrating from .NET Framework to .NET 8 on App Service"
date:   2024-01-20 12:36:31 -0400
---

### Motivation

There is a wealth of great info out there already on migrating from .NET Framework to .NET 8. I'm following [Jimmy Bogard's series](https://www.jimmybogard.com/tales-from-the-net-migration-trenches/) myself and it is a concise description of how to make the migration happen.

However, I'm not doing much of the actual migration work down at the application level. We have a team of folks dedicated to completing some setup parts of the migration, like updating libraries to versions that support .NET Standard and moving code into .NET Standard libraries.

So why add another blog post to the proverbial pile for this topic? I am focused on setting up the infrastructure for this migration. We use Azure App Service to host our .NET Framework web apps so we need to find a way to follow the recommended migration path on App Service. My hope is that this post will be the one that I wish someone had written for me to find.

### Background - what didn't work

Microsoft recommends using an ASP.NET Core app that's running YARP to act as a proxy and ingress to "the app" as it's being upgraded to .NET 8. I really wanted to find a way to not have to run two App Services if possible. The proxy idea means I have to add a new, unproven app in front of the old app and add at least one extra network hop for each request that isn't already migrated. That felt like unnecessary risk.

#### IIS virtual applications

We've been running our main application in App Services for just over a year and it's been rock solid, so I wanted to see if there was any way for me to keep the .NET Framework app as the entry point and have the new app handle only what it needs to.

IIS supports hosting child applications at sub paths of the parent application. My hope was to be able to host a .NET 8 app at `/vnext` and move endpoints over to the new app. This would require updating the paths used by the front-end code, or maybe a rewrite rule could transparently handle things for me.

I first set out to make this work locally. We use IIS and IIS Express to do local development, and IIS is used in App Services, so this was the natural place to start. Getting it to work required one trick: the app pool that hosts the .NET Framework parent app cannot also host the ASP.NET Core child app so a second app pool was required for the ASP.NET Core app. The app pool for the ASP.NET Core app needs to be set up for unmanaged code and the ASP.NET Core app should use `OutOfProcess` hosting. 

> Note: `InProcess` isn't an option. From [docs](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/aspnet-core-module?view=aspnetcore-2.2#in-process-hosting-model-1): "Sharing an app pool among apps isn't supported. Use one app pool per app."

This worked really nicely locally. Unfortunately there is no support that I could find for running two app pools inside the same App Service. I found this [nifty feature](https://github.com/projectkudu/kudu/wiki/Xdt-transform-samples) that allows you to modify the `applicationHost.config` of your App Service to your heart's content. But when you try to add a second app pool and run the child app in that new app pool, the platform overwrites your change to force the ASP.NET Core app to run in the same app pool as the parent app. There's no official docs that say this can't be done, but I did find various hints from the community that suggest it's impossible, like this one asking about [deploying two apps into the same App Service](https://learn.microsoft.com/en-us/answers/questions/1375456/deploying-two-apis-into-single-app-service)

I stopped investing time into this solution at this point.

#### Let Front Door handle it

We use Azure Front Door for various networking things. One of the features it has is path based routing. We _could_ let Front Door make all the routing decisions and point our requests at the new app as the endpoints are migrated. The issue with this is how it complicates deployments. Front Door configuration is deployed to edge nodes around the world so updates are far from instant. This means we have to consider what happens during the time that the configuration is propagating. This is a last resort option.

### Resigning to the original suggested solution

Ultimately I am going with what has been suggested over and over: an app running ASP.NET Core 8 + YARP that proxies to the original .NET Framework app. If an endpoint has been migrated the new app handles the request.

#### One final hurdle

Sounds like we've got it all figured out right? Well there's one small problem. We are a multi-tenant application that needs to be able to make logical decisions based on information contained in the request URL. This is simple when the app is hosted in a single App Service. Bind the custom domain to the App Service and requests show up with the expected URLs. Once a second App Service enters the mix, the same custom domain can not bind to both App Services. This is a platform limitation with various hacky workarounds, but none of the workarounds apply for this specific two-app scenario.

##### The workarounds 

For completeness, there's two workarounds:
1. Multi region deployments: 

App Services deployed into different regions can have the same custom domain bound to them. This doesn't work for us because the latency across regions to other backend resources is an issue.

2. Deploy into multiple "webspaces"

 Compute resouces within the same resource group are deployed together into something called a "webspace". I don't really have any other details on what that means, but I suspect it's related to some kind of network partitioning inside the Azure data centers. If you deploy two App Service Plans into different resource groups, they _may_ end up in different webspaces. Being in different webspaces allows an App Service to be added to each App Service Plan with the same custom domain binding. You may also get an error about trying to bind a duplicate custom domain. We got around this by deleting and recreating the second App Service Plan until it worked. We wanted a second App Service when we were migrating to App Services so that we could make no-downtime infra changes. App Service swears up and down that you can use slots to avoid downtime, but it's just not true. There are some changes that can cause downtime on the production slot.
 
 Be warned though that this raised some eyebrows when we mentioned it to Azure engineers. It's a stable solution, but it only works in the larger data centers. In Germany North, we couldn't get deployments into multiple webspaces to work.

#### The solution

Front Door (or Application Gateway) adds headers as it proxies requests. Front Door adds `X-Forwarded-Host` and Application Gateway adds `X-Original-Host`. These headers contain the domain name that was on the original request. Once a second App Service is added to the backend pool, the network service in use must override the host name on the request to use the platform FQDN of the backend App Service. If the host name isn't overridden, the backend pool will never become healthy because App Services will not respond to requests that don't match a domain binding.

So an incoming request to `myapp.com/some/path` is transformed into `myapp-app-service.azurewebsites.net/some/path` with a `X-*-Host` header containing `myapp.com`.

Our app makes heavy use of `HttpContext.Current.Request.Url`. Finding each place where it's used, analyzing how it's used, and updating those locations to use the value from the header was a possibility, but it felt brittle. Future changes that needed URL info would be at risk of doing the wrong thing. After some conversation we settled on looking for a solution in the IIS Rewrite Module.

###### IIS Rewrite

We've been using a managed platfrom for so long that IIS configuration is a forgotten skill. It's also essentially development via XML. It feels antiquated. The docs have screenshots from Windows Vista or even older, maybe XP.

I searched and searched with terms like "replace url host iis rewrite rule". Lots of hits on redirects and reverse proxy setups but nothing that directly applied to what I wanted to do. A day of hunting led to the following solution that sounds so simple and obvious in hindsight:

> Rewrite the `Host` header at the App Service to the value in the `X-*-Host` header. 

To do this, we need to learn about [IIS server variables](https://learn.microsoft.com/en-us/iis/web-dev-reference/server-variables).

The very first entry in the table at this link shows how to access the headers of incoming requests. `HTTP_X_FORWARDED_HOST` lets me inspect the value of one of the headers I care about. 

Awesome! Now how do I update the URL of the incoming request? That's controlled by the `Host` header. To change header values you have to modify the IIS configuration to allow manipulation of the `HTTP_HOST` server variable. Any server variable can be read freely, but to modify one, you must explicitly permit it through a config change. Locally that means adding some XML to the `applicationHost.config` in `System32` or using the IIS UI. 

How do I do that for an App Service? It's the [feature](https://github.com/projectkudu/kudu/wiki/Xdt-transform-samples) I found in my earlier investigation that allows editing `applicationHost.config` via xdt.

I had no idea how to write the XML I needed and the ancient IIS docs only show how to do this config via the UI. Luckily when you make the changes in the UI, they are persisted in your app's `web.config` and in your machine's `applicationHost.config` located in `C:\Windows\System32\inetsrv\config`.

When the IIS config is done, the `web.config` contains something like this:

```xml
<rule name="Change host">
  <match url="/*" />
  <serverVariables>
    <set name="HTTP_HOST" value="{HTTP_X_FORWARDED_HOST}" />
  </serverVariables>
  <action type="None" />
</rule>
```

For every request, set the `Host` header to the value of `X-Forwarded-Host`. You can also add a condition to require that the `X-Forwarded-Host` value not be empty.

```xml
<rule name="Change host">
  <match url="/*" />
  <serverVariables>
    <set name="HTTP_HOST" value="{HTTP_X_FORWARDED_HOST}" />
  </serverVariables>
  <conditions>
    <add input="{HTTP_X_FORWARDED_HOST}" type="Pattern" pattern="^.+$" />
  </conditions>
  <action type="None" />
</rule>
```

Now the rewrite only executes when it has a valid value to use as a replacement.

To update the `applicationHost.config` on the App Service, you will need the following xdt:

```xml
<?xml version="1.0"?>
<configuration xmlns:xdt="http://schemas.microsoft.com/XML-Document-Transform">
  <location path="%XDT_SITENAME%" xdt:Locator="Match(path)">
    <system.webServer xdt:Transform="InsertIfMissing">
      <rewrite xdt:Transform="InsertIfMissing">
        <allowedServerVariables xdt:Transform="InsertIfMissing">
		  <add name="HTTP_HOST" xdt:Transform="InsertIfMissing" xdt:Locator="Match(name)"/>
		</allowedServerVariables>
      </modules>
    </system.webServer>
  </location>
</configuration>
```

Deploying this file can be done by making API calls to the VFS located in the SCM site for an App Service. The file needs to end up in the root of the directory named `D:\home\site`. When the site restarts, the transform is applied. With the updated configuration, the rewrite rules can alter the `Host` header.

[Kudu VFS API docs](https://github.com/projectkudu/kudu/wiki/rest-api#vfs)

