package com.ndb.ndbadmin;

import io.nats.client.Connection;
import io.nats.client.ErrorListener;
import io.nats.client.Nats;
import io.nats.client.Options;
import io.nats.service.Endpoint;
import io.nats.service.Service;
import io.nats.service.ServiceBuilder;
import io.nats.service.ServiceEndpoint;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class UserManager {

  @PostConstruct
  public void initConnection() {
    try {
      Options options = new Options.Builder()
          .server("nats://127.0.0.1:4222")
          .errorListener(new ErrorListener() {})
          .userInfo("ndb", "Nutanix.1")
          .build();

      try (Connection nc = Nats.connect(options)) {
        Endpoint endpoint = Endpoint.builder()
            .name("AuthCallbackEndpoint")
            .subject("$SYS.REQ.USER.AUTH")
            .build();

        AuthCalloutHandler handler = new AuthCalloutHandler(nc);

        ServiceEndpoint serviceEndpoint = ServiceEndpoint.builder()
            .endpoint(endpoint)
            .handler(handler)
            .build();

        Service acService = new ServiceBuilder()
            .connection(nc)
            .name("AuthCallbackService")
            .version("0.0.1")
            .addServiceEndpoint(serviceEndpoint)
            .build();

        CompletableFuture<Boolean> serviceStoppedFuture = acService.startService();
        serviceStoppedFuture.join();


      } catch (Exception e) {
        e.printStackTrace();
      }
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

}
