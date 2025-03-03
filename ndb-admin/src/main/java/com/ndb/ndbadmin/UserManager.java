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
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

@Component
public class UserManager {

  @PostConstruct
  public void initConnection() {
    try {

      // Load the client keystore (PKCS12)
      KeyStore keyStore = KeyStore.getInstance("PKCS12");
      keyStore.load(new FileInputStream("/Users/shuryakumar.ns/Downloads/spire/client-keystore.p12"), "changeit".toCharArray());

      KeyManagerFactory kmf = KeyManagerFactory.getInstance("SunX509");
      kmf.init(keyStore, "changeit".toCharArray());

      // Load the truststore (JKS) containing the Root CA
      KeyStore trustStore = KeyStore.getInstance("JKS");
      trustStore.load(new FileInputStream("/Users/shuryakumar.ns/Downloads/spire/truststore.jks"), "changeit".toCharArray());

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
