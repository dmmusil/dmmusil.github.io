---
layout: post
title:  "Cost control and cold start with Azure SQL Serverless"
date:   2022-06-19 08:36:31 -0500
---

### What is Azure SQL serverless?

Azure SQL serverless tier can scale between the requested vCore value all the way down to 0.5 vCores. It can also pause after an hour of inactivity. When paused, you only pay for the data storage.

### Actual costs

There's a fairly opaque and innocuous looking cost value on the pricing page: $0.0001740/vCore-second. That looks like it's basically free. However they also provide the hourly cost and it's not free. It's 62 cents per hour per vCore. This is actually very expensive for something billed as "serverless".

The key to making it cheap is to allow it to pause when it's not in use. In order for this to happen, there must be no activity for 60 minutes. However, when it's paused you can't use it. No connections, no queries, no health checks from your app. Nothing. Now that it's stopped and essentially free, the challenge is that it takes 30+ seconds to start up again.

### Dealing with cold starts

The first connection attempt against a paused database essentially triggers Azure to grab the database file from a storage blob and mount it into a SQL Server container. This takes upwards of a minute so your app must tolerate this.

If using Entity Framework you should already be using [EnableRetryOnFailure](https://docs.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency). This will retry 6 times by default when a transient failure is detected. However this isn't enough to deal with a paused serverless database because the execution strategy created by `EnableRetryOnFailure` doesn't see connection failures as transient. You also need to add a large connection timeout to the connection string. The default timeout on the connection strings you get from the portal is 30 seconds. In my testing, I saw the database take ~70 seconds to wake up and respond to a query so a connection timeout of 120 seconds was added to the connection string, `Connection Timeout=120;`.

### 2023 update

As we started to see more traffic on the services using serverless databases, we realized that serverless wasn't the right hosting model from a cost and usage perspective. Every request to an API wakes the database and then the database stays awake for an hour after the latest request. This means there's lots of idle time being billed at relatively high cost. For a service seeing less than 1 request per second, this cost is unbearable.

Instead we switched from the vCore billing model to the DTU model, using 10-20 DTU databases for smaller services. DTU databases are always on and can be scaled so small that their cost is truly negligible. A 20 DTU database, which is the smallest really usable size, is 4 cents per hour.

Serverless worked fine in the POC phase when we were getting a few hundred requests at once and then nothing for hours. The DTU hosting model is much more suited for running small, low-traffic services, even in production.
