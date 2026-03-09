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

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.util.concurrent.CompletableFuture;

@Component
public class UserManager {

  @PostConstruct
  public void initConnection() {
    try {

      // Load the client keystore (PKCS12)
      KeyStore keyStore = KeyStore.getInstance("PKCS12");
      keyStore.load(new FileInputStream("/Users/harjot.kaur/nats-poc/certs/client.p12"), "changeit".toCharArray());

      KeyManagerFactory kmf = KeyManagerFactory.getInstance("SunX509");
      kmf.init(keyStore, "changeit".toCharArray());

      // Load the truststore (JKS) containing the Root CA
      KeyStore trustStore = KeyStore.getInstance("JKS");
      trustStore.load(new FileInputStream("/Users/harjot.kaur/nats-poc/certs/truststore.jks"), "changeit".toCharArray());

      TrustManagerFactory tmf = TrustManagerFactory.getInstance("SunX509");
      tmf.init(trustStore);

      // Create SSL Context
      SSLContext sslContext = SSLContext.getInstance("TLS");
      sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);


//      System.setProperty("javax.net.ssl.trustStore", "truststore.jks");
//      System.setProperty("javax.net.ssl.trustStorePassword", "changeit");

//      // Create NATS connection with TLS
//      Options options = new Options.Builder()
//        .server("tls://nats.example.com:4222")  // Use 'tls://' for secure connection
//        .sslContext(sslContext)
//        .build();
//

      Options options = new Options.Builder()
          .server("tls://127.0.0.1:4222")
          .sslContext(sslContext)
          .errorListener(new ErrorListener() {})
          .connectionName("AuthCallbackService")
          // Set user to "auth-service" so NATS matches auth_users and bypasses auth_callout
          .userInfo("auth-service", "")
          .build();

      // Connect to NATS and start auth callout service in a separate thread
      // This prevents blocking Spring Boot startup
      new Thread(() -> {
        try {
          Connection nc = Nats.connect(options);
          System.out.println("[AUTH_CALLOUT] Connected to NATS server");
          
          Endpoint endpoint = Endpoint.builder()
              .name("AuthCallbackEndpoint")
              .subject("$SYS.REQ.USER.AUTH")
              .build();

          AuthCalloutHandler handler = new AuthCalloutHandler(nc);
          System.out.println("[AUTH_CALLOUT] Created AuthCalloutHandler");

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

          System.out.println("[AUTH_CALLOUT] Starting AuthCallout service...");
          CompletableFuture<Boolean> serviceStoppedFuture = acService.startService();
          System.out.println("[AUTH_CALLOUT] AuthCallout service started and subscribed to $SYS.REQ.USER.AUTH");
          System.out.println("[AUTH_CALLOUT] Service is ready to handle authentication requests");
          System.out.println("[AUTH_CALLOUT] Waiting for client connections...");
          
          // Wait for service to stop (this will block this thread, but not Spring Boot startup)
          serviceStoppedFuture.join();
          
        } catch (Exception e) {
          System.err.println("[AUTH_CALLOUT] Error starting auth callout service: " + e.getMessage());
          e.printStackTrace();
        }
      }, "AuthCalloutService-Thread").start();
      
      System.out.println("[AUTH_CALLOUT] AuthCallout service initialization started in background thread");
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

}
